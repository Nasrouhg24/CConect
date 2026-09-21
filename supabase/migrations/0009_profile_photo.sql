-- CConnect — photo de profil.
--
-- La photo vit dans Supabase Storage (bucket privé `avatars`), le profil ne
-- garde que la clé de l'objet. Cette clé n'est jamais envoyée au navigateur :
-- l'image est servie par `/api/profile-photo/<membre>`, qui applique la même
-- règle que la lecture d'un profil (être membre).
--
-- Deux garde-fous en base, parce que la clé anon est publique et qu'un membre
-- peut écrire directement dans l'API :
--   1. la clé est forcée à `<id du profil>/<uuid>.webp` : impossible de
--      pointer son profil vers la photo de quelqu'un d'autre ;
--   2. les politiques de `storage.objects` n'autorisent l'écriture que dans le
--      dossier qui porte son propre identifiant.

alter table profiles
  add column if not exists avatar_path text;

alter table profiles drop constraint if exists profiles_avatar_path_own_folder;
alter table profiles add constraint profiles_avatar_path_own_folder
  check (
    avatar_path is null
    or avatar_path ~ (
      '^' || id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
    )
  );

comment on column profiles.avatar_path is
  'Clé de la photo dans le bucket privé avatars. Jamais exposée au navigateur : servie par /api/profile-photo/<id>.';

-- `storage` n'existe que sur un projet Supabase (ou dans les tests, qui le
-- simulent). Sur un Postgres nu, la migration s'applique sans la partie
-- stockage, comme le hook d'inscription de la migration 0005.
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  -- Privé, et bridé côté stockage aussi : l'application ne dépose que du WebP
  -- réencodé de 512 px, bien sous 1 Mo.
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', false, 1048576, array['image/webp'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists avatars_select_members on storage.objects;
  create policy avatars_select_members on storage.objects
    for select to authenticated
    using (bucket_id = 'avatars' and (select public.is_member()));

  drop policy if exists avatars_insert_own on storage.objects;
  create policy avatars_insert_own on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'avatars'
      and (select public.is_member())
      and (storage.foldername(name))[1] = (select auth.uid())::text
    );

  drop policy if exists avatars_update_own on storage.objects;
  create policy avatars_update_own on storage.objects
    for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

  drop policy if exists avatars_delete_own on storage.objects;
  create policy avatars_delete_own on storage.objects
    for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
end
$$;
