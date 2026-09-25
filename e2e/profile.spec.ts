import { expect, test, visit } from "./fixtures";

/**
 * Le profil du membre : ses canaux de contact et son parcours.
 *
 * Ces écritures changent le membre de démonstration, partagé par tous les
 * tests du serveur : chaque test remet ce qu'il a changé.
 */
const ORIGINAL_LINKEDIN = "https://www.linkedin.com/in/example-ahmed";

async function openChannelsEditor(page: import("@playwright/test").Page) {
  await visit(page, "/profile");
  await page.getByRole("button", { name: "Modifier" }).click();
  return {
    linkedin: page.getByRole("textbox", { name: /^Profil LinkedIn/ }),
    save: page.getByRole("button", { name: "Enregistrer" }).last(),
  };
}

test("le LinkedIn du membre s'enregistre et survit au rechargement", async ({ page }) => {
  const { linkedin, save } = await openChannelsEditor(page);

  await linkedin.fill("https://www.linkedin.com/in/ahmed-e2e");
  await save.click();
  await expect(page.getByText("Profil mis à jour.")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(linkedin).toHaveValue("https://www.linkedin.com/in/ahmed-e2e");

  // On remet la valeur d'origine.
  await linkedin.fill(ORIGINAL_LINKEDIN);
  await save.click();
  await expect(page.getByText("Profil mis à jour.")).toBeVisible();
});

test("une URL qui n'est pas LinkedIn est refusée, la valeur reste inchangée", async ({ page }) => {
  const { linkedin, save } = await openChannelsEditor(page);

  await linkedin.fill("https://exemple.org/moi");
  await save.click();
  await expect(page.getByText("Profil mis à jour.")).toHaveCount(0);

  await page.reload();
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(linkedin).toHaveValue(ORIGINAL_LINKEDIN);
});

test("le poste visé du parcours s'enregistre et survit au rechargement", async ({ page }) => {
  await visit(page, "/profile");
  const role = page.getByRole("textbox", { name: "Poste visé" });

  await role.fill("Ingénieur e2e");
  await page.getByRole("button", { name: "Enregistrer" }).first().click();
  await expect(page.getByText("Parcours mis à jour.")).toBeVisible();

  await page.reload();
  await expect(role).toHaveValue("Ingénieur e2e");

  await role.fill("");
  await page.getByRole("button", { name: "Enregistrer" }).first().click();
  await expect(page.getByText("Parcours mis à jour.")).toBeVisible();
});
