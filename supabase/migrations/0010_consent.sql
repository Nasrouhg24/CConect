-- CConnect — acceptation des politiques.
--
-- Le RGPD (art. 7.1) ne demande pas seulement de recueillir un consentement :
-- il demande de pouvoir le *démontrer*. Deux objets, donc, et pas un seul :
--
--   1. deux colonnes sur `profiles` — l'état courant, celui que l'application
--      lit à chaque chargement pour décider si elle bloque l'accès ;
--   2. `consent_events` — l'historique, en ajout seul. C'est lui qui répond à
--      « quand, et à quelle version ? » douze mois plus tard, y compris après
--      une nouvelle version des textes qui a écrasé l'état courant.
--
-- Un membre peut lire son historique et rien d'autre : c'est sa preuve autant
-- que la nôtre. Personne ne peut le modifier ni l'effacer — pas même son
-- propriétaire, sinon ce n'est plus une preuve. La suppression du compte
-- l'emporte (`on delete cascade`), parce que le droit à l'effacement passe
-- devant la conservation de la preuve d'un consentement devenu sans objet.

alter table profiles
  add column if not exists policy_version     text,
  add column if not exists policy_accepted_at timestamptz;

comment on column profiles.policy_version is
  'Version (date ISO) des politiques acceptée par le membre. null = jamais acceptée : l''application bloque l''accès.';

create table if not exists consent_events (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles (id) on delete cascade,
  policy_version text not null check (policy_version ~ '^\d{4}-\d{2}-\d{2}$'),
  accepted_at    timestamptz not null default now()
);

create index if not exists consent_events_profile_idx
  on consent_events (profile_id, accepted_at desc);

-- ----------------------------------------------------------- RLS --

alter table consent_events enable row level security;

-- Pas de `using` sur l'insertion : `with check` suffit, et il interdit
-- d'enregistrer un consentement au nom de quelqu'un d'autre.
create policy consent_events_insert_own on consent_events
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

create policy consent_events_select_own on consent_events
  for select to authenticated
  using (profile_id = (select auth.uid()));

-- Aucune politique `update` ni `delete` : la table est en ajout seul.

revoke all on table consent_events from anon;

-- ----------------------------------------------------------- RPC --
--
-- L'acceptation est une opération : mettre à jour le profil sans écrire
-- l'événement donnerait un accès débloqué sans preuve, et l'inverse un membre
-- bloqué qui a pourtant accepté. `security invoker` — la RLS s'applique, la
-- fonction ne peut donc rien faire que le membre n'aurait pu faire lui-même.
create or replace function public.accept_policy(p_version text)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  now_at timestamptz := now();
begin
  if p_version !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Version de politique invalide : %', p_version
      using errcode = 'CC400';
  end if;

  update profiles
     set policy_version     = p_version,
         policy_accepted_at = now_at,
         updated_at         = now_at
   where id = (select auth.uid());

  -- Zéro ligne = pas de profil, ou la RLS a refusé. Insérer l'événement
  -- malgré ça laisserait une preuve sans état : on échoue franchement.
  if not found then
    raise exception 'Aucun profil à mettre à jour.' using errcode = 'CC403';
  end if;

  insert into consent_events (profile_id, policy_version, accepted_at)
  values ((select auth.uid()), p_version, now_at);

  return now_at;
end;
$$;

revoke execute on function public.accept_policy(text) from public, anon;
grant  execute on function public.accept_policy(text) to authenticated;
