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
