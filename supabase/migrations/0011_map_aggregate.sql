-- ============================================================================
-- 0011 — la carte dessinée depuis un agrégat
--
-- `/network` transférait toutes les contributions au navigateur : la carte
-- projette le réseau entier, et la recherche était instantanée parce qu'elle
-- travaillait sur un jeu déjà chargé. Le coût de la page grandissait donc avec
-- la plateforme et non avec ce qu'elle affiche — le plafond connu de
-- l'architecture (docs/ARCHITECTURE.md § Passage à l'échelle).
--
-- Trois fonctions le remplacent. `map_clusters` renvoie un marqueur par ville
-- (un poids, deux compteurs, les entreprises représentées) ; `network_facets`
-- les valeurs que le menu de filtres peut proposer ; `network_suggestions` ce
-- que l'autocomplétion affiche. Le détail d'une ville n'est lu qu'à
-- l'ouverture du panneau, par une lecture ciblée sur `place_id`.
--
-- Toutes sont `security invoker` (le défaut) : les agrégats ne comptent que
-- les lignes visibles par l'appelant, la RLS continue de s'appliquer.
--
-- **Les libellés restent dans l'application.** La base ne connaît que des
-- clés (`cybersecurity`, `alumni`) ; « Cybersécurité » n'apparaît nulle part
-- ici. La recherche libre arrive donc déjà développée : chaque mot tapé est
-- accompagné des clés dont le libellé le contient (`src/lib/search.ts`).
-- Traduire l'interface ne demande toujours pas de migration.
-- ============================================================================

-- ------------------------------------------------- vue : entrées unifiées --
--
-- Une expérience et un contact partagent la même forme dans la carte : c'est
-- l'`Entry` de l'application, ici en SQL. `search_text` reprend, dans le même
-- ordre, les champs que `haystack` concatène côté application — c'est ce qui
-- rend les deux chemins comparables (`tests/map-aggregate.test.ts`).
--
-- `security_invoker` est indispensable : sans lui la vue s'exécuterait avec
-- les droits de son propriétaire et court-circuiterait la RLS.

create or replace view public.map_entries
with (security_invoker = true) as
  select
    e.id,
    'experience'::text        as entry_kind,
    e.place_id,
    e.company_id,
    c.slug                    as company_slug,
    p.continent::text         as continent,
    p.country_code,
    e.domain::text            as domain,
    e.kind::text              as experience_kind,
    e.year::int               as year,
    e.author_id,
    a.campus::text            as campus,
    a.status::text            as status,
    lower(public.unaccent_fallback(concat_ws(' ',
      c.name, p.city, p.country_name, p.country_code,
      e.year::text, e.title, e.summary, a.full_name
    )))                       as search_text
  from experiences e
  join companies c on c.id = e.company_id
  join places    p on p.id = e.place_id
  join profiles  a on a.id = e.author_id
  union all
  select
    k.id,
    'contact',
    k.place_id,
    k.company_id,
    c.slug,
    p.continent::text,
    p.country_code,
    k.domain::text,
    null,
    extract(year from k.created_at)::int,
    k.author_id,
    a.campus::text,
    a.status::text,
    lower(public.unaccent_fallback(concat_ws(' ',
      c.name, p.city, p.country_name, p.country_code,
      extract(year from k.created_at)::text, k.position, k.notes,
      k.first_name, k.last_name, a.full_name
    )))
  from contacts k
  join companies c on c.id = k.company_id
  join places    p on p.id = k.place_id
  join profiles  a on a.id = k.author_id;

comment on view public.map_entries is
  'Experiences et contacts sous la forme commune de la carte, avec le texte indexe de la recherche libre.';

revoke all    on public.map_entries from anon;
grant  select on public.map_entries to authenticated;

-- --------------------------------------------- fonction : un mot matche ? --
--
-- Un mot tapé touche la ligne s'il est un fragment de son texte, ou s'il
-- désigne l'une de ses clés. `position` plutôt que `like` : le mot vient
-- d'une saisie, et `%` ou `_` y seraient des jokers.

create or replace function public.map_entry_matches_token(
  row_text        text,
  row_entry_kind  text,
  row_domain      text,
  row_kind        text,
  row_campus      text,
  row_status      text,
  row_country     text,
  token           jsonb
)
returns boolean
language sql
immutable
as $fn$
  select
       position(coalesce(token->>'text', '') in row_text) > 0
    or row_domain     in (select jsonb_array_elements_text(coalesce(token->'domains',         '[]'::jsonb)))
    or row_status     in (select jsonb_array_elements_text(coalesce(token->'statuses',        '[]'::jsonb)))
    or row_campus     in (select jsonb_array_elements_text(coalesce(token->'campuses',        '[]'::jsonb)))
    or row_kind       in (select jsonb_array_elements_text(coalesce(token->'experienceKinds', '[]'::jsonb)))
    or row_entry_kind in (select jsonb_array_elements_text(coalesce(token->'entryKinds',      '[]'::jsonb)))
    or row_country    in (select jsonb_array_elements_text(coalesce(token->'countries',       '[]'::jsonb)));
$fn$;

comment on function public.map_entry_matches_token(text, text, text, text, text, text, text, jsonb) is
  'Un mot de la recherche libre touche-t-il la ligne ? Les libelles restent dans l application : la base recoit des cles.';

-- ------------------------------------------- fonction : marqueurs de carte --
--
-- Un enregistrement par ville, pas une contribution par ville. `companySlugs`
-- est la seule liste renvoyée : la carte relie deux villes qui partagent une
-- entreprise, et c'est borné par le nombre d'entreprises, pas de lignes.

create or replace function public.map_clusters(p_filters jsonb default '{}'::jsonb)
returns jsonb
language sql
stable
set search_path = public
as $fn$
with kept as (
  select en.*
  from map_entries en
  where (p_filters->>'entryKind'      is null or en.entry_kind      = p_filters->>'entryKind')
    and (p_filters->>'continent'      is null or en.continent       = p_filters->>'continent')
    and (p_filters->>'country'        is null or en.country_code    = p_filters->>'country')
    and (p_filters->>'city'           is null or en.place_id        = (p_filters->>'city')::uuid)
    and (p_filters->>'company'        is null or en.company_slug    = p_filters->>'company')
    and (p_filters->>'domain'         is null or en.domain          = p_filters->>'domain')
    and (p_filters->>'campus'         is null or en.campus          = p_filters->>'campus')
    and (p_filters->>'status'         is null or en.status          = p_filters->>'status')
    and (p_filters->>'year'           is null or en.year            = (p_filters->>'year')::int)
    and (p_filters->>'experienceKind' is null or en.experience_kind = p_filters->>'experienceKind')
    -- Tous les mots doivent toucher : « aucun mot ne rate » se dit en SQL
    -- sans corréler un agrégat.
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_filters->'tokens', '[]'::jsonb)) as token
      where not public.map_entry_matches_token(
        en.search_text, en.entry_kind, en.domain, en.experience_kind,
        en.campus, en.status, en.country_code, token
      )
    )
),
clusters as (
  select
    k.place_id,
    count(*)                                                  as total,
    count(*) filter (where k.entry_kind = 'experience')        as experiences,
    count(*) filter (where k.entry_kind = 'contact')           as contacts,
    array_agg(distinct k.company_slug)                         as company_slugs
  from kept k
  group by k.place_id
)
select coalesce(
  (select jsonb_agg(
     jsonb_build_object(
       'placeId',         p.id,
       'city',            p.city,
       'countryCode',     p.country_code,
       'countryName',     p.country_name,
       'continent',       p.continent,
       'lat',             p.lat,
       'lng',             p.lng,
       'total',           c.total,
       'experienceCount', c.experiences,
       'contactCount',    c.contacts,
       'companySlugs',    to_jsonb(c.company_slugs)
     )
     order by c.total desc, p.id
   )
   from clusters c
   join places p on p.id = c.place_id),
  '[]'::jsonb
);
$fn$;

comment on function public.map_clusters(jsonb) is
  'Un marqueur par ville, filtres appliques en base. Remplace le transfert de toutes les contributions vers le navigateur.';

revoke execute on function public.map_clusters(jsonb) from public, anon;
grant  execute on function public.map_clusters(jsonb) to authenticated;

-- --------------------------------------------- fonction : valeurs offertes --
--
-- Pays, années et domaines ne sont pas des listes fermées : le menu de filtres
-- ne doit proposer que ce que le réseau contient vraiment. Volontairement non
-- filtré — retirer un filtre doit rester possible.

create or replace function public.network_facets()
returns jsonb
language sql
stable
set search_path = public
as $fn$
with joined as (
  select en.year, en.domain, p.country_code, p.country_name
  from map_entries en
  join places p on p.id = en.place_id
)
select jsonb_build_object(
  'countries', coalesce((
    select jsonb_agg(jsonb_build_object('code', country_code, 'name', country_name))
    from (select distinct country_code, country_name from joined) t), '[]'::jsonb),
  'years', coalesce((
    select jsonb_agg(year order by year desc)
    from (select distinct year from joined) t), '[]'::jsonb),
  'domains', coalesce((
    select jsonb_agg(jsonb_build_object('key', domain, 'count', n))
    from (select domain, count(*) as n from joined group by 1) t), '[]'::jsonb)
);
$fn$;

comment on function public.network_facets() is
  'Pays, annees et domaines presents dans le reseau, pour le menu de filtres.';

revoke execute on function public.network_facets() from public, anon;
grant  execute on function public.network_facets() to authenticated;

-- ----------------------------------------------- fonction : autocomplétion --
--
-- L'autocomplétion était calculée sur le jeu d'entrées chargé. Elle l'est
-- maintenant en base, sur la même règle : le texte tapé est cherché dans le
-- nom de l'entreprise, la ville, le pays et le nom du membre, et le compteur
-- affiché est le nombre de contributions concernées.
--
-- `p_countries` porte les pays dont un alias correspond (« germany » → `DE`) :
-- ces alias vivent dans l'application, pas en base.

create or replace function public.network_suggestions(
  p_query     text,
  p_countries text[] default '{}',
  p_limit     int    default 7
)
returns jsonb
language sql
stable
set search_path = public
as $fn$
with needle as (
  select lower(public.unaccent_fallback(btrim(coalesce(p_query, '')))) as q
),
matched as (
  select en.author_id, en.company_id, en.place_id,
         c.name as company_name, c.slug as company_slug,
         p.city, p.country_code, p.country_name,
         a.full_name, a.status::text as status, a.campus::text as campus,
         lower(public.unaccent_fallback(c.name))         as company_key,
         lower(public.unaccent_fallback(p.city))         as city_key,
         lower(public.unaccent_fallback(p.country_name)) as country_key,
         lower(public.unaccent_fallback(a.full_name))    as member_key
  from map_entries en
  join companies c on c.id = en.company_id
  join places    p on p.id = en.place_id
  join profiles  a on a.id = en.author_id
)
select jsonb_build_object(
  'companies', coalesce((
    select jsonb_agg(jsonb_build_object('slug', company_slug, 'name', company_name, 'count', n))
    from (select company_slug, min(company_name) as company_name, count(*) as n
          from matched, needle
          where q <> '' and position(q in company_key) > 0
          group by company_slug order by n desc, 2 limit p_limit) t), '[]'::jsonb),
  'cities', coalesce((
    select jsonb_agg(jsonb_build_object('placeId', place_id, 'city', city,
                                        'countryName', country_name, 'count', n))
    from (select place_id, min(city) as city, min(country_name) as country_name, count(*) as n
          from matched, needle
          where q <> '' and position(q in city_key) > 0
          group by place_id order by n desc, 2 limit p_limit) t), '[]'::jsonb),
  'countries', coalesce((
    select jsonb_agg(jsonb_build_object('code', country_code, 'name', country_name, 'count', n))
    from (select country_code, min(country_name) as country_name, count(*) as n
          from matched, needle
          where q <> '' and (position(q in country_key) > 0 or country_code = any(p_countries))
          group by country_code order by n desc, 2 limit p_limit) t), '[]'::jsonb),
  'members', coalesce((
    select jsonb_agg(jsonb_build_object('id', author_id, 'name', full_name,
                                        'status', status, 'campus', campus, 'count', n))
    from (select author_id, min(full_name) as full_name, min(status) as status,
                 min(campus) as campus, count(*) as n
          from matched, needle
          where q <> '' and position(q in member_key) > 0
          group by author_id order by n desc, 2 limit p_limit) t), '[]'::jsonb)
);
$fn$;

comment on function public.network_suggestions(text, text[], int) is
  'Autocompletion de la recherche de la carte, calculee en base.';

revoke execute on function public.network_suggestions(text, text[], int) from public, anon;
grant  execute on function public.network_suggestions(text, text[], int) to authenticated;
