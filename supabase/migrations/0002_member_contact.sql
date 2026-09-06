-- CConnect — email institutionnel du membre et préparation LinkedIn.
--
-- Rappel de la règle qui ne bouge pas : ces colonnes concernent UNIQUEMENT les
-- membres CConnect, qui les renseignent eux-mêmes pour être joignables.
-- Les contacts externes n'ont toujours ni email ni téléphone dans `contacts`.

alter table profiles
  add column if not exists contact_email text
    check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$');

comment on column profiles.contact_email is
  'Email institutionnel du membre, renseigné volontairement pour être contacté par les autres membres. Visible des seuls membres (RLS).';

comment on column profiles.linkedin_url is
  'Profil LinkedIn public du membre. Sert à l''identifier ; une authentification LinkedIn (OAuth) pourra s''y greffer plus tard via linkedin_id.';

-- Emplacement prévu pour une future connexion OAuth LinkedIn. Rien ne l'écrit
-- aujourd'hui : la colonne existe pour que l'ajout se fasse sans migration
-- destructive, et l'unicité empêche deux comptes de revendiquer le même profil.
alter table profiles
  add column if not exists linkedin_id text unique;

comment on column profiles.linkedin_id is
  'Réservé : identifiant LinkedIn renvoyé par OAuth. Non utilisé tant que le fournisseur n''est pas configuré.';
