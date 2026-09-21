-- CConnect — graphe de carrière : année d'études, relations datées, compétences.
--
-- Point de départ : `experiences` est déjà la relation Personne → Entreprise.
-- Un membre peut y avoir plusieurs lignes pour la même entreprise (PFA 2024,
-- PFE 2025, emploi 2026), chacune avec son type, son poste, son domaine et sa
-- ville. Il n'y a donc pas de seconde table de relations à créer : il manquait
-- seulement ce qui distingue un emploi actuel d'un emploi passé.
--
-- Règle transversale de cette migration : **rien n'est déduit ni rempli**.
-- Toutes les colonnes ajoutées sont nullables, et `null` veut dire « inconnu ».
-- Une expérience existante de type `job` sans `is_current` n'est ni actuelle
-- ni passée : l'interface l'affiche comme « statut non renseigné ».

-- ------------------------------------------------ année d'études --
--
-- L'objectif d'un étudiant en dépend : 3e et 4e année → PFA, dernière année →
-- PFE. Un alumni n'a pas d'année d'études. L'objectif lui-même n'est pas
-- stocké : il se dérive (`objectiveFor` dans src/lib/advisor.ts), et une valeur
-- stockée finirait par contredire l'année dont elle est tirée.

create type study_year as enum ('third', 'fourth', 'final');

alter table profiles
  add column if not exists study_year study_year,
  add column if not exists target_domain domain_area,
  add column if not exists target_role text
    check (target_role is null or char_length(target_role) between 2 and 120),
  add column if not exists open_to_mentoring boolean;

-- `not valid` : aucune ligne existante n'a d'année, mais la règle ne doit pas
-- pouvoir faire échouer la migration sur une base où quelqu'un l'aurait posée.
alter table profiles drop constraint if exists profiles_study_year_student_only;
alter table profiles add constraint profiles_study_year_student_only
  check (study_year is null or status = 'student') not valid;

comment on column profiles.study_year is
  'Année d''études d''un étudiant (third, fourth, final). Null pour un alumni ou si non renseignée. Détermine PFA / PFE.';
comment on column profiles.open_to_mentoring is
  'Consentement explicite à être sollicité pour du mentorat. Null = non renseigné, jamais supposé.';

-- ------------------------------------------ relations datées --

alter table experiences
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists is_current boolean;

alter table experiences drop constraint if exists experiences_dates_ordered;
alter table experiences add constraint experiences_dates_ordered
  check (start_date is null or end_date is null or end_date >= start_date);

-- Un poste actuel n'a pas de date de fin.
alter table experiences drop constraint if exists experiences_current_has_no_end;
alter table experiences add constraint experiences_current_has_no_end
  check (is_current is not true or end_date is null);

-- `year` reste la colonne que lisent la carte, les filtres et `network_stats`.
-- Quand un début est connu, elle doit lui correspondre — sinon la carte et la
-- frise raconteraient deux histoires.
alter table experiences drop constraint if exists experiences_year_matches_start;
alter table experiences add constraint experiences_year_matches_start
  check (start_date is null or extract(year from start_date)::int = year);

comment on column experiences.is_current is
  'Poste occupé aujourd''hui. true = en poste, false = terminé, null = non renseigné.';

create index if not exists experiences_author_start_idx
  on experiences (author_id, start_date);

-- ------------------------------------------------ compétences --
--
-- Référentiel partagé, comme `companies` : « Python », « python » et
-- « Python  » sont la même compétence. La forme canonique est une colonne
-- générée, donc impossible à forger.

create table if not exists skills (
  id         uuid primary key default gen_random_uuid(),
  label      text not null check (char_length(label) between 1 and 40),
  normalized text generated always as (
    lower(regexp_replace(btrim(label), '\s+', ' ', 'g'))
  ) stored,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists skills_normalized_key on skills (normalized);

-- Compétences déclarées par un membre.
create table if not exists profile_skills (
  profile_id uuid not null references profiles (id) on delete cascade,
  skill_id   uuid not null references skills (id) on delete cascade,
  primary key (profile_id, skill_id)
);

-- Compétences mobilisées dans une expérience. C'est la seule source des
-- « compétences fréquentes » : elles viennent de stages réellement vécus, pas
-- d'annonces (la table d'offres a été retirée en 0006).
create table if not exists experience_skills (
  experience_id uuid not null references experiences (id) on delete cascade,
  skill_id      uuid not null references skills (id) on delete cascade,
  primary key (experience_id, skill_id)
);

create index if not exists profile_skills_skill_idx    on profile_skills (skill_id);
create index if not exists experience_skills_skill_idx on experience_skills (skill_id);

-- ------------------------------------------------- préférences --
--
-- Personnelles : lisibles par leur seul propriétaire. Un autre membre n'a pas
-- à savoir où quelqu'un cherche un stage.

create table if not exists profile_target_countries (
  profile_id   uuid not null references profiles (id) on delete cascade,
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  primary key (profile_id, country_code)
);

create table if not exists profile_target_companies (
  profile_id uuid not null references profiles (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  primary key (profile_id, company_id)
);

-- ------------------------------------------------------ plafonds --
--
-- Les RPC ci-dessous bornent déjà les listes, mais PostgREST reste accessible
-- directement : le plafond vit dans la base.

create or replace function public.enforce_row_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cap     int  := tg_argv[0]::int;
  owner   text := tg_argv[1];
  current int;
begin
  execute format('select count(*) from %I where %I = $1', tg_table_name, owner)
    into current
    using (to_jsonb(new) ->> owner)::uuid;
  if current >= cap then
    raise exception 'Limite atteinte : % éléments au plus.', cap
      using errcode = 'CC413';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_skills_cap on profile_skills;
create trigger profile_skills_cap before insert on profile_skills
  for each row execute function public.enforce_row_cap('30', 'profile_id');

drop trigger if exists experience_skills_cap on experience_skills;
create trigger experience_skills_cap before insert on experience_skills
  for each row execute function public.enforce_row_cap('12', 'experience_id');

drop trigger if exists profile_target_countries_cap on profile_target_countries;
create trigger profile_target_countries_cap before insert on profile_target_countries
  for each row execute function public.enforce_row_cap('5', 'profile_id');

drop trigger if exists profile_target_companies_cap on profile_target_companies;
create trigger profile_target_companies_cap before insert on profile_target_companies
  for each row execute function public.enforce_row_cap('10', 'profile_id');

-- Le référentiel de compétences est ouvert à la création : il reçoit un quota
-- plus large que les contributions (une liste de compétences se saisit d'un
-- coup), mais un quota quand même.
create or replace function public.enforce_skill_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wait int;
begin
  if auth.uid() is null or not public.is_member() then
    return new;
  end if;
  wait := public.consume_write_quota('skills', 60, 60);
  if wait > 0 then
    raise exception
      'Trop de compétences créées d''affilée. Réessaie dans % seconde%.',
      wait, case when wait > 1 then 's' else '' end
      using errcode = 'CC429';
  end if;
  return new;
end;
$$;

drop trigger if exists skills_write_quota on skills;
create trigger skills_write_quota before insert on skills
  for each row execute function public.enforce_skill_quota();

-- ----------------------------------------------------------- RLS --

alter table skills                   enable row level security;
alter table profile_skills           enable row level security;
alter table experience_skills        enable row level security;
alter table profile_target_countries enable row level security;
alter table profile_target_companies enable row level security;

create policy skills_select on skills
  for select to authenticated using ((select public.is_member()));
create policy skills_insert on skills
  for insert to authenticated
  with check ((select public.is_member()) and created_by = (select auth.uid()));
create policy skills_update_mod on skills
  for update to authenticated using ((select public.is_moderator()));
create policy skills_delete_mod on skills
  for delete to authenticated using ((select public.is_moderator()));

-- Les compétences d'un membre sont une information professionnelle, visible
-- du réseau comme son parcours ; seul le membre les modifie.
create policy profile_skills_select on profile_skills
  for select to authenticated using ((select public.is_member()));
create policy profile_skills_insert_own on profile_skills
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy profile_skills_delete_own on profile_skills
  for delete to authenticated using (profile_id = (select auth.uid()));

-- Les compétences d'une expérience suivent les droits de l'expérience.
create policy experience_skills_select on experience_skills
  for select to authenticated using ((select public.is_member()));
create policy experience_skills_insert_own on experience_skills
  for insert to authenticated
  with check (exists (
    select 1 from experiences e
    where e.id = experience_id and e.author_id = (select auth.uid())
  ));
create policy experience_skills_delete_own on experience_skills
  for delete to authenticated
  using (exists (
    select 1 from experiences e
    where e.id = experience_id
      and (e.author_id = (select auth.uid()) or (select public.is_moderator()))
  ));

create policy profile_target_countries_own on profile_target_countries
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy profile_target_companies_own on profile_target_companies
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

revoke all on table skills, profile_skills, experience_skills,
  profile_target_countries, profile_target_companies from anon;

-- ----------------------------------------------------------- RPC --
--
-- Remplacer une liste (compétences, pays) est une opération : supprimer puis
-- réinsérer depuis l'application laisserait une liste vide si la seconde
-- requête échouait. `security invoker` : chaque écriture reste soumise à la RLS.

create or replace function public.ensure_skill_ids(labels text[])
returns uuid[]
language plpgsql
security invoker
set search_path = public
as $$
declare
  cleaned text[];
begin
  select coalesce(array_agg(distinct l), '{}') into cleaned
  from (
    select regexp_replace(btrim(x), '\s+', ' ', 'g') as l
    from unnest(coalesce(labels, '{}')) as x
  ) t
  where char_length(l) between 1 and 40;

  insert into skills (label, created_by)
  select l, auth.uid() from unnest(cleaned) as l
  on conflict (normalized) do nothing;

  return coalesce((
    select array_agg(s.id)
    from skills s
    where s.normalized in (select lower(l) from unnest(cleaned) as l)
  ), '{}');
end;
$$;

create or replace function public.set_profile_skills(labels text[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Aucune session' using errcode = '28000';
  end if;
  if coalesce(array_length(labels, 1), 0) > 30 then
    raise exception 'Limite atteinte : % éléments au plus.', 30 using errcode = 'CC413';
  end if;
  ids := public.ensure_skill_ids(labels);
  delete from profile_skills where profile_id = auth.uid();
  insert into profile_skills (profile_id, skill_id)
  select auth.uid(), unnest(ids);
end;
$$;

create or replace function public.set_experience_skills(experience uuid, labels text[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  ids uuid[];
begin
  if coalesce(array_length(labels, 1), 0) > 12 then
    raise exception 'Limite atteinte : % éléments au plus.', 12 using errcode = 'CC413';
  end if;
  -- La RLS filtrerait silencieusement : on refuse explicitement.
  if not exists (
    select 1 from experiences e
    where e.id = experience and e.author_id = auth.uid()
  ) then
    raise exception 'Expérience introuvable ou non modifiable' using errcode = '42501';
  end if;
  ids := public.ensure_skill_ids(labels);
  delete from experience_skills where experience_id = experience;
  insert into experience_skills (experience_id, skill_id)
  select experience, unnest(ids);
end;
$$;

create or replace function public.set_profile_targets(countries text[], company_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Aucune session' using errcode = '28000';
  end if;
  delete from profile_target_countries where profile_id = auth.uid();
  insert into profile_target_countries (profile_id, country_code)
  select distinct auth.uid(), upper(c) from unnest(coalesce(countries, '{}')) as c;

  delete from profile_target_companies where profile_id = auth.uid();
  insert into profile_target_companies (profile_id, company_id)
  select distinct auth.uid(), c from unnest(coalesce(company_ids, '{}')) as c;
end;
$$;

revoke execute on function public.ensure_skill_ids(text[]) from public, anon;
revoke execute on function public.set_profile_skills(text[]) from public, anon;
revoke execute on function public.set_experience_skills(uuid, text[]) from public, anon;
revoke execute on function public.set_profile_targets(text[], uuid[]) from public, anon;
grant execute on function public.ensure_skill_ids(text[]) to authenticated;
grant execute on function public.set_profile_skills(text[]) to authenticated;
grant execute on function public.set_experience_skills(uuid, text[]) to authenticated;
grant execute on function public.set_profile_targets(text[], uuid[]) to authenticated;
