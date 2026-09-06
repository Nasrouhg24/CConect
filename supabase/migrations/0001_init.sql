-- CC Career Network — schéma initial
--
-- Principes appliqués ici, pas seulement dans l'application :
--   1. Aucune colonne ne peut stocker l'email ou le téléphone d'un contact
--      externe. La table `contacts` n'expose qu'un nom, un rôle et un lien
--      public. Ce qui n'existe pas dans le schéma ne peut pas fuiter.
--   2. Tout est privé par défaut : RLS activé partout, lecture réservée aux
--      membres ayant un profil (donc une adresse d'un domaine autorisé).
--   3. Chaque contribution appartient à son auteur : lui seul (ou un
--      modérateur) peut la modifier ou la supprimer.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- types --

create type campus as enum ('rabat', 'benguerir');
create type member_status as enum ('student', 'alumni');
create type member_role as enum ('member', 'moderator', 'admin');
create type continent as enum (
  'africa', 'europe', 'north_america', 'south_america', 'asia', 'oceania'
);
create type domain_area as enum (
  'cybersecurity', 'ai_ml', 'software_engineering', 'data', 'cloud_devops',
  'networks', 'embedded', 'product_design', 'other'
);
create type experience_kind as enum (
  'pfa', 'pfe', 'internship', 'apprenticeship', 'job', 'research'
);
create type report_status as enum ('open', 'reviewing', 'resolved', 'rejected');

-- --------------------------------------------------------------- tables --

-- Domaines email autorisés à ouvrir un compte. Modifiable par un admin.
create table allowed_email_domains (
  domain text primary key,
  note   text
);

insert into allowed_email_domains (domain, note)
values ('um6p.ma', 'UM6P — étudiants et alumni');

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null check (char_length(full_name) between 2 and 80),
  campus       campus not null,
  status       member_status not null default 'student',
  promotion    smallint not null check (promotion between 2010 and 2100),
  program      text check (char_length(program) <= 120),
  linkedin_url text check (linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/'),
  role         member_role not null default 'member',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table places (
  id           uuid primary key default gen_random_uuid(),
  city         text not null check (char_length(city) between 2 and 80),
  country_code char(2) not null,
  country_name text not null,
  continent    continent not null,
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  created_at   timestamptz not null default now(),
  unique (city, country_code)
);

create table companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 120),
  slug       text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  website    text check (website ~ '^https://'),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table experiences (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references profiles (id) on delete cascade,
  company_id uuid not null references companies (id) on delete restrict,
  place_id   uuid not null references places (id) on delete restrict,
  domain     domain_area not null,
  kind       experience_kind not null,
  year       smallint not null check (year between 2005 and 2100),
  title      text not null check (char_length(title) between 3 and 120),
  summary    text check (char_length(summary) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contacts du réseau. Pas de colonne email, pas de colonne téléphone :
-- la mise en relation passe toujours par `author_id`.
create table contacts (
  id                    uuid primary key default gen_random_uuid(),
  author_id             uuid not null references profiles (id) on delete cascade,
  company_id            uuid not null references companies (id) on delete restrict,
  place_id              uuid not null references places (id) on delete restrict,
  domain                domain_area not null,
  contact_name          text not null check (char_length(contact_name) between 2 and 80),
  contact_role          text not null check (char_length(contact_role) between 2 and 120),
  contact_linkedin_url  text check (contact_linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/'),
  relationship          text check (char_length(relationship) <= 500),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_type text not null check (target_type in ('experience', 'contact', 'profile')),
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 10 and 500),
  status      report_status not null default 'open',
  created_at  timestamptz not null default now()
);

create index experiences_company_idx on experiences (company_id);
create index experiences_place_idx   on experiences (place_id);
create index experiences_author_idx  on experiences (author_id);
create index contacts_company_idx    on contacts (company_id);
create index contacts_place_idx      on contacts (place_id);
create index contacts_author_idx     on contacts (author_id);
create index reports_status_idx      on reports (status);

-- ------------------------------------------------------------ fonctions --

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch    before update on profiles
  for each row execute function public.touch_updated_at();
create trigger experiences_touch before update on experiences
  for each row execute function public.touch_updated_at();
create trigger contacts_touch    before update on contacts
  for each row execute function public.touch_updated_at();

-- Refuse tout profil dont l'adresse n'appartient pas à un domaine autorisé.
-- Dernier rempart : même une requête forgée ne peut pas créer de membre.
create or replace function public.enforce_allowed_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = new.id;

  if user_email is null then
    raise exception 'Aucun compte auth correspondant';
  end if;

  if not exists (
    select 1
    from allowed_email_domains d
    where lower(split_part(user_email, '@', 2)) = d.domain
       or lower(split_part(user_email, '@', 2)) like '%.' || d.domain
  ) then
    raise exception 'Domaine email non autorisé pour le CC Career Network';
  end if;

  return new;
end;
$$;

create trigger profiles_enforce_domain
  before insert on profiles
  for each row execute function public.enforce_allowed_email_domain();

-- ------------------------------------------------------------------ RLS --

alter table profiles             enable row level security;
alter table places               enable row level security;
alter table companies            enable row level security;
alter table experiences          enable row level security;
alter table contacts             enable row level security;
alter table reports              enable row level security;
alter table allowed_email_domains enable row level security;

-- profiles : visible entre membres, modifiable seulement par son propriétaire.
create policy profiles_select_members on profiles
  for select to authenticated using (public.is_member());
create policy profiles_insert_self on profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Le rôle ne doit jamais être modifiable par le membre lui-même.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_moderator() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on profiles
  for each row execute function public.protect_profile_role();

-- Référentiels : lecture pour les membres, création pour les membres,
-- modification réservée à la modération (évite les renommages sauvages).
create policy places_select on places
  for select to authenticated using (public.is_member());
create policy places_insert on places
  for insert to authenticated with check (public.is_member());
create policy places_update_mod on places
  for update to authenticated using (public.is_moderator());
create policy places_delete_mod on places
  for delete to authenticated using (public.is_moderator());

create policy companies_select on companies
  for select to authenticated using (public.is_member());
create policy companies_insert on companies
  for insert to authenticated with check (public.is_member() and created_by = auth.uid());
create policy companies_update_mod on companies
  for update to authenticated using (public.is_moderator());
create policy companies_delete_mod on companies
  for delete to authenticated using (public.is_moderator());

-- Contributions : lecture entre membres, écriture par l'auteur uniquement.
create policy experiences_select on experiences
  for select to authenticated using (public.is_member());
create policy experiences_insert_own on experiences
  for insert to authenticated with check (author_id = auth.uid());
create policy experiences_update_own on experiences
  for update to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());
create policy experiences_delete_own on experiences
  for delete to authenticated using (author_id = auth.uid() or public.is_moderator());

create policy contacts_select on contacts
  for select to authenticated using (public.is_member());
create policy contacts_insert_own on contacts
  for insert to authenticated with check (author_id = auth.uid());
create policy contacts_update_own on contacts
  for update to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());
create policy contacts_delete_own on contacts
  for delete to authenticated using (author_id = auth.uid() or public.is_moderator());

-- Signalements : un membre voit les siens, la modération voit tout.
create policy reports_insert_own on reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_select_own on reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_moderator());
create policy reports_update_mod on reports
  for update to authenticated using (public.is_moderator());

-- Domaines autorisés : lisible par les membres, modifiable hors application.
create policy allowed_domains_select on allowed_email_domains
  for select to authenticated using (public.is_member());
