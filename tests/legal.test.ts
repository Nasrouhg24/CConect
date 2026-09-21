import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  ESSENTIAL_COOKIES,
  LEGAL_PAGES,
  NOTICE_COOKIE,
  POLICY_VERSION,
  PROCESSING_REGISTER,
} from "../src/lib/legal.ts";

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const read = (path: string) => readFileSync(root(path), "utf8");

/**
 * Ce que ces tests protègent n'est pas du code : c'est l'exactitude d'une
 * promesse publiée. Une politique de cookies qui oublie un cookie, ou un
 * traceur ajouté sans que le bandeau change de nature, sont des manquements —
 * pas des régressions d'interface.
 */

test("la version des politiques est une date ISO", () => {
  assert.match(POLICY_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  // La base applique la même contrainte : les deux doivent rester d'accord.
  assert.match(read("supabase/migrations/0010_consent.sql"), /\\d\{4\}-\\d\{2\}-\\d\{2\}/);
});

test("l'inventaire des cookies ne contient que du strictement nécessaire", () => {
  assert.equal(ESSENTIAL_COOKIES.length, 3);
  for (const cookie of ESSENTIAL_COOKIES) {
    assert.equal(cookie.party, "first", `${cookie.name} : aucun cookie tiers n'est admis`);
    assert.ok(cookie.purpose.length > 20, `${cookie.name} : rôle à décrire`);
    assert.ok(cookie.duration.length > 0, `${cookie.name} : durée à indiquer`);
  }
  assert.ok(ESSENTIAL_COOKIES.some((c) => c.name === NOTICE_COOKIE));
});

test("aucun cookie posé par l'application n'échappe à l'inventaire", () => {
  // Les deux seuls endroits qui écrivent un cookie : le client Supabase (jeton
  // de session et vérificateur PKCE, nommés par la bibliothèque) et le bandeau
  // d'information. Un troisième écrivain doit être inventorié, donc déclaré ici.
  const notice = read("src/components/legal/CookieNotice.tsx");
  assert.match(notice, /document\.cookie = `\$\{NOTICE_COOKIE\}/);
  assert.match(notice, /SameSite=Lax/);
  assert.match(notice, /Secure/);

  const writers = [
    "src/components/legal/CookieNotice.tsx",
    "src/proxy.ts",
    "src/lib/supabase/server.ts",
    "src/lib/supabase/client.ts",
    "src/lib/supabase/cookie-options.ts",
  ];
  for (const file of writers) {
    const source = read(file);
    const inline = source.match(/document\.cookie\s*=/g) ?? [];
    assert.ok(
      inline.length <= (file.endsWith("CookieNotice.tsx") ? 1 : 0),
      `${file} pose un cookie non inventorié`,
    );
  }
});

test("aucune mesure d'audience n'est chargée", () => {
  const trackers = /googletagmanager|google-analytics|gtag\(|plausible|matomo|segment\.com|hotjar|facebook\.net/i;
  for (const file of ["src/app/layout.tsx", "src/lib/csp.ts", "package.json"]) {
    assert.doesNotMatch(read(file), trackers, `${file} : traceur détecté`);
  }
});

test("le registre des traitements est complet ligne à ligne", () => {
  assert.ok(PROCESSING_REGISTER.length >= 5);
  for (const entry of PROCESSING_REGISTER) {
    for (const [field, value] of Object.entries(entry)) {
      assert.ok(value.trim().length > 0, `${entry.data} : ${field} vide`);
    }
  }
});

test("chaque page légale annoncée existe", () => {
  for (const page of LEGAL_PAGES) {
    assert.doesNotThrow(
      () => read(`src/app${page.href}/page.tsx`),
      `${page.href} est listée mais n'existe pas`,
    );
  }
});

test("les pages légales restent accessibles sans session", () => {
  // Elles ne sont pas dans la liste des chemins protégés du proxy : sinon un
  // membre à qui l'on demande d'accepter ne pourrait pas lire ce qu'il accepte.
  const proxy = read("src/proxy.ts");
  const protectedList = proxy.slice(proxy.indexOf("const PROTECTED"), proxy.indexOf("];"));
  assert.doesNotMatch(protectedList, /"\/legal/);
});

test("le blocage est appliqué par le proxy, pas par la coquille", () => {
  // Un layout racine n'est pas re-rendu lors d'une navigation côté client : un
  // blocage posé là laisserait passer le premier lien cliqué. Le proxy, lui,
  // voit chaque requête — navigations douces et Server Actions comprises.
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /policy_version/);
  assert.match(proxy, /POLICY_VERSION/);
  assert.match(proxy, /CONSENT_PATH/);

  const layout = read("src/app/layout.tsx");
  assert.doesNotMatch(layout, /ConsentGate/);
});

test("le retour après acceptation ne peut pas viser un autre site", () => {
  // `?next=` vient de l'URL : sans filtre, l'écran d'acceptation deviendrait un
  // tremplin de redirection ouverte. Le tamis est posé deux fois — la page qui
  // rend le formulaire, et la Server Action qui reçoit l'envoi.
  for (const file of ["src/app/legal/accepter/page.tsx", "src/app/legal/actions.ts"]) {
    const source = read(file);
    assert.match(source, /startsWith\("\/"\)/, `${file} : chemin interne non vérifié`);
    assert.match(source, /startsWith\("\/\/"\)/, `${file} : "//" non refusé`);
  }
});

test("le consentement ne peut pas être présumé", () => {
  // Une case pré-cochée ne vaut pas consentement (RGPD art. 4.11) : ni le
  // formulaire d'inscription ni l'écran de blocage ne doivent la pré-cocher.
  for (const file of [
    "src/components/OnboardingForm.tsx",
    "src/components/legal/ConsentGate.tsx",
  ]) {
    const source = read(file);
    const checkbox = source.slice(source.indexOf('type="checkbox"'));
    assert.doesNotMatch(
      checkbox.slice(0, 400),
      /defaultChecked|checked=\{true\}/,
      `${file} : case pré-cochée`,
    );
    assert.match(checkbox.slice(0, 400), /required/, `${file} : case non obligatoire`);
  }

  // La version acceptée est prise côté serveur, jamais reçue du formulaire.
  const action = read("src/app/legal/actions.ts");
  assert.doesNotMatch(action, /formData\.get\("(version|policyVersion)"\)/);
  assert.match(action, /POLICY_VERSION/);
});
