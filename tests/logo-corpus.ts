/**
 * Corpus de logos : ce qu'un membre colle réellement dans le champ « Site web »
 * d'une fiche, et le domaine que CConnect doit en tirer.
 *
 * `expect` décrit le résultat attendu **chez Logo.dev**, vérifié par le test
 * live (`logo-dev-live.test.ts`) — pas une supposition :
 *   - "logo"     : le fournisseur a un logo, l'image doit s'afficher ;
 *   - "fallback" : le fournisseur n'en a pas, le monogramme doit rester ;
 *   - "none"     : la saisie n'est pas un domaine, aucune requête n'est émise.
 */
export interface LogoCase {
  name: string;
  website: string | null;
  domain: string | null;
  expect: "logo" | "fallback" | "none";
}

export const LOGO_CASES: LogoCase[] = [
  // ---- Grands comptes, sous les formes qu'on copie depuis un navigateur ----
  { name: "Google", website: "https://www.google.com/", domain: "google.com", expect: "logo" },
  { name: "Microsoft", website: "microsoft.com", domain: "microsoft.com", expect: "logo" },
  { name: "Apple", website: "HTTPS://WWW.APPLE.COM", domain: "apple.com", expect: "logo" },
  { name: "Amazon", website: "https://www.amazon.com/", domain: "amazon.com", expect: "logo" },
  { name: "Meta", website: "https://www.meta.com", domain: "meta.com", expect: "logo" },
  { name: "IBM", website: "www.ibm.com/", domain: "ibm.com", expect: "logo" },
  { name: "Oracle", website: "https://www.oracle.com/ma/", domain: "oracle.com", expect: "logo" },
  { name: "Cisco", website: "https://www.cisco.com", domain: "cisco.com", expect: "logo" },
  { name: "Deloitte", website: "https://www.deloitte.com/", domain: "deloitte.com", expect: "logo" },
  { name: "Accenture", website: "https://www.accenture.com/ma-fr", domain: "accenture.com", expect: "logo" },
  { name: "Capgemini", website: "https://www.capgemini.com/", domain: "capgemini.com", expect: "logo" },
  { name: "Orange", website: "orange.com", domain: "orange.com", expect: "logo" },
  { name: "Huawei", website: "https://www.huawei.com/en/", domain: "huawei.com", expect: "logo" },
  { name: "DXC Technology", website: "https://dxc.com/us/en", domain: "dxc.com", expect: "logo" },

  // ---- Entreprises plus petites ou locales ----
  { name: "Inwi", website: "https://inwi.ma", domain: "inwi.ma", expect: "logo" },
  { name: "OCP Group", website: "https://www.ocpgroup.ma/", domain: "ocpgroup.ma", expect: "logo" },
  { name: "UM6P", website: "https://um6p.ma/fr", domain: "um6p.ma", expect: "logo" },
  { name: "Dataiku", website: "https://www.dataiku.com", domain: "dataiku.com", expect: "logo" },
  { name: "HPS", website: "https://www.hps-worldwide.com/", domain: "hps-worldwide.com", expect: "logo" },

  // ---- Variantes de domaine réellement rencontrées ----
  // Deloitte publie ses pages pays sous www2 : c'est un sous-domaine, pas `www`.
  { name: "Deloitte Maroc", website: "https://www2.deloitte.com/ma/fr.html", domain: "www2.deloitte.com", expect: "logo" },
  { name: "Meta (about)", website: "https://about.meta.com/", domain: "about.meta.com", expect: "logo" },
  { name: "AWS", website: "https://aws.amazon.com/console", domain: "aws.amazon.com", expect: "logo" },

  // ---- Inconnue, invalide, absente ----
  { name: "Unknown Company", website: "https://cconnect-unknown-company-4x7q.com", domain: "cconnect-unknown-company-4x7q.com", expect: "fallback" },
  { name: "Not A Domain", website: "not a domain", domain: null, expect: "none" },
  { name: "Localhost", website: "http://localhost:3000", domain: null, expect: "none" },
  { name: "No Website", website: null, domain: null, expect: "none" },
  { name: "Empty Website", website: "", domain: null, expect: "none" },
];
