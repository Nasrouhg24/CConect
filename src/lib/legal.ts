/**
 * Source de vérité des textes légaux.
 *
 * Une seule constante de version pour la politique *et* les conditions : les
 * deux sont acceptées d'un même geste, les versionner séparément ferait croire
 * qu'on peut accepter l'une sans l'autre. La version est la date de mise en
 * ligne, au format ISO — c'est ce que le membre lit en bas de page, et c'est
 * ce qui est stocké dans `profiles.policy_version`.
 *
 * Changer `POLICY_VERSION` **redemande le consentement à tout le monde** au
 * prochain chargement (voir `src/components/legal/ConsentGate.tsx`). À ne
 * faire que si le traitement change, pas pour une faute de frappe.
 */
export const POLICY_VERSION = "2026-09-21";

/** Affichage humain de la version — même date, lue par un francophone. */
export const POLICY_UPDATED_LABEL = "21 septembre 2026";

/** Responsable du traitement. */
export const CONTROLLER = "College of Computing, Université Mohammed VI Polytechnique";

/**
 * Adresse à laquelle s'exercent les droits (accès, rectification, effacement).
 *
 * Volontairement lue dans l'environnement et **non codée en dur** : publier une
 * adresse inventée dans une politique de confidentialité est pire que ne rien
 * publier — le membre écrit dans le vide et croit avoir exercé son droit. Tant
 * qu'elle est vide, les pages légales affichent un avertissement plutôt qu'un
 * contact fictif, et `npm run build` le signale.
 */
export const LEGAL_CONTACT = (process.env.NEXT_PUBLIC_LEGAL_CONTACT ?? "").trim();

/**
 * Cookie qui mémorise que le bandeau d'information a été lu.
 *
 * Il ne mémorise **pas un consentement** : il n'y a rien à consentir, tous les
 * cookies du site sont strictement nécessaires. Il évite seulement de réafficher
 * le même bandeau à chaque page.
 */
export const NOTICE_COOKIE = "cc_legal_notice";
export const NOTICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface CookieEntry {
  /** Nom, ou motif quand le nom porte une référence de projet. */
  name: string;
  purpose: string;
  duration: string;
  /** Qui le pose. `first` = ce site ; aucun tiers n'en pose aujourd'hui. */
  party: "first";
}

/**
 * Inventaire exhaustif des cookies du site.
 *
 * Tout est strictement nécessaire : sans le jeton de session, il n'y a pas de
 * session ; sans le vérificateur PKCE, le lien de connexion ne peut pas être
 * échangé. Aucune mesure d'audience, aucun cookie publicitaire, aucun cookie
 * tiers — c'est ce qui dispense d'une demande de consentement (RGPD art. 6 et
 * exemption « strictement nécessaire » de la directive ePrivacy, loi 09-08 au
 * Maroc) et réduit le bandeau à une information.
 *
 * Toute ligne ajoutée ici qui ne serait pas strictement nécessaire fait tomber
 * ce raisonnement : il faudrait alors un vrai recueil de consentement, avec
 * refus possible et aussi simple que l'acceptation. Le test
 * `tests/legal.test.ts` verrouille l'inventaire pour que l'ajout soit un choix
 * et non un oubli.
 */
export const ESSENTIAL_COOKIES: readonly CookieEntry[] = [
  {
    name: "sb-<référence-projet>-auth-token",
    purpose:
      "Jeton de session : c'est lui qui fait qu'on reste connecté d'une page à l'autre. Découpé en plusieurs cookies numérotés quand il dépasse la taille d'un cookie.",
    duration: "30 jours glissants",
    party: "first",
  },
  {
    name: "sb-<référence-projet>-auth-token-code-verifier",
    purpose:
      "Vérificateur PKCE, le temps d'échanger le lien de connexion reçu par email contre une session. Supprimé aussitôt après.",
    duration: "Quelques minutes",
    party: "first",
  },
  {
    name: NOTICE_COOKIE,
    purpose:
      "Mémorise que le bandeau d'information sur les cookies a été lu, pour ne pas le réafficher à chaque page.",
    duration: "12 mois",
    party: "first",
  },
] as const;

/**
 * Registre des traitements, tel qu'il est affiché.
 *
 * Il décrit ce que le code fait réellement — chaque ligne se vérifie dans le
 * schéma (`supabase/migrations/`). Une donnée qui n'est pas dans cette liste
 * n'a pas à être collectée.
 */
export interface ProcessingEntry {
  data: string;
  purpose: string;
  basis: string;
  retention: string;
}

export const PROCESSING_REGISTER: readonly ProcessingEntry[] = [
  {
    data: "Adresse email institutionnelle (@um6p.ma)",
    purpose:
      "Vérifier l'appartenance au College of Computing et envoyer le lien de connexion. C'est le seul identifiant de compte.",
    basis: "Exécution du service demandé (création du compte)",
    retention: "Jusqu'à la suppression du compte",
  },
  {
    data: "Nom complet, campus, statut (étudiant/alumni), promotion, filière",
    purpose:
      "Signer les contributions et permettre aux autres membres de situer qui parle.",
    basis: "Exécution du service demandé",
    retention: "Jusqu'à la suppression du compte",
  },
  {
    data: "Profil LinkedIn, email de contact, photo de profil (facultatifs)",
    purpose:
      "Être joignable par les autres membres. Rien n'est prérempli : ces champs restent vides tant que le membre ne les remplit pas.",
    basis: "Consentement, retirable en vidant le champ",
    retention: "Jusqu'au retrait par le membre ou à la suppression du compte",
  },
  {
    data: "Année d'étude, domaine visé, poste visé, compétences, pays et entreprises visés, ouverture au mentorat",
    purpose:
      "Alimenter le conseiller d'orientation. Les préférences de recherche ne sont lisibles que par leur auteur — la base l'impose, pas seulement l'interface.",
    basis: "Consentement, retirable depuis le profil",
    retention: "Jusqu'au retrait par le membre ou à la suppression du compte",
  },
  {
    data: "Expériences déclarées (entreprise, lieu, année, poste, résumé, process de recrutement)",
    purpose:
      "Le cœur du réseau : ce qu'un membre a vécu, mis à disposition des suivants.",
    basis: "Consentement au partage, contribution par contribution",
    retention:
      "Jusqu'à suppression par l'auteur. Les contributions survivent au compte si l'auteur les laisse en place : elles sont alors détachées de son identité.",
  },
  {
    data: "Contacts renseignés par un membre (nom, poste, entreprise, LinkedIn, note de relation)",
    purpose:
      "Savoir qui connaît qui, sans passer par des coordonnées privées.",
    basis: "Intérêt légitime du réseau, limité par la minimisation (voir ci-dessous)",
    retention: "Jusqu'à suppression par l'auteur, le signalement d'un tiers ou la modération",
  },
  {
    data: "Signalements, journal d'audit des écritures, compteurs anti-abus",
    purpose:
      "Modérer, tracer une suppression contestée, empêcher l'écriture en masse.",
    basis: "Intérêt légitime (sécurité du service)",
    retention: "12 mois",
  },
] as const;

/**
 * Écran d'acceptation. Sous `/legal` pour une raison de fond : c'est ce
 * préfixe que le proxy laisse passer, et le blocage doit pouvoir s'afficher.
 */
export const CONSENT_PATH = "/legal/accepter";

/** Les trois pages légales, dans l'ordre où elles se lisent. */
export const LEGAL_PAGES = [
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/conditions", label: "Conditions" },
] as const;
