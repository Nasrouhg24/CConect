import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Options des cookies de session.
 *
 * `httpOnly` reste **false**, et ce n'est pas un oubli : le client navigateur
 * de Supabase lit lui-même le jeton pour rafraîchir la session. Le rendre
 * inaccessible au script demanderait de renoncer au client navigateur — un
 * autre projet, à décider explicitement. Ce qui est corrigé ici, c'est le
 * reste, hérité tel quel des valeurs par défaut de la bibliothèque :
 *
 *  - `secure` en production : le cookie ne part plus sur une connexion claire ;
 *  - `maxAge` de 400 jours ramené à 30, glissants — un jeton oublié dans un
 *    navigateur prêté ne vaut plus plus d'un an ;
 *  - `sameSite: lax` explicite, qui participe à la protection CSRF.
 */
export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};
