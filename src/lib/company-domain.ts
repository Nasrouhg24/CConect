/**
 * Domaine d'une entreprise — la clé de son logo.
 *
 * Le logo n'est pas un fichier qu'on stocke, c'est une **conséquence du
 * domaine** : `capgemini.com` suffit à obtenir le logo de Capgemini auprès du
 * fournisseur (voir `src/lib/logo-provider.ts`). Le domaine devient donc une
 * donnée du modèle, au même titre que le nom, et il doit être écrit sous une
 * seule forme — sinon `Microsoft.com`, `www.microsoft.com/` et
 * `https://microsoft.com` désignent trois logos différents dont deux n'existent
 * pas.
 *
 * La forme canonique est l'hôte, en minuscules, sans `www.` :
 *
 *   https://www.microsoft.com/fr-fr/  →  microsoft.com
 *   HTTP://OCPGROUP.MA:443            →  ocpgroup.ma
 *   aws.amazon.com/console            →  aws.amazon.com
 *
 * Les sous-domaines autres que `www` sont **conservés** : `aws.amazon.com` est
 * une marque distincte d'`amazon.com`, et le fournisseur les distingue.
 */

/** Longueur maximale d'un nom de domaine (RFC 1035), étiquettes et points. */
const MAX_DOMAIN_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;

/**
 * Une étiquette : lettres, chiffres et tirets, sans tiret en bordure.
 * Écrit en boucle plutôt qu'en regex à lookbehind, qui n'est pas disponible
 * partout où ce fichier s'exécute (il part aussi dans le bundle navigateur).
 */
function isValidLabel(label: string): boolean {
  if (label.length === 0 || label.length > MAX_LABEL_LENGTH) return false;
  if (label.startsWith("-") || label.endsWith("-")) return false;
  for (const char of label) {
    const isDigit = char >= "0" && char <= "9";
    const isLetter = char >= "a" && char <= "z";
    if (!isDigit && !isLetter && char !== "-") return false;
  }
  return true;
}

/**
 * Forme canonique d'un domaine, ou `null` si la saisie n'en est pas un.
 *
 * Renvoyer `null` plutôt que de corriger au jugé est délibéré : un domaine
 * inventé produit un logo faux ou une requête inutile, là où l'absence de
 * domaine produit un monogramme correct. Dans le doute, pas de domaine.
 */
export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value = raw.trim().toLowerCase();
  if (value.length === 0) return null;

  // Schéma : http://, https://, mais aussi ftp:// ou tout autre.
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");

  // Identifiants glissés dans l'URL (user:pass@hôte), avant le premier `/`.
  const authorityEnd = value.search(/[/?#]/);
  const authority = authorityEnd === -1 ? value : value.slice(0, authorityEnd);
  const at = authority.lastIndexOf("@");
  value = at === -1 ? authority : authority.slice(at + 1);

  // Port, puis point final de la forme absolue (« microsoft.com. »).
  value = value.replace(/:\d+$/, "").replace(/\.+$/, "");

  if (value.startsWith("www.")) value = value.slice(4);

  if (value.length === 0 || value.length > MAX_DOMAIN_LENGTH) return null;

  const labels = value.split(".");
  // Un domaine d'entreprise a au moins deux étiquettes : `localhost` et les
  // noms internes ne désignent aucune marque publique.
  if (labels.length < 2) return null;
  if (!labels.every(isValidLabel)) return null;

  // Le TLD est alphabétique : c'est ce qui écarte les adresses IP, qu'aucun
  // fournisseur de logo ne sait résoudre.
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) return null;

  return value;
}

/**
 * Domaine déduit du site web déjà saisi sur la fiche.
 *
 * C'est la seule source de domaine du projet : on ne devine jamais un domaine
 * à partir d'un nom d'entreprise (« Inwi » → `inwi.ma` ? `inwi.com` ?), on le
 * lit là où un membre l'a écrit.
 */
export function domainFromWebsite(
  website: string | null | undefined,
): string | null {
  return normalizeDomain(website);
}
