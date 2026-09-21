"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/components/ui";
import { MAX_EXPERIENCE_SKILLS } from "@/lib/skills";

/**
 * Dates, statut et compétences d'une expérience.
 *
 * Tous facultatifs, et c'est voulu : beaucoup de membres ne se souviennent
 * pas du mois exact. Un champ vide reste « non renseigné » — il ne devient
 * jamais « en cours » ni « terminé » par défaut.
 *
 * Partagé par le formulaire de contribution et l'édition d'une expérience,
 * pour que les deux écrivent exactement les mêmes noms de champs que
 * `experienceInputSchema`.
 */
export function ExperienceCareerFields({
  defaults,
  errors = {},
}: {
  defaults?: {
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean | null;
    skills: string[];
  };
  errors?: Record<string, string>;
}) {
  const [progress, setProgress] = useState<"" | "current" | "ended">(
    defaults?.isCurrent === true ? "current" : defaults?.isCurrent === false ? "ended" : "",
  );

  return (
    <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
      <legend className="mb-2 text-meta text-text-faint sm:col-span-3">
        Période et statut — laisse vide ce que tu ne sais pas. Le mois de début
        fixe l&apos;année affichée sur la carte.
      </legend>

      <label className="block">
        <span className={labelClass}>Début</span>
        <input
          type="month"
          name="startMonth"
          min="2005-01"
          defaultValue={defaults?.startDate?.slice(0, 7) ?? ""}
          aria-invalid={Boolean(errors.startMonth) || undefined}
          className={`${inputClass} mt-1.5`}
        />
        {errors.startMonth ? (
          <span className="mt-1 block text-meta text-danger">{errors.startMonth}</span>
        ) : null}
      </label>

      <label className="block">
        <span className={labelClass}>Statut</span>
        <select
          name="progress"
          value={progress}
          onChange={(e) => setProgress(e.target.value as typeof progress)}
          className={`${inputClass} mt-1.5`}
        >
          <option value="">Non renseigné</option>
          <option value="current">En cours / en poste</option>
          <option value="ended">Terminé</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Fin</span>
        <input
          type="month"
          name="endMonth"
          min="2005-01"
          disabled={progress === "current"}
          defaultValue={defaults?.endDate?.slice(0, 7) ?? ""}
          aria-invalid={Boolean(errors.endMonth) || undefined}
          className={`${inputClass} mt-1.5 disabled:opacity-45`}
        />
        {errors.endMonth ? (
          <span className="mt-1 block text-meta text-danger">{errors.endMonth}</span>
        ) : null}
      </label>

      <label className="block sm:col-span-3">
        <span className={labelClass}>Compétences mobilisées</span>
        <input
          name="skills"
          defaultValue={defaults?.skills.join(", ") ?? ""}
          placeholder="SIEM, Python, Linux"
          maxLength={600}
          aria-invalid={Boolean(errors.skills) || undefined}
          className={`${inputClass} mt-1.5`}
        />
        <span className={`mt-1 block text-meta ${errors.skills ? "text-danger" : "text-text-faint"}`}>
          {errors.skills ??
            `Séparées par des virgules, ${MAX_EXPERIENCE_SKILLS} au plus. Elles alimentent les compétences fréquentes du conseiller.`}
        </span>
      </label>
    </fieldset>
  );
}
