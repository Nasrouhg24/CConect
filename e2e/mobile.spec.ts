import { devices } from "@playwright/test";
import { expect, test, visit } from "./fixtures";

/**
 * Sur téléphone, le panneau de ville devient une feuille basse : le même
 * contenu réagencé, pas une colonne rétrécie (docs/ARCHITECTURE.md).
 */
test.use({ ...devices["Pixel 7"] });

test("la carte tient dans l'écran et la feuille basse s'ouvre au toucher", async ({ page }) => {
  await visit(page, "/network");
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();

  // Pas de défilement horizontal : rien ne dépasse de la largeur de l'écran.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const markers = page.locator("main svg g.cursor-pointer");
  await expect(markers.first()).toBeVisible();
  const centres: { x: number; y: number }[] = [];
  for (const marker of await markers.all()) {
    const box = await marker.boundingBox();
    if (box) centres.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }
  centres.sort((a, b) => a.x - b.x);
  await page.touchscreen.tap(centres[0].x, centres[0].y);

  const sheet = page.getByRole("complementary", { name: /^Détail de / });
  await expect(sheet).toBeVisible();

  // « Visible » est vrai dès le début de l'animation d'entrée : on attend que la
  // feuille ait fini de glisser avant de mesurer où elle se pose.
  const { width, height } = viewport!;
  await expect
    .poll(async () => {
      const box = await sheet.boundingBox();
      if (!box) return "absente";
      const inside = box.x >= 0 && box.x + box.width <= width + 0.5;
      const wide = box.width > width * 0.85;
      const docked = box.y + box.height >= height - 1 && box.y > height * 0.2;
      return inside && wide && docked ? "posée en bas" : "en mouvement ou mal placée";
    })
    .toBe("posée en bas");
});
