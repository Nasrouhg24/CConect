import { newPhotoKey, normalizeProfilePhoto, photoVersion, type PhotoError } from "./profile-photo";

/**
 * Orchestration de la photo de profil, indépendante du stockage.
 *
 * Le membre vient **toujours** de la session, jamais de la requête : il n'y a
 * pas de paramètre « pour quel profil ». Modifier la photo d'un autre n'est
 * donc pas refusé ici, c'est inexprimable — et la base le refuse de toute façon
 * (migration 0009) pour qui passerait par l'API directement.
 */

export interface PhotoStore {
  /** Clé actuelle de la photo du membre, ou `null`. */
  currentKey(memberId: string): Promise<string | null>;
  putObject(key: string, webp: Uint8Array): Promise<void>;
  setKey(memberId: string, key: string | null): Promise<void>;
  deleteObject(key: string): Promise<void>;
}

export type PhotoResult =
  | { ok: true; version: string | null }
  | { ok: false; status: 401 | PhotoError["status"] | 500; message: string };

const UNAUTHENTICATED: PhotoResult = {
  ok: false,
  status: 401,
  message: "Connecte-toi pour modifier ta photo.",
};

export async function uploadProfilePhoto(
  store: PhotoStore,
  memberId: string | null,
  file: { type: string; size: number; bytes: Uint8Array },
): Promise<PhotoResult> {
  if (!memberId) return UNAUTHENTICATED;

  const normalized = await normalizeProfilePhoto({
    declaredType: file.type,
    size: file.size,
    bytes: file.bytes,
  });
  if (!normalized.ok) return { ok: false, ...normalized.error };

  const previous = await store.currentKey(memberId);
  const key = newPhotoKey(memberId);

  // Nouvelle photo d'abord, bascule ensuite, ancienne supprimée en dernier :
  // à aucun moment le profil ne pointe vers un objet absent.
  try {
    await store.putObject(key, normalized.webp);
  } catch {
    return { ok: false, status: 500, message: "Enregistrement de la photo impossible. Réessaie." };
  }
  try {
    await store.setKey(memberId, key);
  } catch {
    await store.deleteObject(key).catch(() => undefined);
    return { ok: false, status: 500, message: "Enregistrement de la photo impossible. Réessaie." };
  }
  if (previous && previous !== key) {
    // Un objet orphelin ne se voit nulle part ; un échec ici ne doit pas faire
    // échouer une mise à jour déjà visible.
    await store.deleteObject(previous).catch(() => undefined);
  }
  return { ok: true, version: photoVersion(key) };
}

export async function removeProfilePhoto(
  store: PhotoStore,
  memberId: string | null,
): Promise<PhotoResult> {
  if (!memberId) return UNAUTHENTICATED;

  const previous = await store.currentKey(memberId);
  if (!previous) return { ok: true, version: null };

  try {
    await store.setKey(memberId, null);
  } catch {
    return { ok: false, status: 500, message: "Suppression impossible. Réessaie." };
  }
  await store.deleteObject(previous).catch(() => undefined);
  return { ok: true, version: null };
}
