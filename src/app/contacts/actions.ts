"use server";

import { revalidatePath } from "next/cache";
import {
  deleteContact,
  getCompanies,
  getContacts,
  getCurrentMember,
  updateContact,
} from "@/lib/repository";
import { contactInputSchema, findPrivateContactDetails } from "@/lib/validation";

export interface ContactMutationResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Modification d'un contact, y compris son rattachement à une autre entreprise.
 *
 * L'entreprise cible est toujours une fiche existante : ce chemin ne crée
 * jamais d'entreprise, pour qu'une correction ne puisse pas fabriquer un
 * doublon par inadvertance.
 */
export async function editContact(
  _prev: ContactMutationResult | null,
  formData: FormData,
): Promise<ContactMutationResult> {
  const id = String(formData.get("contactId") ?? "");
  if (!id) return { ok: false, message: "Contact manquant." };

  const parsed = contactInputSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    entryKind: "contact",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    }
    return { ok: false, message: "Champs invalides.", fieldErrors };
  }

  const input = parsed.data;
  const leak = findPrivateContactDetails(
    `${input.notes ?? ""} ${input.firstName} ${input.lastName ?? ""}`,
  );
  if (leak) {
    return {
      ok: false,
      message: `Retire ${leak} : aucune coordonnée privée n'est publiée.`,
      fieldErrors: { notes: `Contient ${leak}` },
    };
  }

  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée." };

  if (!input.companyId) {
    return {
      ok: false,
      message: "Choisis une entreprise existante.",
      fieldErrors: { companyId: "Entreprise requise" },
    };
  }

  const companies = await getCompanies();
  const company = companies.find((c) => c.id === input.companyId);
  if (!company) {
    return {
      ok: false,
      message: "Entreprise inconnue.",
      fieldErrors: { companyId: "Entreprise inconnue" },
    };
  }

  // On mémorise l'ancienne entreprise pour rafraîchir sa page aussi : sinon
  // le contact resterait visible sur une fiche qu'il a quittée.
  const previous = (await getContacts()).find((c) => c.id === id);

  try {
    await updateContact(
      id,
      {
        companyId: company.id,
        placeId: input.placeId,
        domain: input.domain,
        firstName: input.firstName,
        lastName: input.lastName?.trim() || null,
        position: input.position,
        linkedinUrl: input.linkedinUrl?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      member,
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Modification impossible.",
    };
  }

  revalidatePath("/network");
  revalidatePath("/companies");
  revalidatePath(`/companies/${company.slug}`);
  if (previous && previous.company.slug !== company.slug) {
    revalidatePath(`/companies/${previous.company.slug}`);
  }
  revalidatePath("/profile");

  return { ok: true, message: `Contact mis à jour chez ${company.name}.` };
}

export async function removeContact(
  _prev: ContactMutationResult | null,
  formData: FormData,
): Promise<ContactMutationResult> {
  const id = String(formData.get("contactId") ?? "");
  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée." };

  const existing = (await getContacts()).find((c) => c.id === id);

  try {
    await deleteContact(id, member);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Suppression impossible.",
    };
  }

  revalidatePath("/network");
  revalidatePath("/companies");
  if (existing) revalidatePath(`/companies/${existing.company.slug}`);
  revalidatePath("/profile");

  return { ok: true, message: "Contact supprimé." };
}
