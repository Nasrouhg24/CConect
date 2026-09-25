/**
 * Ajoute l'extension `.ts` (ou `/index.ts`) aux imports relatifs qui n'en ont
 * pas, et résout l'alias `@/` vers `src/`. C'est exactement ce que fait le
 * bundler ; on le reproduit ici pour que les tests lisent le code de
 * production tel quel.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const SRC = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;

  // `server-only` lève à l'import hors d'un bundle serveur, précisément pour
  // empêcher qu'un module de données parte au navigateur. Ici il n'y a pas de
  // navigateur : on le remplace par un module vide.
  if (target === "server-only") {
    return nextResolve(new URL("./server-only-stub.mjs", import.meta.url).href, context);
  }

  // `revalidatePath` exige une requête en cours ; le remplaçant consigne les appels.
  if (target === "next/cache") {
    return nextResolve(new URL("./next-cache-stub.mjs", import.meta.url).href, context);
  }

  // Le bundler résout `next/headers` ; Node en ESM veut l'extension.
  if (target.startsWith("next/") && !/\.[cm]?[jt]sx?$/.test(target)) {
    return nextResolve(`${target}.js`, context);
  }

  if (target.startsWith("@/")) {
    target = new URL(target.slice(2), SRC).href;
  }

  const relative =
    target.startsWith("./") || target.startsWith("../") || target.startsWith("file:");

  if (relative && !/\.[cm]?[jt]sx?$/.test(target)) {
    const base = target.startsWith("file:")
      ? new URL(target)
      : new URL(target, context.parentURL);

    for (const candidate of [`${base.href}.ts`, `${base.href}/index.ts`]) {
      if (existsSync(fileURLToPath(candidate))) {
        return nextResolve(candidate, context);
      }
    }
  }

  return nextResolve(target, context);
}
