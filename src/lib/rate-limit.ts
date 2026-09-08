/**
 * Limitation de débit des écritures, par membre.
 *
 * Pas de marqueur `server-only` ici, contrairement au repository : ce module
 * ne contient qu'un compteur, aucune donnée ni aucun secret. Le garder
 * importable permet de le tester directement avec `node --test`.
 *
 * Fenêtre glissante en mémoire : simple, sans dépendance, et suffisante pour
 * l'échelle d'une promo. Deux limites explicites :
 *
 *  - elle est **par instance** — plusieurs instances serverless ne partagent
 *    pas le compteur, la limite réelle est donc plus lâche que la valeur
 *    affichée ;
 *  - elle repose sur l'identifiant du membre, pas sur l'IP : elle protège de
 *    l'emballement d'un compte, pas d'une attaque distribuée.
 *
 * Elle n'a pas vocation à remplacer une limitation au niveau du réseau ; elle
 * évite qu'un script (ou une boucle de rendu) inonde la base.
 */
interface Window {
  hits: number[];
}

const globalForLimiter = globalThis as unknown as {
  __ccRateLimiter?: Map<string, Window>;
};

const buckets: Map<string, Window> = (globalForLimiter.__ccRateLimiter ??=
  new Map<string, Window>());

export interface RateLimitRule {
  /** Nombre d'actions autorisées dans la fenêtre. */
  limit: number;
  /** Durée de la fenêtre, en millisecondes. */
  windowMs: number;
}

/** Écritures de contenu : généreux pour un humain, serré pour une boucle. */
export const WRITE_LIMIT: RateLimitRule = { limit: 12, windowMs: 60_000 };

export interface RateLimitResult {
  ok: boolean;
  /** Secondes à attendre avant de réessayer, quand la limite est atteinte. */
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  rule: RateLimitRule = WRITE_LIMIT,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((at) => now - at < rule.windowMs);

  if (bucket.hits.length >= rule.limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((rule.windowMs - (now - oldest)) / 1000),
      ),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Purge opportuniste : sans ça, la table grossit avec chaque membre croisé.
  if (buckets.size > 500) {
    for (const [otherKey, other] of buckets) {
      if (other.hits.every((at) => now - at >= rule.windowMs)) {
        buckets.delete(otherKey);
      }
    }
  }

  return { ok: true, retryAfterSeconds: 0 };
}

export function rateLimitMessage(retryAfterSeconds: number): string {
  return `Trop de publications d'affilée. Réessaie dans ${retryAfterSeconds} seconde${
    retryAfterSeconds > 1 ? "s" : ""
  }.`;
}
