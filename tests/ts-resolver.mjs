/**
 * Hook de résolution pour `node --test`.
 *
 * Le code applicatif importe sans extension (`./labels`), ce que le bundler
 * Next résout mais pas Node en ESM. Plutôt que d'ajouter un lanceur de tests
 * avec toute sa configuration, on apprend à Node à retrouver le fichier `.ts`.
 * Les tests s'exécutent ainsi sur le code réel, sans transformation ni copie.
 */
import { register } from "node:module";

register("./ts-resolver-hooks.mjs", import.meta.url);
