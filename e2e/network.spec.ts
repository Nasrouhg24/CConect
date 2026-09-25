import type { Page } from "@playwright/test";
import { expect, test, visit } from "./fixtures";

/**
 * L'écran principal : la carte, le panneau de ville, la recherche, les filtres.
 *
 * Les marqueurs sont des groupes SVG sans nom accessible : on les repère par
 * leur classe et on clique à l'écran, à la position réelle, comme le fait un
 * utilisateur — pas sur un nœud forcé. Au zoom initial, des marqueurs
 * européens se recouvrent ; on prend donc le plus à gauche, qui est isolé.
 */
const markers = (page: Page) => page.locator("main svg g.cursor-pointer");

async function leftmostMarker(page: Page) {
  await expect(markers(page).first()).toBeVisible();
  const centres: { x: number; y: number }[] = [];
  for (const marker of await markers(page).all()) {
    const box = await marker.boundingBox();
    if (box) centres.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }
  centres.sort((a, b) => a.x - b.x);
  return centres[0];
}

test("la carte affiche des villes, et le survol dit ce qu'elles contiennent", async ({ page }) => {
  await visit(page, "/network");

  await expect(page.getByRole("application", { name: /Carte du réseau CConnect/ })).toBeVisible();
  expect(await markers(page).count()).toBeGreaterThan(5);

  const { x, y } = await leftmostMarker(page);
  await page.mouse.move(x, y);
  await expect(page.getByText(/\d+ exp\. · \d+ contacts?/)).toBeVisible();
});

test("un clic sur une ville ouvre son panneau, qui se ferme", async ({ page }) => {
  await visit(page, "/network");

  const { x, y } = await leftmostMarker(page);
  await page.mouse.click(x, y);

  const panel = page.getByRole("complementary", { name: /^Détail de / });
  await expect(panel).toBeVisible();
  const city = (await panel.getByRole("heading", { level: 2 }).textContent())?.trim();
  expect(city).toBeTruthy();
  await expect(panel).toHaveAccessibleName(`Détail de ${city}`);
  await expect(panel.getByRole("heading", { level: 3, name: /^Contributions · \d+$/ })).toBeVisible();
  await expect(panel.getByRole("link", { name: /^Microsoft/ })).toHaveAttribute(
    "href",
    "/companies/microsoft",
  );

  await panel.getByRole("button", { name: "Fermer le panneau" }).click();
  await expect(panel).toBeHidden();
});

test("au clavier : parcourir les villes puis Entrée ouvre le panneau", async ({ page }) => {
  await visit(page, "/network");
  await expect(markers(page).first()).toBeVisible();

  const browse = page.getByRole("button", { name: "Parcourir les villes du réseau au clavier" });
  await browse.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("complementary", { name: /^Détail de / })).toBeVisible();
});

test("le zoom change l'échelle, et « Recentrer » la rétablit", async ({ page }) => {
  await visit(page, "/network");
  const scale = page.getByText(/^\d+\.\d×$/);
  const zoomOut = page.getByRole("button", { name: "Zoom arrière" });
  const recenter = page.getByRole("button", { name: "Recentrer la carte" });

  await expect(scale).toHaveText("1.0×");
  await expect(zoomOut).toBeDisabled();
  await expect(recenter).toBeDisabled();

  await page.getByRole("button", { name: "Zoom avant" }).click();
  await expect(scale).not.toHaveText("1.0×");
  await expect(zoomOut).toBeEnabled();

  await recenter.click();
  await expect(scale).toHaveText("1.0×");
});

test("la recherche propose une entreprise ; la choisir filtre, et « Tout effacer » défiltre", async ({ page }) => {
  await visit(page, "/network");

  await page.getByRole("combobox", { name: "Rechercher dans le réseau" }).fill("Micro");
  await page.getByRole("option", { name: /^Microsoft/ }).click();

  await expect(page).toHaveURL(/\/network\?company=microsoft$/);
  await expect(page.getByRole("button", { name: "Retirer ce filtre" })).toHaveCount(1);

  await page.getByRole("button", { name: "Tout effacer" }).click();
  await expect(page).toHaveURL(/\/network$/);
  await expect(page.getByRole("button", { name: "Retirer ce filtre" })).toHaveCount(0);
});

test("les filtres vivent dans l'URL : ils se partagent et survivent au rechargement", async ({ page }) => {
  await visit(page, "/network");

  await page.getByRole("button", { name: "Filtres", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filtres du réseau" });
  await dialog.getByRole("combobox", { name: "Domaine" }).selectOption({ label: "Cybersecurity" });
  await expect(page).toHaveURL(/domain=cybersecurity/);
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(page).toHaveURL(/domain=cybersecurity/);
  await expect(page.getByRole("button", { name: "Retirer ce filtre" })).toHaveCount(1);
});

test("changer de continent abandonne le pays devenu incompatible", async ({ page }) => {
  await visit(page, "/network?continent=europe&country=FR");

  await page.getByRole("button", { name: /^Filtres/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filtres du réseau" });
  await dialog.getByRole("combobox", { name: "Continent" }).selectOption({ label: "Afrique" });

  await expect(page).toHaveURL(/continent=africa/);
  await expect(page).not.toHaveURL(/country=/);
});
