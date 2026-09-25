import { expect, test as base, type Page } from "@playwright/test";

/**
 * Ce que tous les tests partagent.
 *
 * `problems` est vérifié à la fin de **chaque** test, sans que le test y pense :
 * une erreur de console ou une exception de page — une violation de CSP,
 * une erreur d'hydratation — fait échouer le test même si son parcours a
 * abouti. Un test qui attend une erreur (une 404, par exemple) vide le tableau.
 *
 * Les `requestfailed` ne sont pas comptés : Next préchauffe les liens visibles
 * (`?_rsc=`) et Chromium les abandonne à la navigation, sans que rien soit
 * cassé.
 */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => problems.push(`exception: ${error.message}`));

      await use(problems);

      expect(problems, "erreurs de console ou de page").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Ouvre une page en écartant l'avis sur les cookies, qui recouvre le bas de
 * l'écran et intercepterait des clics qui ne le concernent pas. L'avis a son
 * propre test (`legal.spec.ts`).
 */
export async function visit(page: Page, path: string) {
  await page.goto(path);
  const notice = page.getByRole("button", { name: "J'ai compris" });
  if (await notice.isVisible()) await notice.click();
}
