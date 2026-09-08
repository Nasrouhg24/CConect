/**
 * Journal des événements de sécurité, côté application.
 *
 * Le journal qui fait foi est en base (`audit_log`, migration 0005) : il voit
 * aussi les écritures qui ne passent jamais par l'application. Celui-ci couvre
 * ce que la base ne peut pas voir — une tentative **refusée**, donc une ligne
 * qui n'existera nulle part.
 *
 * Règle absolue : ni jeton, ni cookie, ni contenu soumis, ni coordonnée. Un
 * identifiant de membre et un verbe suffisent à repérer un comportement
 * anormal, et n'ajoutent rien à ce que la base contient déjà.
 */
export type SecurityEvent =
  | "ownership.denied"
  | "rate_limit.tripped"
  | "session.missing";

export function logSecurityEvent(
  event: SecurityEvent,
  fields: Record<string, string | number | null> = {},
): void {
  console.warn("[cconnect] sécurité", { event, ...fields });
}
