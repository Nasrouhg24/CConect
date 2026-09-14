/**
 * Destination de redirection après connexion.
 *
 * Le paramètre `next` vient de l'URL, donc de l'attaquant. La version
 * précédente filtrait sur des préfixes de chaîne : elle refusait
 * « //evil.com » mais laissait passer « /\evil.com », parce que l'analyseur
 * d'URL des navigateurs convertit l'antislash en slash pour les schémas
 * spéciaux — « /\evil.com » devient donc « //evil.com », c'est-à-dire un autre
 * site.
 *
 * On ne raisonne plus sur le texte mais sur l'URL résolue : si elle ne tombe
 * pas exactement sur notre origine, on renvoie vers l'accueil du réseau. Les
 * antislashs, les slashs encodés et les prochaines subtilités de l'analyseur
 * sont couverts par construction.
 */
export const DEFAULT_REDIRECT = "/network";

export function safeRedirectPath(raw: string | null, origin: string): string {
  if (!raw) return DEFAULT_REDIRECT;

  let target: URL;
  let base: URL;
  try {
    base = new URL(origin);
    target = new URL(raw, base);
  } catch {
    return DEFAULT_REDIRECT;
  }

  if (target.origin !== base.origin) return DEFAULT_REDIRECT;

  const path = `${target.pathname}${target.search}`;
  return path.startsWith("/") ? path : DEFAULT_REDIRECT;
}
