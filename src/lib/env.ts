/**
 * Configuration lue depuis l'environnement.
 *
 * L'application démarre sans aucune variable : dans ce cas elle bascule en
 * « mode démo » et sert le jeu de données fictif de `src/lib/data/seed.ts`.
 * Voir `.env.example`.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Domaines email autorisés à créer un compte.
 * Le contrôle définitif est côté base (trigger + RLS) ; celui-ci évite
 * seulement d'envoyer un lien de connexion à une adresse hors périmètre.
 */
export const ALLOWED_EMAIL_DOMAINS = (
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ?? "um6p.ma"
)
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}
