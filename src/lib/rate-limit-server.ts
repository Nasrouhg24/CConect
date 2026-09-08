import "server-only";

import { isSupabaseConfigured } from "./env";
import { checkRateLimit, type RateLimitResult } from "./rate-limit";
import { logSecurityEvent } from "./security-log";

/**
 * Limitation de débit des écritures, côté serveur.
 *
 * Où la limite est réellement appliquée : **en base**, par le déclencheur
 * `enforce_write_quota` (migration 0005), sur `contacts`, `experiences`,
 * `job_offers`, `companies` et `reports`. C'est le seul endroit qui compte,
 * parce que la clé anon est publique : un membre peut écrire directement dans
 * PostgREST sans jamais passer par une Server Action. Une limite posée ici et
 * nulle part ailleurs se contourne en ouvrant les outils de développement.
 *
 * Cette fonction ne fait donc plus que deux choses :
 *
 *  - en mode démo, où il n'y a pas de base, elle applique le compteur en
 *    mémoire de `rate-limit.ts` ;
 *  - en production, elle laisse passer, et le déclencheur tranche. Compter ici
 *    *aussi* consommerait deux jetons par écriture et diviserait la limite
 *    réelle par deux.
 *
 * Le message d'erreur du déclencheur est rédigé en français et traverse
 * `describeDbError` sans être réécrit (SQLSTATE `CC429`) : l'utilisateur voit
 * le même texte qu'avant, avec le délai d'attente.
 */
export async function enforceWriteQuota(
  bucket: string,
  memoryKey: string,
): Promise<RateLimitResult> {
  if (isSupabaseConfigured) return { ok: true, retryAfterSeconds: 0 };

  const result = checkRateLimit(memoryKey);
  if (!result.ok) {
    logSecurityEvent("rate_limit.tripped", {
      bucket,
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
  return result;
}
