import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout — un vrai navigateur devant l'application construite.
 *
 * Le serveur est le build de production (`next build` puis `next start`), pas
 * `next dev` : la CSP à nonce et l'hydratation ne se comportent pas pareil, et
 * c'est en production qu'un script bloqué rend l'application morte.
 *
 * Aucune variable d'environnement : mode démo, données fictives en mémoire. Le
 * store vivant dans le processus du serveur, les tests tournent l'un après
 * l'autre (`workers: 1`) et ne supposent rien de l'état laissé par un autre.
 *
 * En local, un serveur déjà lancé sur ce port est réutilisé — attention : c'est
 * alors son build qui est testé, pas le code courant.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "fr-FR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/network`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
