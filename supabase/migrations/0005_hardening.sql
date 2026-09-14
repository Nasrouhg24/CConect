-- CConnect — corrections de l'audit de sécurité.
--
-- Le fil conducteur : la clé anon est publique par conception, donc tout
-- membre peut parler directement à PostgREST. Une règle qui ne vit que dans
-- une Server Action n'est pas une règle, c'est un confort d'interface. Cette
-- migration déplace en base les contrôles qui comptent.
--
--   F-01  élévation de privilège : `role` était libre à l'INSERT d'un profil
--   F-02  validation applicative contournable (coordonnées privées, débit)
--   F-03  inscription non restreinte au domaine (hook auth)
--   F-04  `reports` acceptait un compte sans profil
--   F-08  aucune trace : journal d'audit des rôles et de la modération
--   F-09  n'importe quel membre pouvait créer une ville
--   F-14  `normalized_name` était fourni par le client

-- ================================================================== F-01 ==
-- Élévation de privilège à la création du profil.
--
-- Le déclencheur `profiles_protect_role` était `before update` : il protégeait
-- la seule opération que personne n'a besoin de faire. Chaque membre crée
-- exactement une ligne de profil à l'inscription — c'est donc le chemin non
-- protégé qui était le chemin normal. Un membre pouvait s'inscrire
-- `role = 'admin'` en écrivant directement dans PostgREST, et la modération
-- donne l'écriture et la suppression sur toutes les contributions du réseau.
--
-- Deux barrières, volontairement redondantes : la politique refuse la ligne,
-- le déclencheur ramènerait la valeur à `member` si une politique future
-- oubliait la clause.

drop policy if exists profiles_insert_self on profiles;
create policy profiles_insert_self on profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and role = 'member');

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Pas de session : contexte privilégié (éditeur SQL, `service_role`,
  -- migration). C'est le seul chemin prévu pour nommer un modérateur, et il
  -- ne doit pas être ramené à `member`. Un appel anonyme via l'API n'arrive
  -- jamais ici : aucune politique n'autorise `anon` à écrire.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role is distinct from 'member'::member_role
       and not public.is_moderator() then
      new.role := 'member';
    end if;
  elsif new.role is distinct from old.role and not public.is_moderator() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on profiles;
create trigger profiles_protect_role
  before insert or update on profiles
  for each row execute function public.protect_profile_role();

-- ================================================================== F-04 ==
-- Signalements : toutes les autres politiques d'écriture vérifient
-- l'appartenance, celle-ci vérifiait seulement que l'auteur déclaré était
-- l'appelant. Un compte authentifié sans profil — donc hors périmètre UM6P —
-- pouvait insérer sans limite.

drop policy if exists reports_insert_own on reports;
create policy reports_insert_own on reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select public.is_member()));

-- ================================================================== F-09 ==
-- Villes : le référentiel est ce qui rend la carte lisible. Tant que le
-- parcours « proposer une ville » n'existe pas avec sa validation, la création
-- revient à la modération. Rouvrir cette politique fera partie de ce lot-là.

drop policy if exists places_insert on places;
create policy places_insert on places
  for insert to authenticated with check ((select public.is_moderator()));

-- ================================================================== F-14 ==
-- Nom canonique : l'index unique garantissait que deux lignes ne se
-- télescopent pas, mais rien ne garantissait que `normalized_name` corresponde
-- à `name`. Un insert direct pouvait donc contourner l'anti-doublon en
-- déclarant une forme canonique fantaisiste. La valeur est maintenant
-- toujours dérivée, quelle que soit la porte d'entrée.

create or replace function public.set_canonical_company_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.normalized_name := public.canonical_company_name(new.name);
  return new;
end;
$$;

drop trigger if exists companies_canonical_name on companies;
create trigger companies_canonical_name
  before insert or update of name, normalized_name on companies
  for each row execute function public.set_canonical_company_name();

-- La version de la migration 0003 ne retirait qu'un seul suffixe, et ratait
-- celui suivi d'une ponctuation : « Contoso Corp. » donnait `contoso corp`,
-- « Thales Technologies Group » donnait `thales technologies`. L'application
-- (`normalizeCompanyName`) donnait `contoso` et `thales`. Les deux formes se
-- contredisaient donc exactement sur les exemples que la documentation promet
-- de rapprocher — et la base fait désormais autorité, puisque le déclencheur
-- ci-dessus calcule la valeur. `tests/database-security.test.ts` vérifie la parité.

create or replace function public.canonical_company_name(raw text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  suffixes text[] := array[
    'corporation','corp','incorporated','inc','limited','ltd','llc','plc',
    'gmbh','ag','sarl','sas','sasu','sa','spa','srl','bv','nv','oy','ab','as',
    'company','co','group','groupe','holding','holdings','international',
    'technologies','technology','solutions','services'
  ];
  words text[];
  last_kept int;
begin
  words := regexp_split_to_array(
    trim(regexp_replace(lower(public.unaccent_fallback(raw)), '[^a-z0-9]+', ' ', 'g')),
    '\s+'
  );
  words := array_remove(words, '');

  last_kept := coalesce(array_length(words, 1), 0);
  if last_kept = 0 then
    return null;
  end if;

  -- On retire les suffixes de fin tant qu'il en reste. Si le nom n'est *que*
  -- des suffixes (« Group SA »), on garde tout : mieux vaut une clé imparfaite
  -- qu'une clé vide qui rapprocherait des entreprises sans rapport.
  while last_kept > 0 and words[last_kept] = any(suffixes) loop
    last_kept := last_kept - 1;
  end loop;

  if last_kept = 0 then
    return nullif(array_to_string(words, ' '), '');
  end if;

  return nullif(array_to_string(words[1:last_kept], ' '), '');
end;
$$;

-- Remise à niveau des lignes existantes, sans jamais faire échouer la
-- migration : les entreprises qui deviendraient des doublons sont laissées en
-- l'état et signalées, elles demandent une fusion manuelle.
do $$
declare
  remaining int;
begin
  update companies c
  set normalized_name = public.canonical_company_name(c.name)
  where c.normalized_name is distinct from public.canonical_company_name(c.name)
    and not exists (
      select 1 from companies o
      where o.id <> c.id
        and o.normalized_name = public.canonical_company_name(c.name)
    );

  select count(*) into remaining
  from companies c
  where c.normalized_name is distinct from public.canonical_company_name(c.name);

  if remaining > 0 then
    raise notice
      '% entreprise(s) partagent desormais la meme forme canonique : a fusionner a la main.',
      remaining;
  end if;
end
$$;

-- ================================================================== F-02 ==
-- Coordonnées privées dans les champs libres.
--
-- C'est la promesse la plus forte du projet : aucun email ni téléphone d'un
-- professionnel externe n'est stocké. Elle n'était appliquée que par
-- `findPrivateContactDetails()` dans les Server Actions — donc pas appliquée
-- du tout pour qui écrit directement dans l'API.
--
-- Le prédicat reproduit exactement celui de `src/lib/validation.ts`, y compris
-- le retrait préalable des dates : « du 2026-01-05 au 2026-06-30 » aligne
-- assez de chiffres pour ressembler à un numéro, et refuser ce texte
-- légitime rendrait la règle pénible au point d'être contournée.
-- `tests/database-security.test.ts` vérifie que les deux versions s'accordent.

create or replace function public.has_private_contact_details(raw text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select raw is not null and (
    raw ~ '[\w.+-]+@[\w-]+\.[\w.-]+'
    or regexp_replace(
         raw,
         '\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?)?|\d{1,2}/\d{1,2}/\d{2,4}',
         ' ',
         'g'
       ) ~ '(\+?\d[\s.()-]?){8,}'
  );
$$;

comment on function public.has_private_contact_details(text) is
  'Vrai si le texte contient un email ou un numero de telephone. Miroir de findPrivateContactDetails() dans src/lib/validation.ts.';

-- `not valid` : la contrainte s'applique à toute écriture future sans faire
-- échouer la migration sur d'éventuelles lignes déjà en base. Pour repérer
-- ces lignes puis valider :
--
--   select id from contacts where public.has_private_contact_details(notes);
--   alter table contacts validate constraint contacts_notes_no_private_details;

alter table contacts drop constraint if exists contacts_notes_no_private_details;
alter table contacts add constraint contacts_notes_no_private_details
  check (not public.has_private_contact_details(notes)) not valid;

alter table experiences drop constraint if exists experiences_summary_no_private_details;
alter table experiences add constraint experiences_summary_no_private_details
  check (not public.has_private_contact_details(summary)) not valid;

alter table job_offers drop constraint if exists job_offers_description_no_private_details;
alter table job_offers add constraint job_offers_description_no_private_details
  check (not public.has_private_contact_details(description)) not valid;

-- ---------------------------------------------- F-02 : débit d'écriture --
--
-- `consume_write_quota` existait déjà (migration 0004) mais n'était appelée
-- que par les Server Actions — même angle mort. Elle devient un déclencheur :
-- la limite s'applique quelle que soit la porte utilisée, et l'application
-- n'a plus à y penser.
--
-- Le message est rédigé ici parce qu'il remonte tel quel à l'utilisateur :
-- `repository.ts` relaie les erreurs de code `CC429`, et seulement celles-là.

create or replace function public.enforce_write_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wait int;
begin
  -- Contexte privilégié (seed, migration, tâche d'administration) : pas de
  -- session, donc pas de quota à imputer. La RLS bloque déjà l'anonyme.
  if auth.uid() is null then
    return new;
  end if;

  -- Pas encore membre : la politique RLS va refuser la ligne de toute façon.
  -- On sort avant, pour que l'utilisateur reçoive l'erreur d'autorisation
  -- plutôt qu'une violation de clé étrangère venue du compteur.
  if not public.is_member() then
    return new;
  end if;

  wait := public.consume_write_quota(tg_table_name::text);

  if wait > 0 then
    raise exception
      'Trop de publications d''affilée. Réessaie dans % seconde%.',
      wait, case when wait > 1 then 's' else '' end
      using errcode = 'CC429';
  end if;

  return new;
end;
$$;

drop trigger if exists contacts_write_quota on contacts;
create trigger contacts_write_quota before insert on contacts
  for each row execute function public.enforce_write_quota();

drop trigger if exists experiences_write_quota on experiences;
create trigger experiences_write_quota before insert on experiences
  for each row execute function public.enforce_write_quota();

drop trigger if exists job_offers_write_quota on job_offers;
create trigger job_offers_write_quota before insert on job_offers
  for each row execute function public.enforce_write_quota();

drop trigger if exists companies_write_quota on companies;
create trigger companies_write_quota before insert on companies
  for each row execute function public.enforce_write_quota();

drop trigger if exists reports_write_quota on reports;
create trigger reports_write_quota before insert on reports
  for each row execute function public.enforce_write_quota();

-- ================================================================== F-08 ==
-- Journal d'audit.
--
-- L'application n'écrivait aucune trace. L'élévation de privilège F-01
-- n'aurait laissé de marque nulle part : le premier signal aurait été un
-- membre constatant la disparition de sa contribution.
--
-- Deux événements seulement, ceux qu'on ne peut pas reconstituer autrement :
-- un changement de rôle, et une action de modération sur le contenu d'autrui.
-- Rien de sensible n'y entre — ni jeton, ni cookie, ni coordonnée.

create table if not exists audit_log (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  actor_id     uuid references profiles (id) on delete set null,
  action       text not null,
  target_table text not null,
  target_id    text,
  details      jsonb
);

create index if not exists audit_log_at_idx     on audit_log (at desc);
create index if not exists audit_log_action_idx on audit_log (action, at desc);

-- Aucune politique d'écriture : seuls les déclencheurs `security definer`
-- alimentent la table. Lecture réservée à la modération.
alter table audit_log enable row level security;
revoke all on table audit_log from anon, authenticated;
grant select on table audit_log to authenticated;

drop policy if exists audit_log_select_mod on audit_log;
create policy audit_log_select_mod on audit_log
  for select to authenticated using ((select public.is_moderator()));

create or replace function public.audit_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is distinct from 'member'::member_role then
      insert into audit_log (actor_id, action, target_table, target_id, details)
      values (auth.uid(), 'profile.created_with_role', 'profiles', new.id::text,
              jsonb_build_object('role', new.role));
    end if;
  elsif new.role is distinct from old.role then
    insert into audit_log (actor_id, action, target_table, target_id, details)
    values (auth.uid(), 'profile.role_changed', 'profiles', new.id::text,
            jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_audit_role on profiles;
create trigger profiles_audit_role
  after insert or update on profiles
  for each row execute function public.audit_profile_role();

-- Action de modération : quelqu'un modifie ou supprime une contribution qui
-- n'est pas la sienne. C'est légitime, et c'est exactement ce qu'il faut
-- pouvoir relire après coup.
create or replace function public.audit_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(coalesce(old, new));
  owner_id uuid  := coalesce(
    (row_data ->> 'author_id')::uuid,
    (row_data ->> 'posted_by_id')::uuid
  );
begin
  if auth.uid() is not null and owner_id is distinct from auth.uid() then
    insert into audit_log (actor_id, action, target_table, target_id, details)
    values (
      auth.uid(),
      'moderation.' || lower(tg_op),
      tg_table_name::text,
      row_data ->> 'id',
      jsonb_build_object('owner', owner_id)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists experiences_audit_mod on experiences;
create trigger experiences_audit_mod after update or delete on experiences
  for each row execute function public.audit_moderation();

drop trigger if exists contacts_audit_mod on contacts;
create trigger contacts_audit_mod after update or delete on contacts
  for each row execute function public.audit_moderation();

drop trigger if exists job_offers_audit_mod on job_offers;
create trigger job_offers_audit_mod after update or delete on job_offers
  for each row execute function public.audit_moderation();

-- ================================================================== F-03 ==
-- Restriction du domaine à l'inscription.
--
-- `isAllowedEmail()` filtre côté navigateur, et le déclencheur
-- `enforce_allowed_email_domain` refuse le profil. Mais rien n'empêchait
-- d'appeler `/auth/v1/otp` avec la clé anon publique et n'importe quelle
-- adresse : envoi de courrier au nom de l'école vers des tiers, création de
-- comptes `auth.users`, et surtout épuisement du quota horaire d'emails
-- d'authentification — ce qui bloque la connexion de tous les membres.
--
-- Cette fonction est destinée au hook « Before User Created » de Supabase.
-- ELLE NE FAIT RIEN TANT QU'ELLE N'EST PAS ACTIVÉE dans le tableau de bord
-- (Authentication → Hooks). Voir docs/SETUP_SUPABASE.md.
--
-- La forme de la charge utile est lue de façon défensive : selon la version,
-- l'adresse arrive sous `user.email`, `claims.email` ou `email`. À vérifier
-- une fois le hook branché, avec le test décrit dans SETUP_SUPABASE.md.

create or replace function public.restrict_signup_domain(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text := lower(coalesce(
    event -> 'user'   ->> 'email',
    event -> 'claims' ->> 'email',
    event             ->> 'email'
  ));
  email_domain text;
begin
  if candidate is null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 400,
        'message', 'Adresse email absente de la demande.'
      )
    );
  end if;

  email_domain := split_part(candidate, '@', 2);

  if exists (
    select 1 from allowed_email_domains d
    where email_domain = d.domain or email_domain like '%.' || d.domain
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Seules les adresses institutionnelles autorisées peuvent créer un compte CConnect.'
    )
  );
end;
$$;

comment on function public.restrict_signup_domain(jsonb) is
  'Hook Supabase « Before User Created ». Inactif tant qu il n est pas active dans Authentication > Hooks.';

revoke execute on function public.restrict_signup_domain(jsonb) from public, anon, authenticated;

-- `supabase_auth_admin` n'existe que sur un projet Supabase. Le bloc permet de
-- rejouer ces migrations sur un Postgres nu (CI, base jetable) sans échouer.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.restrict_signup_domain(jsonb) to supabase_auth_admin;
    -- Le hook doit pouvoir lire la liste des domaines. La table reste fermée
    -- à tout le monde d'autre ; c'est la RLS qui le garantit, pas le grant.
    grant select on table allowed_email_domains to supabase_auth_admin;

    drop policy if exists allowed_domains_select_auth_admin on allowed_email_domains;
    create policy allowed_domains_select_auth_admin on allowed_email_domains
      for select to supabase_auth_admin using (true);
  end if;
end
$$;
