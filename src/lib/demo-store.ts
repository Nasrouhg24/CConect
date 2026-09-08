import "server-only";

import {
  AUTHORS,
  COMPANIES,
  CONTACTS,
  EXPERIENCES,
  JOB_OFFERS,
} from "./data/seed";
import type { Author, Company, Contact, Experience, JobOffer } from "./types";

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
  companies: Company[];
  experiences: Experience[];
  contacts: Contact[];
  offers: JobOffer[];
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
const SEED_VERSION = 3;

const globalForDemo = globalThis as unknown as {
  __ccDemoStore?: DemoStore;
};

function seed(): DemoStore {
  return {
    seedVersion: SEED_VERSION,
    currentMember: AUTHORS[0],
    companies: [...COMPANIES],
    experiences: [...EXPERIENCES],
    contacts: [...CONTACTS],
    offers: [...JOB_OFFERS],
  };
}

if (globalForDemo.__ccDemoStore?.seedVersion !== SEED_VERSION) {
  globalForDemo.__ccDemoStore = seed();
}

export const demoStore = globalForDemo.__ccDemoStore;
