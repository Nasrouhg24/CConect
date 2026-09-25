// Voir ts-resolver-hooks.mjs : remplace `next/cache` sous `node --test`.
//
// Le vrai `revalidatePath` exige une requête en cours. Ici on consigne les
// chemins demandés, pour que les tests d'actions puissent dire lesquels.
const revalidated = (globalThis.__ccRevalidated ??= []);

export function revalidatePath(path, type) {
  revalidated.push(type ? `${path} [${type}]` : path);
}

export function revalidateTag() {}
