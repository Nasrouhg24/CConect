import { expect, test, visit } from "./fixtures";

/**
 * Les promesses publiées par le produit, vérifiées dans un navigateur : un seul
 * cookie nécessaire pour l'avis, aucun tiers contacté, un consentement qu'on
 * ne peut pas donner sans le vouloir.
 */
test("l'avis sur les cookies se ferme une fois, et ne pose que le cookie nécessaire", async ({ page, context }) => {
  await page.goto("/network");
  const notice = page.getByRole("region", { name: "Information sur les cookies" });
  await expect(notice).toBeVisible();
  expect(await context.cookies()).toEqual([]);

  await notice.getByRole("button", { name: "J'ai compris" }).click();
  await expect(notice).toBeHidden();
  expect((await context.cookies()).map((cookie) => cookie.name)).toEqual(["cc_legal_notice"]);

  await page.reload();
  await expect(notice).toBeHidden();
});

test("aucune requête ne part vers un tiers depuis les écrans principaux", async ({ page }) => {
  const origins = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http")) origins.add(url.origin);
  });

  for (const path of ["/network", "/companies", "/companies/microsoft", "/stats", "/legal/cookies"]) {
    await visit(page, path);
    await page.waitForLoadState("networkidle");
  }

  expect([...origins]).toEqual(["http://localhost:3100"]);
});

/**
 * L'acceptation est à usage unique par serveur : une fois donnée, l'écran
 * renvoie ailleurs (`accepter/page.tsx`). Un seul test la donne donc, avec la
 * destination qui compte le plus — celle qu'un lien piégé pourrait détourner.
 * La destination légitime (`?next=/stats`) est vérifiée sur l'action elle-même
 * dans `tests/actions.test.ts`.
 */
test("l'acceptation exige la case, et une destination hors du site est ignorée", async ({ page }) => {
  await visit(page, "/legal/accepter?next=//exemple.org");
  test.skip(
    !page.url().includes("/legal/accepter"),
    "politique déjà acceptée sur ce serveur : relancer le serveur pour rejouer ce test",
  );

  const checkbox = page.getByRole("checkbox", { name: /J'ai lu et j'accepte/ });
  await expect(checkbox).not.toBeChecked();

  // Sans case cochée, le navigateur refuse l'envoi : on reste sur l'écran.
  await page.getByRole("button", { name: "Accepter et continuer" }).click();
  await expect(page).toHaveURL(/\/legal\/accepter/);
  expect(await checkbox.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);

  await checkbox.check();
  await page.getByRole("button", { name: "Accepter et continuer" }).click();

  await expect(page).toHaveURL("/network");
});
