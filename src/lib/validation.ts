import { z } from "zod";
import { CAMPUSES, DOMAINS, EXPERIENCE_KINDS, INDUSTRIES } from "./labels";
import type { Campus, Domain, ExperienceKind, Industry } from "./types";

/**
 * Validation partagée client/serveur.
 *
 * Le serveur revalide systématiquement : la validation côté formulaire n'est
 * qu'un confort d'usage, jamais une garantie.
 */

const linkedinUrl = z
  .string()
  .trim()
  .max(300)
  .regex(
    /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+/i,
    "Doit être une URL LinkedIn en https://",
  );

const optionalLinkedin = z.union([linkedinUrl, z.literal("")]).optional();
const optionalHttpsUrl = z
  .union([
    z.string().trim().max(400).regex(/^https:\/\/.+/i, "L'URL doit commencer par https://"),
    z.literal(""),
  ])
  .optional();

export const domainSchema = z.enum(DOMAINS as [Domain, ...Domain[]]);
export const experienceKindSchema = z.enum(
  EXPERIENCE_KINDS as [ExperienceKind, ...ExperienceKind[]],
);
export const campusSchema = z.enum(CAMPUSES as [Campus, ...Campus[]]);
export const industrySchema = z.enum(INDUSTRIES as [Industry, ...Industry[]]);

/**
 * Référence à une entreprise : soit une fiche existante, soit un nom explicite
 * à créer. Jamais les deux vides — c'est ce qui interdit l'entreprise
 * « fantôme » saisie en texte libre.
 */
const companyRef = {
  companyId: z.string().trim().optional(),
  newCompanyName: z.string().trim().max(120).optional(),
};

function requireCompany<T extends { companyId?: string; newCompanyName?: string }>(
  value: T,
  ctx: z.RefinementCtx,
) {
  if (!value.companyId && !(value.newCompanyName && value.newCompanyName.length >= 2)) {
    ctx.addIssue({
      code: "custom",
      path: ["companyId"],
      message: "Choisis une entreprise dans la liste, ou crée-la.",
    });
  }
}

const baseFields = {
  ...companyRef,
  placeId: z.string().trim().min(1, "Choisis une ville"),
  domain: domainSchema,
};

export const experienceInputSchema = z
  .object({
    ...baseFields,
    entryKind: z.literal("experience"),
    kind: experienceKindSchema,
    year: z.coerce.number().int().min(2005).max(2100),
    title: z.string().trim().min(3).max(120),
    summary: z.string().trim().max(1000).optional(),
  })
  .superRefine(requireCompany);

export const contactInputSchema = z
  .object({
    ...baseFields,
    entryKind: z.literal("contact"),
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().max(80).optional(),
    position: z.string().trim().min(2).max(120),
    linkedinUrl: optionalLinkedin,
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine(requireCompany);

export const offerInputSchema = z
  .object({
    ...baseFields,
    entryKind: z.literal("offer"),
    title: z.string().trim().min(3).max(140),
    kind: experienceKindSchema,
    durationMonths: z
      .union([z.coerce.number().int().min(1).max(36), z.literal("")])
      .optional(),
    description: z.string().trim().max(1500).optional(),
    technologies: z.string().trim().max(200).optional(),
    url: optionalHttpsUrl,
  })
  .superRefine(requireCompany);

export type ExperienceInput = z.infer<typeof experienceInputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type OfferInput = z.infer<typeof offerInputSchema>;
export type ContributionInput = ExperienceInput | ContactInput | OfferInput;

export const companyProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  industry: industrySchema,
  website: optionalHttpsUrl,
  linkedinUrl: optionalLinkedin,
  logoUrl: optionalHttpsUrl,
  description: z.string().trim().max(600).optional(),
  headquartersId: z.string().trim().optional(),
});

/**
 * Refuse un email ou un numéro de téléphone glissé dans un champ libre.
 * La règle « pas de coordonnées privées » ne tient que si elle est appliquée
 * sur le texte, pas seulement sur le schéma.
 */
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(?:\+?\d[\s.\-()]?){8,}/;

export function findPrivateContactDetails(text: string): string | null {
  if (EMAIL_RE.test(text)) return "l'adresse email";
  if (PHONE_RE.test(text)) return "le numéro de téléphone";
  return null;
}

/** Liste de technologies saisie en texte libre → tableau propre et borné. */
export function parseTechnologies(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const part of raw.split(/[,;]/)) {
    const tech = part.trim().slice(0, 30);
    const key = tech.toLowerCase();
    if (tech.length >= 2 && !seen.has(key)) {
      seen.add(key);
      list.push(tech);
    }
    if (list.length === 12) break;
  }
  return list;
}
