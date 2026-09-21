"use server";

import { revalidatePath } from "next/cache";
import { rateLimitMessage } from "@/lib/rate-limit";
import { enforceWriteQuota } from "@/lib/rate-limit-server";
import {
  createContact,
  createExperience,
  findOrCreateCompany,
  getCompanyById,
  getCurrentMember,
} from "@/lib/repository";
import type { Company } from "@/lib/types";
import {
  careerFieldsFromInput,
  contactInputSchema,
  experienceInputSchema,
  findPrivateContactDetails,
} from "@/lib/validation";

export interface ContributionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  /** Renseigné quand la contribution a créé une nouvelle fiche entreprise. */
  createdCompany?: string;
}

function collectErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

function revalidateAll(companySlug?: string) {
  revalidatePath("/");
  revalidatePath("/network");
  revalidatePath("/companies");
  revalidatePath("/stats");
  revalidatePath("/profile");
  revalidatePath("/people");
  revalidatePath("/advisor");
  if (companySlug) revalidatePath(`/companies/${companySlug}`);
}

/**
 * Résout la référence entreprise du formulaire.
 *
 * `companyId` renvoie la fiche choisie ; `newCompanyName` passe par le
 * rapprochement sur nom canonique, qui renvoie une fiche existante plutôt que
 * d'en créer une seconde.
 */
async function resolveCompany(
  input: { companyId?: string; newCompanyName?: string },
  authorId: string,
): Promise<{ company: Company; created: boolean }> {
  if (input.companyId) {
    const existing = await getCompanyById(input.companyId);
    if (existing) return { company: existing, created: false };
  }

  const name = input.newCompanyName?.trim();
  if (!name) throw new Error("Entreprise manquante");

  return findOrCreateCompany(
    {
      name,
      website: null,
      domain: null,
      industry: "other",
      description: null,
      linkedinUrl: null,
      logoUrl: null,
      headquartersId: null,
    },
    authorId,
  );
}

/**
 * Enregistre une expérience ou un contact.
 *
 * L'auteur n'est jamais lu depuis le formulaire : il vient de la session.
 */
export async function submitContribution(
  _prev: ContributionResult | null,
  formData: FormData,
): Promise<ContributionResult> {
  const raw = Object.fromEntries(formData.entries());
  const entryKind = String(raw.entryKind ?? "");

  const schema =
    entryKind === "contact" ? contactInputSchema : experienceInputSchema;

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Certains champs sont incomplets ou invalides.",
      fieldErrors: collectErrors(parsed.error.issues),
    };
  }

  const input = parsed.data;

  // Règle de confidentialité : aucune coordonnée privée dans les champs libres.
  const freeTextField = input.entryKind === "experience" ? "summary" : "notes";
  const freeText =
    input.entryKind === "experience"
      ? (input.summary ?? "")
      : `${input.notes ?? ""} ${input.firstName} ${input.lastName ?? ""}`;

  const leak = findPrivateContactDetails(freeText);
  if (leak) {
    return {
      ok: false,
      message: `Retire ${leak} du texte : la plateforme ne publie aucune coordonnée privée. C'est toi qu'on contactera pour la transmettre.`,
      fieldErrors: { [freeTextField]: `Contient ${leak}` },
    };
  }

  const member = await getCurrentMember();
  if (!member) {
    return { ok: false, message: "Session expirée — reconnecte-toi pour publier." };
  }

  const limit = await enforceWriteQuota("contribute", `contribute:${member.id}`);
  if (!limit.ok) {
    return { ok: false, message: rateLimitMessage(limit.retryAfterSeconds) };
  }

  let company: Company;
  let createdCompany = false;
  try {
    const resolved = await resolveCompany(input, member.id);
    company = resolved.company;
    createdCompany = resolved.created;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Entreprise invalide.",
      fieldErrors: { companyId: "Entreprise invalide" },
    };
  }

  try {
    if (input.entryKind === "experience") {
      await createExperience(
        {
          companyId: company.id,
          placeId: input.placeId,
          domain: input.domain,
          kind: input.kind,
          title: input.title,
          summary: input.summary?.trim() || null,
          ...careerFieldsFromInput(input),
        },
        member,
      );
    } else {
      await createContact(
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
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Enregistrement impossible.",
    };
  }

  revalidateAll(company.slug);

  const label =
    input.entryKind === "experience" ? "Expérience publiée" : "Contact ajouté";

  return {
    ok: true,
    message: `${label} chez ${company.name}.`,
    createdCompany: createdCompany ? company.name : undefined,
  };
}
