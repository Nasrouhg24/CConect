import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContactWrite,
  createContact,
  deleteContact,
  getCompanies,
  getCareerProfile,
  getContacts,
  getCurrentMember,
  getMemberById,
  getPolicyAcceptance,
  isDemoMode,
  recordPolicyAcceptance,
  updateCareerProfile,
  updateContact,
} from "../src/lib/repository.ts";

/**
 * `repository.ts` en mode démo — l'interface publique, sans base.
 *
 * Aucune variable Supabase n'est posée ici : c'est le mode que voit un nouveau
 * contributeur après `npm install && npm run dev`. Les valeurs attendues sont
 * des littéraux du jeu de démonstration, pas un recalcul de ce que fait le code.
 */

test("sans Supabase configuré, le repository sert le jeu de démonstration", async () => {
  // Si cette assertion échoue, l'environnement de test est configuré pour un
  // vrai Supabase et tout ce qui suit lirait autre chose que la démo.
  assert.equal(isDemoMode, true);

  const names = (await getCompanies()).map((company) => company.name);
  assert.ok(names.includes("Microsoft"));
});

/** Un contact valide chez Microsoft, à Paris — identifiants du jeu de démo. */
async function validContact(overrides: Partial<ContactWrite> = {}): Promise<ContactWrite> {
  const microsoft = (await getCompanies()).find((c) => c.slug === "microsoft");
  assert.ok(microsoft, "Microsoft doit exister dans le jeu de démo");
  return {
    companyId: microsoft.id,
    placeId: "p-paris",
    domain: "cybersecurity",
    firstName: "Camille",
    lastName: "Durand",
    position: "Ingénieure sécurité",
    linkedinUrl: null,
    notes: null,
    ...overrides,
  };
}

test("un contact créé se relit par getContacts, rattaché à son auteur", async () => {
  const author = await getCurrentMember();
  assert.ok(author);

  const created = await createContact(await validContact(), author);

  const found = (await getContacts()).find((c) => c.id === created.id);
  assert.ok(found, "le contact créé doit être listé");
  assert.equal(found.firstName, "Camille");
  assert.equal(found.author.id, author.id);
  assert.equal(found.company.name, "Microsoft");
  assert.equal(found.place.city, "Paris");
});

test("une entreprise ou une ville inconnue est refusée, et rien n'est stocké", async () => {
  const author = await getCurrentMember();
  assert.ok(author);
  const before = (await getContacts()).length;

  await assert.rejects(
    createContact(await validContact({ companyId: "c-inexistante" }), author),
    /Entreprise inconnue/,
  );
  await assert.rejects(
    createContact(await validContact({ placeId: "p-inexistante" }), author),
    /Ville inconnue/,
  );

  assert.equal((await getContacts()).length, before);
});

test("seul l'auteur modifie son contact ; un autre membre est refusé sans effet", async () => {
  const author = await getCurrentMember();
  const other = await getMemberById("u-salma");
  assert.ok(author && other);
  assert.notEqual(author.id, other.id);

  const created = await createContact(await validContact(), author);

  await assert.rejects(
    updateContact(created.id, await validContact({ position: "Piraté" }), other),
    /autre membre/,
  );
  let stored = (await getContacts()).find((c) => c.id === created.id);
  assert.equal(stored?.position, "Ingénieure sécurité");

  await updateContact(created.id, await validContact({ position: "Directrice sécurité" }), author);
  stored = (await getContacts()).find((c) => c.id === created.id);
  assert.equal(stored?.position, "Directrice sécurité");
});

test("seul l'auteur supprime son contact ; un autre membre est refusé, le contact reste", async () => {
  const author = await getCurrentMember();
  const other = await getMemberById("u-salma");
  assert.ok(author && other);

  const created = await createContact(await validContact(), author);

  await assert.rejects(deleteContact(created.id, other), /non supprimable/);
  assert.ok((await getContacts()).some((c) => c.id === created.id));

  await deleteContact(created.id, author);
  assert.ok(!(await getContacts()).some((c) => c.id === created.id));
});

test("le parcours écrit se relit ; les entreprises visées reviennent en slugs", async () => {
  const student = await getMemberById("u-youssef");
  assert.ok(student);
  assert.equal(student.status, "student");
  const microsoft = (await getCompanies()).find((c) => c.slug === "microsoft");
  assert.ok(microsoft);

  await updateCareerProfile(student, {
    status: "student",
    studyYear: "final",
    openToMentoring: null,
    targetDomain: "cybersecurity",
    targetRole: "Ingénieur sécurité",
    skills: ["Rust"],
    targetCountries: ["FR"],
    targetCompanyIds: [microsoft.id],
  });

  const profile = await getCareerProfile(student);
  assert.equal(profile.targetDomain, "cybersecurity");
  assert.equal(profile.targetRole, "Ingénieur sécurité");
  assert.deepEqual(profile.skills, ["Rust"]);
  assert.deepEqual(profile.targetCountries, ["FR"]);
  assert.deepEqual(profile.targetCompanies, ["microsoft"]);
  assert.equal(profile.member.studyYear, "final");
});

test("un alumni n'a pas d'année d'études, même si on lui en fournit une", async () => {
  const alumni = await getMemberById("u-salma");
  assert.ok(alumni);
  assert.equal(alumni.status, "alumni");

  await updateCareerProfile(alumni, {
    status: "alumni",
    studyYear: "final",
    openToMentoring: true,
    targetDomain: null,
    targetRole: null,
    skills: [],
    targetCountries: [],
    targetCompanyIds: [],
  });

  assert.equal((await getCareerProfile(alumni)).member.studyYear, null);
});

test("le membre de démo n'a rien accepté au départ ; l'acceptation se relit ensuite", async () => {
  const member = await getCurrentMember();
  assert.ok(member);

  assert.deepEqual(await getPolicyAcceptance(member.id), { version: null, acceptedAt: null });

  await recordPolicyAcceptance("2026-09-21");

  const after = await getPolicyAcceptance(member.id);
  assert.equal(after.version, "2026-09-21");
  assert.ok(after.acceptedAt && !Number.isNaN(Date.parse(after.acceptedAt)));
});
