-- CConnect — le domaine d'une entreprise, clé de son logo.
--
-- Les logos ne sont pas stockés : ils se calculent à partir du domaine
-- (`https://img.logo.dev/<domaine>`, voir src/lib/logo-provider.ts). Le domaine
-- devient donc une colonne du modèle, et il doit être unique dans sa forme :
-- « www.Microsoft.com/ » et « https://microsoft.com » sont le même logo.
--
-- Rien n'est deviné ici. Le backfill ne lit que `website`, déjà saisi par un
-- membre ; une fiche sans site reste à `domain is null` et continue d'afficher
-- son monogramme. Aucun domaine n'est déduit d'un nom d'entreprise : « Inwi »
-- ne dit pas s'il faut écrire inwi.ma ou inwi.com.

-- ------------------------------------------------------------- colonne --

alter table companies
  add column if not exists domain text
    -- Forme canonique : hôte en minuscules, au moins deux étiquettes, TLD
    -- alphabétique. Pas de schéma, pas de `www.`, pas de chemin, pas de port.
    -- La contrainte double le garde-fou applicatif (`normalizeDomain`) : c'est
    -- la base qui a le dernier mot, comme pour `logo_url` et `linkedin_url`.
    check (
      domain is null
      or domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$'
    );

comment on column companies.domain is
  'Domaine canonique (microsoft.com). Clé du logo. Déduit du site web, jamais du nom.';

-- ------------------------------------------------------------ backfill --

-- Normalisation en SQL, dans le même ordre que `normalizeDomain` côté
-- application : schéma, identifiants, chemin, port, point final, `www.`.
create or replace function public.normalize_company_domain(raw text)
returns text
language sql
immutable
as $$
  with cleaned as (
    select nullif(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(lower(trim(coalesce(raw, ''))), '^[a-z][a-z0-9+.-]*://', ''),
              '^[^/@]*@', ''
            ),
            '[/?#].*$', ''
          ),
          ':[0-9]+$', ''
        ),
        '^www\.', ''
      ),
      ''
    ) as host
  )
  select case
    when host ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$'
      then host
    else null
  end
  from (select rtrim(host, '.') as host from cleaned) normalized;
$$;

update companies
set domain = public.normalize_company_domain(website)
where domain is null
  and website is not null
  and public.normalize_company_domain(website) is not null;

-- Un index sur le domaine n'est pas créé : aucune lecture ne filtre dessus, la
-- colonne ne sert qu'à construire une URL d'image. À ajouter le jour où une
-- fonctionnalité cherchera une entreprise par domaine.
