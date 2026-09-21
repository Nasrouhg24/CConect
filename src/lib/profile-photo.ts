import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";

/**
 * Photo de profil : validation et normalisation, côté serveur uniquement.
 *
 * Rien de ce que le navigateur annonce n'est cru sur parole. Une image est
 * acceptée si trois choses concordent : le type déclaré est autorisé, les
 * premiers octets sont ceux de ce format, et `sharp` la décode entièrement
 * sans erreur dans ce même format. Elle est ensuite **réencodée** : ce qui est
 * stocké n'est jamais le fichier envoyé, mais un WebP carré de 512 px produit
 * ici — sans métadonnées EXIF (donc sans coordonnées GPS), sans contenu caché
 * après la fin de l'image.
 */

export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoMimeType = (typeof PHOTO_MIME_TYPES)[number];

/** Taille maximale du fichier reçu. Le recadrage côté client produit bien moins. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MIN_PHOTO_SIDE = 128;
export const MAX_PHOTO_SIDE = 8000;
/** Garde-fou contre les « bombes » de décompression. */
const MAX_INPUT_PIXELS = 40_000_000;
export const OUTPUT_SIDE = 512;

export type PhotoError =
  | { status: 413; message: string }
  | { status: 415; message: string }
  | { status: 422; message: string };

const FORMAT_BY_MIME: Record<PhotoMimeType, "jpeg" | "png" | "webp"> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Format réel d'après la signature binaire, indépendamment du nom et du type annoncé. */
export function sniffImageType(bytes: Uint8Array): PhotoMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export function isPhotoMimeType(value: string): value is PhotoMimeType {
  return (PHOTO_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * Valide un fichier reçu et renvoie le WebP normalisé à stocker.
 *
 * L'ordre compte : la taille est vérifiée avant de lire quoi que ce soit, le
 * type et la signature avant de confier les octets au décodeur.
 */
export async function normalizeProfilePhoto(input: {
  declaredType: string;
  size: number;
  bytes: Uint8Array;
}): Promise<{ ok: true; webp: Uint8Array } | { ok: false; error: PhotoError }> {
  if (input.size > MAX_PHOTO_BYTES || input.bytes.length > MAX_PHOTO_BYTES) {
    return { ok: false, error: { status: 413, message: "Image trop lourde : 5 Mo au plus." } };
  }
  if (input.bytes.length === 0) {
    return { ok: false, error: { status: 422, message: "Le fichier est vide." } };
  }
  if (!isPhotoMimeType(input.declaredType)) {
    return {
      ok: false,
      error: { status: 415, message: "Format non accepté : JPEG, PNG ou WebP uniquement." },
    };
  }
  const sniffed = sniffImageType(input.bytes);
  if (sniffed !== input.declaredType) {
    return {
      ok: false,
      error: { status: 415, message: "Le contenu du fichier ne correspond pas à une image de ce format." },
    };
  }

  try {
    const image = sharp(input.bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
    const meta = await image.metadata();
    if (meta.format !== FORMAT_BY_MIME[input.declaredType]) {
      return {
        ok: false,
        error: { status: 415, message: "Le contenu du fichier ne correspond pas à une image de ce format." },
      };
    }
    if ((meta.pages ?? 1) > 1) {
      return { ok: false, error: { status: 422, message: "Les images animées ne sont pas acceptées." } };
    }
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (Math.min(width, height) < MIN_PHOTO_SIDE) {
      return {
        ok: false,
        error: { status: 422, message: `Image trop petite : ${MIN_PHOTO_SIDE} px de côté au minimum.` },
      };
    }
    if (Math.max(width, height) > MAX_PHOTO_SIDE) {
      return {
        ok: false,
        error: { status: 422, message: `Image trop grande : ${MAX_PHOTO_SIDE} px de côté au maximum.` },
      };
    }

    // `rotate()` applique l'orientation EXIF avant qu'elle ne disparaisse avec
    // les métadonnées ; `cover` recadre au centre une image qui ne serait pas
    // carrée (appel direct de l'API, sans le recadrage de l'interface).
    const webp = await image
      .rotate()
      .resize(OUTPUT_SIDE, OUTPUT_SIDE, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();
    return { ok: true, webp: new Uint8Array(webp) };
  } catch {
    return {
      ok: false,
      error: { status: 422, message: "Image illisible ou corrompue." },
    };
  }
}

const SAFE_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Clé de stockage : `<id du membre>/<uuid aléatoire>.webp`. Rien ne vient du
 * nom de fichier envoyé. L'identifiant est vérifié plutôt qu'échappé — un
 * identifiant hors de cette forme est une anomalie, pas une donnée à nettoyer.
 */
export function newPhotoKey(memberId: string): string {
  if (!SAFE_ID.test(memberId)) throw new Error("Identifiant de membre invalide");
  return `${memberId}/${randomUUID()}.webp`;
}

/**
 * Version publique d'une photo, pour invalider le cache à chaque changement
 * sans révéler la clé de stockage.
 */
export function photoVersion(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}
