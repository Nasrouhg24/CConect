/**
 * Traduction des erreurs de base pour l'utilisateur.
 *
 * Le message brut de Postgres nomme les contraintes, les relations et les
 * colonnes : « duplicate key value violates unique constraint
 * "companies_normalized_name_key" ». Renvoyer ça dans un formulaire donne à
 * qui veut la carte du schéma, et ne dit rien d'utile à un membre.
 *
 * Deux exceptions volontaires : les erreurs que *nous* levons en base portent
 * un message déjà rédigé pour la personne qui lit (le quota d'écriture), et la
 * règle des coordonnées privées mérite une phrase qui dit quoi corriger.
 */

interface DbErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

export const GENERIC_DB_ERROR =
  "Opération impossible pour l'instant. Réessaie, et signale-le si ça persiste.";

/** SQLSTATE applicatif : message déjà destiné à l'utilisateur (migration 0005). */
const APP_RATE_LIMIT = "CC429";
/** Plafond de lignes d'une liste (compétences, pays cibles) — migration 0008. */
const APP_ROW_CAP = "CC413";

export function describeDbError(error: unknown): string {
  const details = (error ?? {}) as DbErrorLike;
  const code = String(details.code ?? "");
  const raw = `${details.message ?? ""} ${details.details ?? ""}`;

  if (code === APP_RATE_LIMIT || code === APP_ROW_CAP) {
    return String(details.message || GENERIC_DB_ERROR);
  }

  if (raw.includes("no_private_details")) {
    return "Retire l'adresse email ou le numéro de téléphone : la plateforme ne publie aucune coordonnée privée.";
  }

  switch (code) {
    case "23505":
      return "Cette entrée existe déjà.";
    case "23503":
      return "Référence inconnue : recharge la page et réessaie.";
    case "23502":
    case "23514":
      return "Un champ ne respecte pas les règles de saisie.";
    case "42501":
      return "Action non autorisée.";
    default:
      return GENERIC_DB_ERROR;
  }
}

/**
 * Trace serveur d'un échec d'écriture.
 *
 * On journalise le code et la contrainte — de quoi diagnostiquer — jamais le
 * contenu soumis : il peut porter le nom d'un contact ou le texte d'une
 * expérience.
 */
export function reportDbError(context: string, error: unknown): void {
  const details = (error ?? {}) as DbErrorLike;
  console.error("[cconnect] échec base", {
    context,
    code: details.code ?? null,
    constraint: /"([a-z0-9_]+)"/.exec(String(details.message ?? ""))?.[1] ?? null,
  });
}
