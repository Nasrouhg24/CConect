import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { acceptPolicies } from "../src/app/legal/actions.ts";
import { POLICY_VERSION } from "../src/lib/legal.ts";
import { createCompanyProfile } from "../src/app/companies/new/actions.ts";
import { editContact, removeContact } from "../src/app/contacts/actions.ts";
import { editExperience, removeExperience } from "../src/app/experiences/actions.ts";
import { loadPlaceEntries } from "../src/app/network/actions.ts";
import { submitContribution } from "../src/app/contribute/actions.ts";
import { saveCareerProfile, updateContactChannels } from "../src/app/profile/actions.ts";
import {
  getCareerProfile,
  getCompanies,
  getContacts,
  getEntries,
  getCurrentMember,
  getPolicyAcceptance,
} from "../src/lib/repository.ts";

/**
 * Server Actions — `FormData` en entrée, résultat (ou redirection) en sortie.
 *
 * Mode démo, donc sans base : c'est le chemin que prend un nouveau contributeur.
 * Les deux seuls remplaçants sont ceux de Next lui-même. `redirect` n'en a pas
 * besoin — hors requête il lève une erreur `NEXT_REDIRECT` qu'on lit. Pas
 * `revalidatePath`, qui exige une requête en cours : `next-cache-stub.mjs`
 * consigne les chemins invalidés, parce que « quelles pages sont rafraîchies
 * après une écriture » fait partie de ce que promet chaque action.
 */

const revalidated = ((globalThis as Record<string, unknown>).__ccRevalidated ??= []) as string[];

beforeEach(() => {
  revalidated.length = 0;
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** Destination d'une redirection levée par l'action, ou échec si elle n'a pas eu lieu. */
async function redirectedTo(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT;")) {
      return digest.split(";")[2];
    }
    throw error;
  }
  throw new Error("l'action n'a redirigé nulle part");
}

test("acceptPolicies : sans case cochée, refus et rien n'est enregistré", async () => {
  const member = await getCurrentMember();
  assert.ok(member);

  const result = await acceptPolicies(null, form({}));

  assert.equal(result.ok, false);
  assert.equal((await getPolicyAcceptance(member.id)).version, null);
  assert.deepEqual(revalidated, []);
});

test("acceptPolicies : la version vient du serveur, jamais du formulaire", async () => {
  const member = await getCurrentMember();
  assert.ok(member);

  const target = await redirectedTo(
    acceptPolicies(null, form({ accept: "on", version: "1999-01-01", next: "/stats" })),
  );

  assert.equal(target, "/stats");
  assert.equal((await getPolicyAcceptance(member.id)).version, POLICY_VERSION);
  assert.deepEqual(revalidated, ["/ [layout]"]);
});

test("acceptPolicies : une destination hors du site est ramenée à /network", async () => {
  for (const hostile of ["//evil.example", "https://evil.example", "javascript:alert(1)"]) {
    const target = await redirectedTo(acceptPolicies(null, form({ accept: "on", next: hostile })));
    assert.equal(target, "/network", hostile);
  }
});

async function microsoftId(): Promise<string> {
  const microsoft = (await getCompanies()).find((c) => c.slug === "microsoft");
  assert.ok(microsoft);
  return microsoft.id;
}

test("submitContribution : un contact valide est publié, rattaché au membre de la session", async () => {
  const member = await getCurrentMember();
  assert.ok(member);

  const result = await submitContribution(
    null,
    form({
      entryKind: "contact",
      companyId: await microsoftId(),
      placeId: "p-paris",
      domain: "cybersecurity",
      firstName: "Léa",
      lastName: "Martin",
      position: "Responsable sécurité",
      // Un `authorId` glissé dans le formulaire ne doit rien changer.
      authorId: "u-salma",
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.message, "Contact ajouté chez Microsoft.");
  const stored = (await getContacts()).find((c) => c.firstName === "Léa");
  assert.equal(stored?.author.id, member.id);
  assert.ok(revalidated.includes("/network"));
  assert.ok(revalidated.includes("/companies/microsoft"));
});

const validContactFields = async () => ({
  entryKind: "contact",
  companyId: await microsoftId(),
  placeId: "p-paris",
  domain: "cybersecurity",
  firstName: "Inès",
  position: "Ingénieure",
});

test("submitContribution : des champs invalides renvoient les erreurs par champ, sans rien stocker", async () => {
  const before = (await getContacts()).length;

  const result = await submitContribution(
    null,
    form({ ...(await validContactFields()), firstName: "I", domain: "astrologie" }),
  );

  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors?.firstName);
  assert.ok(result.fieldErrors?.domain);
  assert.equal((await getContacts()).length, before);
  assert.deepEqual(revalidated, []);
});

test("submitContribution : une coordonnée privée dans les notes est refusée", async () => {
  const before = (await getContacts()).length;

  for (const notes of ["écris-moi : ines@example.com", "appelle le +212 6 12 34 56 78"]) {
    const result = await submitContribution(null, form({ ...(await validContactFields()), notes }));
    assert.equal(result.ok, false, notes);
    assert.ok(result.fieldErrors?.notes, notes);
  }

  assert.equal((await getContacts()).length, before);
});

test("submitContribution : un nom d'entreprise neuf crée la fiche, une variante du même nom la retrouve", async () => {
  const withoutCompany = Object.fromEntries(
    Object.entries(await validContactFields()).filter(([key]) => key !== "companyId"),
  );
  const before = (await getCompanies()).length;

  const first = await submitContribution(
    null,
    form({ ...withoutCompany, newCompanyName: "Zorglub Systems" }),
  );
  assert.equal(first.ok, true);
  assert.equal(first.createdCompany, "Zorglub Systems");
  assert.equal((await getCompanies()).length, before + 1);

  // « Corp. » est un suffixe juridique : même nom canonique, donc même fiche.
  const second = await submitContribution(
    null,
    form({ ...withoutCompany, newCompanyName: "Zorglub Systems Corp." }),
  );
  assert.equal(second.ok, true);
  assert.equal(second.createdCompany, undefined);
  assert.equal((await getCompanies()).length, before + 1);
});

async function googleId(): Promise<string> {
  const google = (await getCompanies()).find((c) => c.slug === "google");
  assert.ok(google);
  return google.id;
}

test("editContact / removeContact : le contact d'un autre membre est refusé et reste intact", async () => {
  const before = (await getContacts()).find((c) => c.id === "k-2");
  assert.ok(before);
  const member = await getCurrentMember();
  assert.notEqual(before.author.id, member?.id, "k-2 doit appartenir à quelqu'un d'autre");

  const edited = await editContact(
    null,
    form({
      contactId: "k-2",
      companyId: await microsoftId(),
      placeId: "p-paris",
      domain: "cybersecurity",
      firstName: "Piraté",
      position: "Piraté",
    }),
  );
  const removed = await removeContact(null, form({ contactId: "k-2" }));

  assert.equal(edited.ok, false);
  assert.equal(removed.ok, false);
  const after = (await getContacts()).find((c) => c.id === "k-2");
  assert.equal(after?.firstName, before.firstName);
  assert.equal(after?.company.slug, before.company.slug);
  assert.deepEqual(revalidated, []);
});

test("editContact : déplacer son contact rafraîchit l'ancienne fiche entreprise et la nouvelle", async () => {
  const created = await submitContribution(null, form({ ...(await validContactFields()), firstName: "Nora" }));
  assert.equal(created.ok, true);
  const contact = (await getContacts()).find((c) => c.firstName === "Nora");
  assert.ok(contact);
  revalidated.length = 0;

  const result = await editContact(
    null,
    form({
      contactId: contact.id,
      companyId: await googleId(),
      placeId: "p-paris",
      domain: "cybersecurity",
      firstName: "Nora",
      position: "Ingénieure",
    }),
  );

  assert.equal(result.ok, true);
  assert.equal((await getContacts()).find((c) => c.id === contact.id)?.company.slug, "google");
  assert.ok(revalidated.includes("/companies/google"));
  assert.ok(revalidated.includes("/companies/microsoft"), "l'ancienne fiche doit être rafraîchie");
});

test("removeContact : l'auteur supprime son contact", async () => {
  const contact = (await getContacts()).find((c) => c.firstName === "Nora");
  assert.ok(contact);

  const result = await removeContact(null, form({ contactId: contact.id }));

  assert.equal(result.ok, true);
  assert.ok(!(await getContacts()).some((c) => c.id === contact.id));
  assert.ok(revalidated.includes("/companies/google"));
});

test("createCompanyProfile : une entreprise neuve est créée ; le même nom canonique renvoie la fiche existante", async () => {
  const before = (await getCompanies()).length;

  const created = await createCompanyProfile(null, form({ name: "Quantum Foods", industry: "software" }));
  assert.equal(created.ok, true);
  assert.equal(created.merged, undefined);
  assert.equal((await getCompanies()).length, before + 1);
  assert.ok(created.slug);
  assert.ok(revalidated.includes("/companies"));

  const again = await createCompanyProfile(
    null,
    form({ name: "  quantum foods SAS ", industry: "software" }),
  );
  assert.equal(again.ok, true);
  assert.equal(again.merged, true);
  assert.equal(again.slug, created.slug);
  assert.equal((await getCompanies()).length, before + 1);
});

test("createCompanyProfile : un nom trop court ou un site sans https est refusé champ par champ", async () => {
  const before = (await getCompanies()).length;

  const result = await createCompanyProfile(
    null,
    form({ name: "X", industry: "software", website: "http://exemple.com" }),
  );

  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors?.name);
  assert.ok(result.fieldErrors?.website);
  assert.equal((await getCompanies()).length, before);
});

test("updateContactChannels : enregistre LinkedIn et email du membre, et vide ce qu'on efface", async () => {
  const saved = await updateContactChannels(
    null,
    form({ linkedinUrl: "https://www.linkedin.com/in/ahmed-test", contactEmail: "ahmed@um6p.ma" }),
  );
  assert.equal(saved.ok, true);
  let member = await getCurrentMember();
  assert.equal(member?.linkedinUrl, "https://www.linkedin.com/in/ahmed-test");
  assert.equal(member?.contactEmail, "ahmed@um6p.ma");
  assert.ok(revalidated.includes("/profile"));
  assert.ok(revalidated.includes("/network"));

  const cleared = await updateContactChannels(null, form({ linkedinUrl: "", contactEmail: "" }));
  assert.equal(cleared.ok, true);
  member = await getCurrentMember();
  assert.equal(member?.linkedinUrl, null);
  assert.equal(member?.contactEmail, null);
});

test("updateContactChannels : une URL qui n'est pas LinkedIn ou un email invalide sont refusés, rien ne change", async () => {
  const before = await getCurrentMember();

  for (const fields of [
    { linkedinUrl: "https://evil.example/in/x", contactEmail: "" },
    { linkedinUrl: "", contactEmail: "pas-un-email" },
  ]) {
    const result = await updateContactChannels(null, form(fields));
    assert.equal(result.ok, false, JSON.stringify(fields));
  }

  const after = await getCurrentMember();
  assert.equal(after?.linkedinUrl, before?.linkedinUrl);
  assert.equal(after?.contactEmail, before?.contactEmail);
});

test("saveCareerProfile : une entreprise visée inconnue est refusée ; une connue se relit", async () => {
  const member = await getCurrentMember();
  assert.ok(member);

  const refused = await saveCareerProfile(
    null,
    form({ status: "alumni", targetCompanies: "entreprise-fantome" }),
  );
  assert.equal(refused.ok, false);
  assert.ok(refused.fieldErrors?.targetCompanies);

  const saved = await saveCareerProfile(
    null,
    form({ status: "alumni", targetDomain: "cybersecurity", targetRole: "RSSI", targetCompanies: "microsoft" }),
  );
  assert.equal(saved.ok, true);
  const profile = await getCareerProfile(member);
  assert.equal(profile.targetRole, "RSSI");
  assert.deepEqual(profile.targetCompanies, ["microsoft"]);
});

const experienceFields = async (title: string) => ({
  entryKind: "experience",
  companyId: await microsoftId(),
  placeId: "p-paris",
  domain: "cybersecurity",
  kind: "pfe",
  year: "2024",
  title,
});

const entryTitled = async (title: string) =>
  (await getEntries()).find((e) => e.entryKind === "experience" && e.headline === title);

test("editExperience / removeExperience : l'expérience d'un autre membre est refusée et reste intacte", async () => {
  const before = (await getEntries()).find((e) => e.id === "e-2");
  assert.ok(before, "e-2 doit exister dans le jeu de démo");

  const edited = await editExperience(
    null,
    form({ experienceId: "e-2", ...(await experienceFields("Titre piraté")) }),
  );
  const removed = await removeExperience(null, form({ experienceId: "e-2", companySlug: "google" }));

  assert.equal(edited.ok, false);
  assert.equal(removed.ok, false);
  assert.equal((await getEntries()).find((e) => e.id === "e-2")?.headline, before.headline);
  assert.deepEqual(revalidated, []);
});

test("editExperience / removeExperience : l'auteur modifie puis supprime la sienne", async () => {
  const created = await submitContribution(null, form(await experienceFields("Stage sécurité cloud")));
  assert.equal(created.ok, true);
  const entry = await entryTitled("Stage sécurité cloud");
  assert.ok(entry);

  const edited = await editExperience(
    null,
    form({ experienceId: entry.id, ...(await experienceFields("Stage sécurité cloud (révisé)")) }),
  );
  assert.equal(edited.ok, true);
  assert.equal((await entryTitled("Stage sécurité cloud (révisé)"))?.id, entry.id);

  const removed = await removeExperience(null, form({ experienceId: entry.id, companySlug: "microsoft" }));
  assert.equal(removed.ok, true);
  assert.equal(await entryTitled("Stage sécurité cloud (révisé)"), undefined);
});

test("loadPlaceEntries : ne renvoie que la ville demandée, les filtres valides restreignent, les invalides sont ignorés", async () => {
  const all = await loadPlaceEntries("p-paris", {});
  assert.ok(all.length > 0);
  assert.ok(all.every((e) => e.place.id === "p-paris"));

  const cyber = await loadPlaceEntries("p-paris", { domain: "cybersecurity" });
  assert.ok(cyber.length > 0);
  assert.ok(cyber.every((e) => e.domain === "cybersecurity"));

  // Une saisie hostile ne fait ni échouer ni restreindre : le filtre est ignoré.
  const hostile = await loadPlaceEntries("p-paris", { domain: "'; drop table--", year: "abc" });
  assert.equal(hostile.length, all.length);
});

test("submitContribution : le plafond d'écritures est appliqué, avec le délai d'attente", async () => {
  let refusedAt = -1;
  let message = "";

  for (let i = 0; i < 20 && refusedAt === -1; i++) {
    const result = await submitContribution(null, form({ ...(await validContactFields()), firstName: `Rafale${i}` }));
    if (!result.ok) {
      refusedAt = i;
      message = result.message;
    }
  }

  assert.notEqual(refusedAt, -1, "aucun refus en 20 écritures d'affilée");
  assert.match(message, /Trop de publications d'affilée\. Réessaie dans \d+ secondes?\./);
  assert.equal((await getContacts()).some((c) => c.firstName === `Rafale${refusedAt}`), false);
});
