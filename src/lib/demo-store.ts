import "server-only";

import { AUTHORS } from "./data/seed";
import type { Author, Company, Contact, Experience, JobOffer } from "./types";

/**
 * Stockage en mémoire du mode démo.
 *
 * Il rend le parcours complet testable sans base de données : ce qu'on ajoute
 * via l'application apparaît immédiatement, puis disparaît au redémarrage du
 * serveur. Ce n'est volontairement pas une persistance — la vraie base est
 * Supabase, et le repository parle aux deux de la même façon.
 */
interface DemoStore {
  currentMember: Author;
  companies: Company[];
  experiences: Experience[];
  contacts: Contact[];
  offers: JobOffer[];
}

const globalForDemo = globalThis as unknown as { __ccDemoStore?: DemoStore };

export const demoStore: DemoStore = (globalForDemo.__ccDemoStore ??= {
  currentMember: AUTHORS[0],
  companies: [],
  experiences: [],
  contacts: [],
  offers: [],
});
