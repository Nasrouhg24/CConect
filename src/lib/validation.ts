import { z } from "zod";
import { CAMPUSES, DOMAINS, EXPERIENCE_KINDS, INDUSTRIES, STUDY_YEARS } from "./labels";
import { MAX_EXPERIENCE_SKILLS, MAX_PROFILE_SKILLS, parseSkillList } from "./skills";
import type { Campus, Domain, ExperienceKind, Industry, StudyYear } from "./types";

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

const monthField = z
  .union([z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide"), z.literal("")])
  .optional();

export const experienceInputSchema = z
  .object({
    ...baseFields,
    entryKind: z.literal("experience"),
    kind: experienceKindSchema,
    year: z.coerce.number().int().min(2005).max(2100),
    title: z.string().trim().min(3).max(120),
    summary: z.string().trim().max(1000).optional(),
    startMonth: monthField,
    endMonth: monthField,
    /** `current` : en poste / en cours. `ended` : terminé. Vide : non renseigné. */
    progress: z.enum(["current", "ended", ""]).optional(),
    skills: z.string().max(600).optional(),
  })
  .superRefine(requireCompany)
  .superRefine((value, ctx) => {
    if (value.startMonth && value.endMonth && value.endMonth < value.startMonth) {
      ctx.addIssue({ code: "custom", path: ["endMonth"], message: "La fin précède le début." });
    }
    if (value.progress === "current" && value.endMonth) {
      ctx.addIssue({
        code: "custom",
        path: ["endMonth"],
        message: "Un poste en cours n'a pas de date de fin.",
      });
    }
    if (value.startMonth && Number(value.startMonth.slice(0, 4)) < 2005) {
      ctx.addIssue({ code: "custom", path: ["startMonth"], message: "Date trop ancienne." });
    }
    if (parseSkillList(value.skills ?? "", MAX_EXPERIENCE_SKILLS) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["skills"],
        message: `${MAX_EXPERIENCE_SKILLS} compétences au plus, 40 caractères chacune.`,
      });
    }
  });

/**
 * Champs de carrière d'une expérience, prêts pour la base.
 *
 * Quand un mois de début est saisi, l'année en découle : la carte lit `year`,
 * la frise lit `start_date`, et la base refuse qu'ils se contredisent. Une
 * date de fin suffit à dire « terminé » ; sans elle ni choix explicite, le
 * statut reste inconnu.
 */
export function careerFieldsFromInput(input: ExperienceInput) {
  const startDate = input.startMonth ? `${input.startMonth}-01` : null;
  const endDate = input.endMonth ? `${input.endMonth}-01` : null;
  const isCurrent =
    input.progress === "current" ? true : input.progress === "ended" || endDate ? false : null;
  return {
    year: startDate ? Number(startDate.slice(0, 4)) : input.year,
    startDate,
    endDate: isCurrent ? null : endDate,
    isCurrent,
    skills: parseSkillList(input.skills ?? "", MAX_EXPERIENCE_SKILLS) ?? [],
  };
}

export const studyYearSchema = z.enum(STUDY_YEARS as [StudyYear, ...StudyYear[]]);

export const careerProfileSchema = z
  .object({
    status: z.enum(["student", "alumni"]),
    studyYear: z.union([studyYearSchema, z.literal("")]).optional(),
    openToMentoring: z.enum(["yes", "no", ""]).optional(),
    targetDomain: z.union([domainSchema, z.literal("")]).optional(),
    targetRole: z.union([z.string().trim().min(2).max(120), z.literal("")]).optional(),
    skills: z.string().max(1500).optional(),
    targetCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(5, "5 pays au plus."),
    targetCompanies: z.array(z.string().trim().min(1).max(80)).max(10, "10 entreprises au plus."),
  })
  .superRefine((value, ctx) => {
    if (parseSkillList(value.skills ?? "", MAX_PROFILE_SKILLS) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["skills"],
        message: `${MAX_PROFILE_SKILLS} compétences au plus, 40 caractères chacune.`,
      });
    }
  });

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

export type ExperienceInput = z.infer<typeof experienceInputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type ContributionInput = ExperienceInput | ContactInput;

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
/** Dates et horodatages : des suites de chiffres légitimes en texte libre. */
const DATE_LIKE_RE =
  /\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?|\d{1,2}\/\d{1,2}\/\d{2,4}/g;

export function findPrivateContactDetails(text: string): string | null {
  if (EMAIL_RE.test(text)) return "l'adresse email";
  // Les dates sont retirées d'abord : « du 2026-01-05 au 2026-06-30 » aligne
  // assez de chiffres pour ressembler à un numéro, et refuser ce texte
  // légitime rendrait le garde-fou pénible au point d'être contourné.
  if (PHONE_RE.test(text.replace(DATE_LIKE_RE, " "))) {
    return "le numéro de téléphone";
  }
  return null;
}
