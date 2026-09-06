-- CConnect — entreprises comme entités à part entière, offres de stage,
-- contacts structurés.
--
-- Objectif : un vrai graphe Entreprise → Offres → Contacts. Une offre ou un
-- contact ne porte plus un nom d'entreprise en texte libre, il référence
-- `companies.id`.
--
-- La règle du projet ne bouge pas : la table `contacts` n'a toujours ni
-- colonne email ni colonne téléphone pour le professionnel externe. La mise en
-- relation passe par le membre qui l'a ajouté.

-- ------------------------------------------------------- entreprises --

create type industry as enum (
  'software', 'consulting', 'finance', 'telecom', 'industry',
  'energy', 'public', 'research', 'other'
);

alter table companies
  add column if not exists normalized_name text,
  add column if not exists logo_url text
    check (logo_url is null or logo_url ~ '^https://'),
  add column if not exists industry industry not null default 'other',
  add column if not exists description text check (char_length(description) <= 600),
  add column if not exists linkedin_url text
    check (linkedin_url is null or linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/'),
  add column if not exists headquarters_id uuid references places (id) on delete set null;

-- `unaccent` est une extension optionnelle sur certains projets Supabase :
-- on retombe sur une translittération manuelle si elle n'est pas disponible.
create or replace function public.unaccent_fallback(raw text)
returns text
language sql
immutable
as $$
  select translate(
    raw,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;

-- Forme canonique du nom : minuscules, sans accent, sans ponctuation, sans
-- suffixe juridique. C'est la clé anti-doublons — « Microsoft », « Microsoft
-- Corp. » et « Microsoft Corporation » se rapprochent sur la même valeur.
create or replace function public.canonical_company_name(raw text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      regexp_replace(
        regexp_replace(
          lower(unaccent_fallback(raw)),
          '[^a-z0-9]+', ' ', 'g'
        ),
        '\s+(corporation|corp|incorporated|inc|limited|ltd|llc|plc|gmbh|ag|sarl|sasu|sas|sa|spa|srl|bv|nv|oy|ab|as|company|co|group|groupe|holdings|holding|international|technologies|technology|solutions|services)$',
        '', 'g'
      )
    ),
    ''
  );
$$;

update companies
set normalized_name = public.canonical_company_name(name)
where normalized_name is null;

alter table companies
  alter column normalized_name set not null;

-- Unicité du nom canonique : la base refuse le doublon même si l'application
-- se trompe. C'est la garantie, pas le formulaire.
create unique index if not exists companies_normalized_name_key
  on companies (normalized_name);

create index if not exists companies_industry_idx on companies (industry);

-- ------------------------------------------------------------ offres --

create table if not exists job_offers (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies (id) on delete cascade,
  place_id        uuid not null references places (id) on delete restrict,
  posted_by_id    uuid not null references profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 3 and 140),
  domain          domain_area not null,
  kind            experience_kind not null,
  duration_months smallint check (duration_months between 1 and 36),
  description     text check (char_length(description) <= 1500),
  technologies    text[] not null default '{}'
                    check (array_length(technologies, 1) is null
                           or array_length(technologies, 1) <= 12),
  url             text check (url is null or url ~ '^https://'),
  published_at    timestamptz not null default now(),
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists job_offers_company_idx   on job_offers (company_id);
create index if not exists job_offers_place_idx     on job_offers (place_id);
create index if not exists job_offers_published_idx on job_offers (published_at desc);

create trigger job_offers_touch before update on job_offers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------- contacts --

-- `contact_name` contenait le prénom seul, `contact_role` le poste et
-- `relationship` la note. On nomme les colonnes pour ce qu'elles sont.
alter table contacts
  add column if not exists first_name text,
  add column if not exists last_name text check (last_name is null or char_length(last_name) <= 80),
  add column if not exists position text,
  add column if not exists notes text check (notes is null or char_length(notes) <= 500);

update contacts set first_name = contact_name where first_name is null;
update contacts set position   = contact_role where position is null;
update contacts set notes      = relationship where notes is null;

alter table contacts
  alter column first_name set not null,
  alter column position set not null;

alter table contacts
  add constraint contacts_first_name_len
    check (char_length(first_name) between 2 and 80),
  add constraint contacts_position_len
    check (char_length(position) between 2 and 120);

alter table contacts rename column contact_linkedin_url to linkedin_url;

alter table contacts
  drop column if exists contact_name,
  drop column if exists contact_role,
  drop column if exists relationship;

-- Rappel explicite pour toute future migration.
comment on table contacts is
  'Contacts professionnels connus des membres. AUCUNE colonne email ou téléphone : la mise en relation passe par author_id. Ne pas en ajouter.';

-- Les signalements doivent pouvoir viser une entreprise ou une offre.
alter table reports drop constraint if exists reports_target_type_check;
alter table reports add constraint reports_target_type_check
  check (target_type in ('experience', 'contact', 'profile', 'company', 'offer'));

-- --------------------------------------------------------------- RLS --

alter table job_offers enable row level security;

create policy job_offers_select on job_offers
  for select to authenticated using (public.is_member());
create policy job_offers_insert_own on job_offers
  for insert to authenticated with check (posted_by_id = auth.uid());
create policy job_offers_update_own on job_offers
  for update to authenticated
  using (posted_by_id = auth.uid() or public.is_moderator())
  with check (posted_by_id = auth.uid() or public.is_moderator());
create policy job_offers_delete_own on job_offers
  for delete to authenticated
  using (posted_by_id = auth.uid() or public.is_moderator());
