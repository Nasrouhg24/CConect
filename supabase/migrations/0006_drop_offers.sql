-- ------------------------------------------------------------------ --
-- 0006 — Retrait des offres d'emploi
--
-- Pourquoi supprimer une table plutôt que masquer un écran : une annonce est
-- périssable et déjà publiée ailleurs (LinkedIn, site carrière de
-- l'entreprise). La maintenir ici obligeait la promo à tenir à jour ce que
-- personne ne tient à jour, et une offre expirée est pire qu'aucune offre.
--
-- Ce que CConnect garde, parce que ça n'existe nulle part ailleurs : les
-- expériences vécues et les contacts connus d'un membre.
--
-- La table part avec ses politiques, index, contraintes et déclencheurs
-- (cascade). Les lignes d'`audit_log` qui la mentionnent restent :
-- `target_table` est du texte libre, et l'historique de modération ne doit pas
-- disparaître avec la fonctionnalité.
-- ------------------------------------------------------------------ --

-- `create or replace view` refuse de retirer une colonne : la vue est donc
-- supprimée puis recréée, sans `offer_count`. Elle est supprimée *avant* la
-- table, sinon le `cascade` du `drop table` l'emporterait et la recréation
-- suivante n'aurait plus de droits posés.
drop view if exists public.company_stats;

drop table if exists job_offers cascade;

create view public.company_stats
with (security_invoker = true) as
  select
    c.id   as company_id,
    c.slug as company_slug,
    (select count(*) from contacts    k where k.company_id = c.id) as contact_count,
    (select count(*) from experiences e where e.company_id = c.id) as experience_count
  from companies c;

comment on view public.company_stats is
  'Compteurs par entreprise. Evite de transferer contacts et experiences pour n en afficher que le nombre.';

revoke all on public.company_stats from anon;
grant select on public.company_stats to authenticated;
