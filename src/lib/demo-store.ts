import "server-only";

import { AUTHORS, COMPANIES, CONTACTS, EXPERIENCES } from "./data/seed";
import type { Author, CareerProfile, Company, Contact, Experience } from "./types";

/**
 * Stockage en mémoire du mode démo.
 *
 * Le store est **la seule source de vérité** quand aucun Supabase n'est
 * configuré : il est amorcé avec le jeu de démonstration, puis lu et écrit
 * comme le serait une base. Sans ça, les entrées du jeu de départ seraient
 * lisibles mais non modifiables, et l'interface proposerait des actions qui
 * échouent.
 *
 * Rien n'est persisté : un redémarrage du serveur restaure le jeu initial.
 */
interface DemoStore {
  seedVersion: number;
  currentMember: Author;
  /** Tous les membres connus, pour les fiches personnes. */
  members: Author[];
  companies: Company[];
  experiences: Experience[];
  contacts: Contact[];
  /** Préférences de carrière par membre. Vides au départ : rien n'est inventé. */
  careerProfiles: Map<string, Omit<CareerProfile, "member">>;
  /** Photos de profil : clé par membre, et octets WebP par clé. */
  photoKeys: Map<string, string>;
  photoObjects: Map<string, Uint8Array>;
  /**
   * Politiques acceptées par le membre de démonstration. `null` au démarrage,
   * et c'est voulu : le mode démo montre le blocage tel que le verra un membre
   * dont la version acceptée a vieilli.
   */
  policyVersion: string | null;
  policyAcceptedAt: string | null;
}

/**
 * À incrémenter dès que la forme du store change (nouvelle collection, champ
 * renommé, amorçage différent).
 *
 * Le store vit sur `globalThis` pour survivre au rechargement à chaud : il
 * survit donc aussi à un changement de modèle, et une forme périmée provoque
 * des pages vides ou des 404 déroutants jusqu'au redémarrage. Comparer une
 * version est plus sûr que compléter les champs manquants un par un, parce
 * qu'un champ *présent mais obsolète* passerait au travers.
 */
const SEED_VERSION = 8;

const globalForDemo = globalThis as unknown as {
  __ccDemoStore?: DemoStore;
};

function seed(): DemoStore {
  return {
    seedVersion: SEED_VERSION,
    currentMember: AUTHORS[0],
    members: [...AUTHORS],
    companies: [...COMPANIES],
    experiences: [...EXPERIENCES],
    contacts: [...CONTACTS],
    careerProfiles: new Map(),
    photoKeys: new Map(),
    photoObjects: new Map(),
    policyVersion: null,
    policyAcceptedAt: null,
  };
}

if (globalForDemo.__ccDemoStore?.seedVersion !== SEED_VERSION) {
  globalForDemo.__ccDemoStore = seed();
}

export const demoStore = globalForDemo.__ccDemoStore;
