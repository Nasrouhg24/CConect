"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import {
  createProfile,
  type OnboardingResult,
} from "@/app/onboarding/actions";
import { Button, ChoiceOption, StepProgress, inputClass } from "@/components/ui";
import {
  CAMPUSES,
  CAMPUS_LABELS,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
} from "@/lib/labels";
import type { MemberStatus } from "@/lib/types";

/*
 * Les deux statuts remplissent exactement les mêmes champs : seule la lecture
 * de la promotion change. D'où un choix de statut isolé en première étape,
 * puis un formulaire unique dont l'aide s'adapte.
 */
const ROLES: {
  value: MemberStatus;
  promotionHint: string;
  defaultPromotion: number;
}[] = [
  {
    value: "student",
    promotionHint: "Année de sortie prévue.",
    defaultPromotion: new Date().getFullYear() + 1,
  },
  {
    value: "alumni",
    promotionHint: "Année d'obtention du diplôme.",
    defaultPromotion: new Date().getFullYear(),
  },
];

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<
    OnboardingResult | null,
    FormData
  >(createProfile, null);

  const [step, setStep] = useState<0 | 1>(0);
  const [status, setStatus] = useState<MemberStatus | null>(null);
  const [missingStatus, setMissingStatus] = useState(false);
  const [promotion, setPromotion] = useState(String(ROLES[0].defaultPromotion));
  const promotionEdited = useRef(false);

  const profileHeadingRef = useRef<HTMLHeadingElement>(null);
  const roleGroupRef = useRef<HTMLFieldSetElement>(null);
  const moveFocus = useRef(false);

  const role = ROLES.find((r) => r.value === status);

  const chooseRole = (value: MemberStatus) => {
    setStatus(value);
    setMissingStatus(false);
    // La promotion suit le statut tant que le membre ne l'a pas saisie.
    if (!promotionEdited.current) {
      setPromotion(String(ROLES.find((r) => r.value === value)!.defaultPromotion));
    }
  };

  const next = () => {
    if (!status) {
      setMissingStatus(true);
      roleGroupRef.current?.querySelector("input")?.focus();
      return;
    }
    moveFocus.current = true;
    setStep(1);
  };

  const back = () => {
    moveFocus.current = true;
    setStep(0);
  };

  // Le focus suit l'étape, une fois l'étape affichée : un lecteur d'écran
  // annonce le nouveau titre, et Retour rend la main sur le statut choisi.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    if (step === 1) profileHeadingRef.current?.focus();
    else roleGroupRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
  }, [step]);

  return (
    <form
      onSubmit={(e) => {
        // Soumission sans `action` : React vide les champs non contrôlés à la
        // fin d'une action de formulaire, y compris quand le serveur renvoie
        // une erreur — le membre perdait alors tout ce qu'il avait saisi.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <StepProgress
        steps={[step > 0 && status ? STATUS_LABELS[status] : "Statut", "Profil"]}
        current={step}
      />

      {/* Étape 1 — les radios restent montées (masquées) à l'étape 2 : leur
          valeur part avec le formulaire. */}
      <div hidden={step !== 0}>
        <h1 className="font-display text-title font-medium tracking-tight text-text">
          Comment rejoins-tu CConnect&nbsp;?
        </h1>
        <p className="mt-1.5 text-body text-text-muted">
          Deux étapes, moins d&apos;une minute.
        </p>

        <fieldset
          ref={roleGroupRef}
          className="mt-8"
          aria-describedby={missingStatus ? "status-error" : undefined}
        >
          <legend className="sr-only">Statut</legend>
          <div className="grid gap-2.5">
            {ROLES.map((r) => (
              <ChoiceOption
                key={r.value}
                name="status"
                value={r.value}
                label={STATUS_LABELS[r.value]}
                description={STATUS_DESCRIPTIONS[r.value]}
                checked={status === r.value}
                onChange={() => chooseRole(r.value)}
                required
              />
            ))}
          </div>
          {missingStatus ? (
            <p id="status-error" role="alert" className="mt-3 text-meta text-danger">
              Choisis ton statut pour continuer.
            </p>
          ) : null}
        </fieldset>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={next}
          className="mt-8 w-full"
        >
          Continuer
        </Button>
      </div>

      {/* Étape 2 */}
      <div hidden={step !== 1}>
        <h1
          ref={profileHeadingRef}
          tabIndex={-1}
          className="font-display text-title font-medium tracking-tight text-text focus-visible:outline-none"
        >
          Ton profil
        </h1>
        <p className="mt-1.5 text-body text-text-muted">
          Ce nom apparaîtra sous tes contributions.
        </p>

        <div className="mt-8 grid gap-5">
          <Field label="Nom complet" htmlFor="onb-fullName">
            <input
              id="onb-fullName"
              name="fullName"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              className={inputClass}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-1.5 block text-meta text-text-muted">Campus</legend>
              <div className="grid h-11 grid-cols-2 gap-1 rounded-sm border border-border-strong bg-surface p-1">
                {CAMPUSES.map((c) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center justify-center rounded-xs text-body text-text-muted transition-colors duration-150 hover:text-text has-[:checked]:bg-surface-raised has-[:checked]:text-text has-[:checked]:shadow-[0_0_0_1px_var(--color-border-strong)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent"
                  >
                    <input
                      type="radio"
                      name="campus"
                      value={c}
                      required
                      defaultChecked={c === "rabat"}
                      className="sr-only"
                    />
                    {CAMPUS_LABELS[c]}
                  </label>
                ))}
              </div>
            </fieldset>

            <Field
              label="Promotion"
              htmlFor="onb-promotion"
              hint={role?.promotionHint}
            >
              <input
                id="onb-promotion"
                name="promotion"
                type="number"
                inputMode="numeric"
                required
                min={2010}
                max={2100}
                value={promotion}
                onChange={(e) => {
                  promotionEdited.current = true;
                  setPromotion(e.target.value);
                }}
                aria-describedby={role ? "onb-promotion-hint" : undefined}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-5 border-t border-border pt-5">
            <Field label="Filière (optionnel)" htmlFor="onb-program">
              <input
                id="onb-program"
                name="program"
                maxLength={120}
                className={inputClass}
              />
            </Field>

            <Field
              label="LinkedIn (optionnel)"
              htmlFor="onb-linkedin"
              hint="C'est par là que les autres membres te contacteront."
            >
              <input
                id="onb-linkedin"
                name="linkedinUrl"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://www.linkedin.com/in/…"
                aria-describedby="onb-linkedin-hint"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* L'acceptation est demandée là où le compte se crée, et nulle part
            ailleurs : c'est le dernier geste avant l'écriture en base. Rien
            n'est pré-coché — un consentement se donne, il ne se constate pas
            (RGPD art. 4.11). `required` bloque déjà l'envoi côté navigateur, et
            la Server Action revérifie : la validation de formulaire est un
            confort, jamais la garantie. */}
        <label className="mt-8 flex cursor-pointer gap-3 rounded-md border border-border bg-surface p-4 text-list text-text">
          <input
            type="checkbox"
            name="acceptPolicies"
            required
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
          />
          <span>
            J&apos;ai lu et j&apos;accepte la{" "}
            <Link
              href="/legal/confidentialite"
              target="_blank"
              className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              politique de confidentialité
            </Link>{" "}
            et les{" "}
            <Link
              href="/legal/conditions"
              target="_blank"
              className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              conditions d&apos;utilisation
            </Link>
            .
          </span>
        </label>

        {state && !state.ok ? (
          <p role="alert" className="mt-5 text-meta text-danger">
            {state.message}
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="lg" onClick={back} disabled={pending}>
            Retour
          </Button>
          <Button type="submit" variant="primary" size="lg" loading={pending}>
            {pending ? "Création…" : "Créer mon profil"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-meta text-text-muted">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-meta text-text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
