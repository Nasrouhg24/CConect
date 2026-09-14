-- CConnect — passage à l'échelle.
--
-- Trois problèmes, tous invisibles à 200 lignes et bloquants à 50 000 :
--
--   1. Les politiques RLS réévaluaient `auth.uid()` et `is_member()` **par
--      ligne**. Postgres ne sort l'appel de la boucle que s'il est enveloppé
--      dans un sous-select : `(select public.is_member())` devient un InitPlan
--      évalué une seule fois par requête.
--   2. Les pages agrégeaient en JavaScript ce que Postgres sait faire :
--      compter les offres d'une entreprise imposait de transférer toutes les
--      offres. D'où la vue `company_stats` et la fonction `network_stats()`.
--   3. La limitation de débit vivait en mémoire de l'instance. Sur plusieurs
--      instances serverless, chacune comptait pour elle : la limite réelle
--      était le nombre d'instances × 12. Elle est désormais en base.

-- ------------------------------------------------------------- index --
--
-- Les tris de listes (`order by`) et les jointures par entreprise sont les
-- deux accès chauds. Les index composites servent les deux d'un coup :
-- filtrer sur `company_id` puis trier n'a plus besoin d'un tri en mémoire.

create index if not exists experiences_company_year_idx
  on experiences (company_id, year desc);
create index if not exists experiences_author_year_idx
  on experiences (author_id, year desc);
create index if not exists experiences_year_idx
  on experiences (year desc);

create index if not exists contacts_company_created_idx
  on contacts (company_id, created_at desc);
create index if not exists contacts_author_created_idx
  on contacts (author_id, created_at desc);
create index if not exists contacts_created_idx
  on contacts (created_at desc);

create index if not exists job_offers_company_published_idx
  on job_offers (company_id, published_at desc);
create index if not exists job_offers_expires_idx
  on job_offers (expires_at);

create index if not exists companies_name_idx on companies (name);
create index if not exists places_city_idx    on places (city);

-- --------------------------------------------------- RLS : InitPlan --
--
-- Recréation à l'identique du point de vue des droits ; seule change la forme
-- de l'expression, pour qu'elle soit évaluée une fois et non par ligne.

drop policy if exists profiles_select_members on profiles;
create policy profiles_select_members on profiles
  for select to authenticated using ((select public.is_member()));

drop policy if exists profiles_insert_self on profiles;
create policy profiles_insert_self on profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists places_select on places;
create policy places_select on places
  for select to authenticated using ((select public.is_member()));
drop policy if exists places_insert on places;
create policy places_insert on places
  for insert to authenticated with check ((select public.is_member()));
drop policy if exists places_update_mod on places;
create policy places_update_mod on places
  for update to authenticated using ((select public.is_moderator()));
drop policy if exists places_delete_mod on places;
create policy places_delete_mod on places
  for delete to authenticated using ((select public.is_moderator()));

drop policy if exists companies_select on companies;
create policy companies_select on companies
  for select to authenticated using ((select public.is_member()));
drop policy if exists companies_insert on companies;
create policy companies_insert on companies
  for insert to authenticated
  with check ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists companies_update_mod on companies;
create policy companies_update_mod on companies
  for update to authenticated using ((select public.is_moderator()));
drop policy if exists companies_delete_mod on companies;
create policy companies_delete_mod on companies
  for delete to authenticated using ((select public.is_moderator()));

drop policy if exists experiences_select on experiences;
create policy experiences_select on experiences
  for select to authenticated using ((select public.is_member()));
drop policy if exists experiences_insert_own on experiences;
create policy experiences_insert_own on experiences
  for insert to authenticated with check (author_id = (select auth.uid()));
drop policy if exists experiences_update_own on experiences;
create policy experiences_update_own on experiences
  for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_moderator()))
  with check (author_id = (select auth.uid()) or (select public.is_moderator()));
drop policy if exists experiences_delete_own on experiences;
create policy experiences_delete_own on experiences
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_moderator()));

drop policy if exists contacts_select on contacts;
create policy contacts_select on contacts
  for select to authenticated using ((select public.is_member()));
drop policy if exists contacts_insert_own on contacts;
create policy contacts_insert_own on contacts
  for insert to authenticated with check (author_id = (select auth.uid()));
drop policy if exists contacts_update_own on contacts;
create policy contacts_update_own on contacts
  for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_moderator()))
  with check (author_id = (select auth.uid()) or (select public.is_moderator()));
drop policy if exists contacts_delete_own on contacts;
create policy contacts_delete_own on contacts
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_moderator()));

drop policy if exists job_offers_select on job_offers;
create policy job_offers_select on job_offers
  for select to authenticated using ((select public.is_member()));
drop policy if exists job_offers_insert_own on job_offers;
create policy job_offers_insert_own on job_offers
  for insert to authenticated with check (posted_by_id = (select auth.uid()));
drop policy if exists job_offers_update_own on job_offers;
create policy job_offers_update_own on job_offers
  for update to authenticated
  using (posted_by_id = (select auth.uid()) or (select public.is_moderator()))
  with check (posted_by_id = (select auth.uid()) or (select public.is_moderator()));
drop policy if exists job_offers_delete_own on job_offers;
create policy job_offers_delete_own on job_offers
  for delete to authenticated
  using (posted_by_id = (select auth.uid()) or (select public.is_moderator()));

drop policy if exists reports_insert_own on reports;
create policy reports_insert_own on reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists reports_select_own on reports;
create policy reports_select_own on reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_moderator()));
drop policy if exists reports_update_mod on reports;
create policy reports_update_mod on reports
  for update to authenticated using ((select public.is_moderator()));

drop policy if exists allowed_domains_select on allowed_email_domains;
create policy allowed_domains_select on allowed_email_domains
  for select to authenticated using ((select public.is_member()));

-- ------------------------------------------------- vue : compteurs --
--
-- `security_invoker` est indispensable : sans lui la vue s'exécuterait avec
-- les droits de son propriétaire et court-circuiterait la RLS.

create or replace view public.company_stats
with (security_invoker = true) as
  select
    c.id   as company_id,
    c.slug as company_slug,
    (select count(*) from job_offers  o where o.company_id = c.id) as offer_count,
    (select count(*) from contacts    k where k.company_id = c.id) as contact_count,
    (select count(*) from experiences e where e.company_id = c.id) as experience_count
  from companies c;

comment on view public.company_stats is
  'Compteurs par entreprise. Evite de transferer offres, contacts et experiences pour n en afficher que le nombre.';

-- Droits explicites plutôt que dépendre des privilèges par défaut du projet :
-- la vue ne doit pas être lisible par un visiteur non connecté.
revoke all on public.company_stats from anon;
grant select on public.company_stats to authenticated;

-- ------------------------------------ fonction : statistiques réseau --
--
-- Tout le contenu de la page /stats en une requête. `security invoker` (le
-- défaut) : les agrégats ne voient que les lignes visibles par l'appelant.

create or replace function public.network_stats()
returns jsonb
language sql
stable
set search_path = public
as $$
with entries as (
  select e.place_id, e.company_id, e.author_id, e.domain, e.year, 'experience' as kind
  from experiences e
  union all
  select k.place_id, k.company_id, k.author_id, k.domain,
         extract(year from k.created_at)::int, 'contact'
  from contacts k
),
joined as (
  select en.*, p.country_code, p.city, p.country_name, c.name as company_name
  from entries en
  join places p    on p.id = en.place_id
  join companies c on c.id = en.company_id
)
select jsonb_build_object(
  'countries',   (select count(distinct country_code) from joined),
  'cities',      (select count(distinct place_id)     from joined),
  'companies',   (select count(distinct company_id)   from joined),
  'members',     (select count(distinct author_id)    from joined),
  'experiences', (select count(*) from joined where kind = 'experience'),
  'contacts',    (select count(*) from joined where kind = 'contact'),
  'topCompanies', coalesce((
    select jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc, label)
    from (select company_name as label, count(*) as n from joined
          group by 1 order by n desc, 1 limit 8) t), '[]'::jsonb),
  'topCities', coalesce((
    select jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc, label)
    from (select city || ', ' || country_name as label, count(*) as n from joined
          group by 1 order by n desc, 1 limit 8) t), '[]'::jsonb),
  'topDomains', coalesce((
    select jsonb_agg(jsonb_build_object('key', key, 'label', key, 'count', n) order by n desc, key)
    from (select domain::text as key, count(*) as n from joined
          group by 1 order by n desc, 1 limit 9) t), '[]'::jsonb),
  'byYear', coalesce((
    select jsonb_agg(jsonb_build_object('year', year, 'count', n) order by year)
    from (select year, count(*) as n from joined group by 1) t), '[]'::jsonb)
);
$$;

comment on function public.network_stats() is
  'Statistiques du reseau agregees cote base. La page /stats et l accueil ne transferent plus la totalite des contributions.';

revoke execute on function public.network_stats() from public, anon;
grant  execute on function public.network_stats() to authenticated;

-- ----------------------------------------- limitation de débit en base --
--
-- Fenêtre glissante partagée par toutes les instances. La table n'est jamais
-- lue directement : seule la fonction `security definer` y touche, et aucune
-- politique RLS ne l'ouvre.

create table if not exists write_rate_events (
  id         bigint generated always as identity primary key,
  profile_id uuid not null references profiles (id) on delete cascade,
  bucket     text not null,
  at         timestamptz not null default now()
);

create index if not exists write_rate_events_lookup_idx
  on write_rate_events (profile_id, bucket, at desc);

-- RLS activée sans aucune politique : la table est fermée à tout le monde.
-- Seule `consume_write_quota` (security definer) y accède.
alter table write_rate_events enable row level security;
revoke all on table write_rate_events from anon, authenticated;

create or replace function public.consume_write_quota(
  bucket_name text,
  max_writes  int default 12,
  window_secs int default 60
)
returns int                       -- 0 = autorisé, sinon secondes à attendre
language plpgsql
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  used   int;
  oldest timestamptz;
begin
  if uid is null then
    raise exception 'Aucune session' using errcode = '28000';
  end if;

  -- Purge opportuniste : garde la table petite sans payer un delete à chaque
  -- écriture.
  if random() < 0.02 then
    delete from write_rate_events
    where at < now() - make_interval(secs => window_secs * 20);
  end if;

  select count(*), min(at) into used, oldest
  from write_rate_events
  where profile_id = uid
    and bucket = bucket_name
    and at > now() - make_interval(secs => window_secs);

  if used >= max_writes then
    return greatest(
      1,
      ceil(extract(epoch from
        (oldest + make_interval(secs => window_secs)) - now()))::int
    );
  end if;

  insert into write_rate_events (profile_id, bucket) values (uid, bucket_name);
  return 0;
end;
$$;

comment on function public.consume_write_quota(text, int, int) is
  'Fenetre glissante partagee entre instances. Renvoie 0 si l ecriture est autorisee, sinon le delai d attente en secondes.';

revoke execute on function public.consume_write_quota(text, int, int) from public, anon;
grant  execute on function public.consume_write_quota(text, int, int) to authenticated;
