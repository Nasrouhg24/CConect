import type { Page } from "@playwright/test";
import { expect, test, visit } from "./fixtures";

/**
 * Publier un contact : l'assistant en trois temps, jusqu'à la fiche entreprise.
 *
 * Le serveur (et son store en mémoire) survit d'un test, voire d'une exécution,
 * à l'autre : chaque prénom est donc unique, pour qu'on ne retrouve jamais la
 * contribution d'un passage précédent.
 */
const uniqueName = () => `Test${Date.now().toString(36)}`;

/** Les cartes de choix cachent leur `<input>` (sr-only) : on clique la carte, comme un utilisateur. */
async function startContact(page: Page) {
  await visit(page, "/contribute");
  await page.getByText("Je connais quelqu'un").click();
  await page.getByRole("button", { name: "Continuer" }).click();
}

async function fillContact(page: Page, firstName: string, notes = "") {
  await page.getByRole("combobox", { name: "Entreprise" }).fill("Micro");
  await page.getByRole("option", { name: /Microsoft/ }).first().click();
  await page.locator('select[name="placeId"]').selectOption({ label: "Paris, France" });
  await page.locator('select[name="domain"]').selectOption({ label: "Cybersecurity" });
  await page.getByPlaceholder("Sarah").fill(firstName);
  await page.getByPlaceholder("Cybersecurity Recruiter").fill("Responsable SOC");
  if (notes) await page.getByPlaceholder("Ancien encadrant, rencontré en conférence…").fill(notes);
}

test("un contact publié apparaît sur la fiche de son entreprise", async ({ page }) => {
  const firstName = uniqueName();
  await startContact(page);

  await fillContact(page, firstName);
  await page.getByRole("button", { name: "Publier" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Contact ajouté chez Microsoft." }),
  ).toBeVisible();

  await page.goto("/companies/microsoft");
  await expect(page.getByText(firstName)).toBeVisible();
});

test("une adresse email dans les notes est refusée, rien n'est publié", async ({ page }) => {
  const firstName = uniqueName();
  await startContact(page);

  await fillContact(page, firstName, "écris-lui à sarah.martin@example.com");
  await page.getByRole("button", { name: "Publier" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "adresse email" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /Contact ajouté/ })).toHaveCount(0);

  await page.goto("/companies/microsoft");
  await expect(page.getByText(firstName)).toHaveCount(0);
});

test("les champs obligatoires bloquent la publication", async ({ page }) => {
  await startContact(page);

  await page.getByRole("button", { name: "Publier" }).click();

  await expect(page.getByRole("heading", { level: 1, name: /Contact ajouté/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publier" })).toBeVisible();
});
