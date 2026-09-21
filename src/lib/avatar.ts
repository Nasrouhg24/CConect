/**
 * Ce qu'affiche un avatar : la photo si elle existe, sinon l'initiale.
 *
 * Partagé client/serveur, sans dépendance : l'URL ne contient que l'identifiant
 * du membre et une version opaque, jamais la clé de stockage.
 */
export type AvatarDisplay =
  | { kind: "photo"; src: string; alt: string }
  | { kind: "monogram"; initial: string; alt: string };

export function avatarDisplay(
  member: { id: string; fullName: string },
  photoVersion: string | null,
): AvatarDisplay {
  const alt = `Photo de ${member.fullName}`;
  if (photoVersion) {
    return {
      kind: "photo",
      src: `/api/profile-photo/${encodeURIComponent(member.id)}?v=${encodeURIComponent(photoVersion)}`,
      alt,
    };
  }
  const initial = member.fullName.trim().charAt(0).toUpperCase() || "?";
  return { kind: "monogram", initial, alt };
}
