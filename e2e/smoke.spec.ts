import { expect, test, visit } from "./fixtures";

/**
 * Chaque écran s'ouvre, dit ce qu'il doit dire, et ne lève rien dans la console.
 *
 * C'est le test qui attrape le pire cas : un build dont la CSP bloque les
 * scripts, ou une page qui plante à l'hydratation. Les titres viennent de ce
 * que les pages affichent réellement en mode démo.
 */
// `/legal/accepter` n'y figure pas : une fois la politique acceptée (ce que fait
// `legal.spec.ts`), l'écran renvoie ailleurs. Ce spec-là le couvre, garde de
// console comprise.
const SCREENS: [path: string, heading: string][] = [
  ["/", "Quelqu'un est déjà passé par là."],
  ["/network", "Carte du réseau CConnect"],
  ["/companies", "Entreprises"],
  ["/companies/microsoft", "Microsoft"],
  ["/companies/new", "Ajouter une entreprise"],
  ["/people", "Personnes"],
  ["/people/u-ahmed", "Ahmed B."],
  ["/advisor", "Conseiller"],
  ["/stats", "Des personnes, des entreprises, reliées."],
  ["/terminal", "Terminal CConnect"],
  ["/contribute", "Qu'est-ce que tu ajoutes ?"],
  ["/profile", "Ahmed B."],
  ["/login", "Connexion"],
  ["/legal", "Informations légales"],
  ["/legal/conditions", "Conditions d'utilisation"],
  ["/legal/confidentialite", "Politique de confidentialité"],
  ["/legal/cookies", "Politique de cookies"],
];

for (const [path, heading] of SCREENS) {
  test(`${path} s'affiche et s'hydrate sans erreur`, async ({ page }) => {
    await visit(page, path);

    await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
    // Rien d'autre à vérifier ici : la fixture `problems` fait échouer le test
    // sur toute erreur de console ou d'hydratation, CSP comprise.
  });
}

test("une personne inconnue donne une vraie 404, pas une page vide", async ({ page, problems }) => {
  const response = await page.goto("/people/personne-inconnue");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Cette page n'existe pas" })).toBeVisible();
  // Le navigateur signale lui-même toute réponse 404 comme erreur de chargement.
  problems.length = 0;
});
