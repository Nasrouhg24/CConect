"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  submitContribution,
  type ContributionResult,
} from "@/app/contribute/actions";
import { CompanyPicker } from "@/components/CompanyPicker";
import { ExperienceCareerFields } from "@/components/career/ExperienceCareerFields";
import {
  Button,
  ChoiceOption,
  StepProgress,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/ui";
import { buttonClass } from "@/components/ui/button";
import {
  DOMAINS,
  DOMAIN_LABELS,
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_LABELS,
} from "@/lib/labels";
import type { Company, Place } from "@/lib/types";

const CURRENT_YEAR = new Date().getFullYear();

type Mode = "experience" | "contact";

const MODES: {
  value: Mode;
  label: string;
  short: string;
  hint: string;
  heading: string;
}[] = [
  {
    value: "experience",
    label: "J'ai fait un stage",
    short: "Stage",
    hint: "Un stage ou un poste que tu as occupé.",
    heading: "Ton stage",
  },
  {
    value: "contact",
    label: "Je connais quelqu'un",
    short: "Contact",
    hint: "Même sans avoir travaillé là-bas.",
    heading: "Ton contact",
  },
];

/* La garantie de confidentialité se lit là où elle sert : sous le champ libre,
   au moment où l'on serait tenté d'y écrire un numéro. */
const PRIVACY_HINT = "Pas d'email ni de téléphone : c'est toi qu'on contactera.";

type Step = 0 | 1 | 2;

/**
 * Contribution en trois temps : quoi → détails → publié.
 *
 * Le choix de nature est isolé parce qu'il décide des champs ; les détails
 * tiennent ensuite dans une seule colonne. La troisième étape n'est que le
 * retour du serveur quand la publication a réussi.
 */
export function ContributionForm({
  places,
  companies,
  author,
}: {
  places: Place[];
  companies: Company[];
  /** Qui publie, rappelé avant de commencer. */
  author: string;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [missingMode, setMissingMode] = useState(false);
  const [company, setCompany] = useState<{
    companyId: string | null;
    newName: string | null;
  }>({ companyId: null, newName: null });

  const [state, formAction, pending] = useActionState<
    ContributionResult | null,
    FormData
  >(submitContribution, null);

  const formRef = useRef<HTMLFormElement>(null);
  const modeGroupRef = useRef<HTMLFieldSetElement>(null);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);
  // Incrémenté à chaque changement d'étape voulu : le premier rendu, lui, ne
  // vole pas le focus.
  const [focusRequest, setFocusRequest] = useState(0);
  const [seenState, setSeenState] = useState(state);

  const goTo = (next: Step) => {
    setStep(next);
    setFocusRequest((n) => n + 1);
  };

  // Une publication réussie ouvre la confirmation — une fois par réponse.
  if (state !== seenState) {
    setSeenState(state);
    if (state?.ok) goTo(2);
  }

  // Le focus suit l'étape une fois celle-ci affichée : le nouveau titre est
  // annoncé, et Retour rend la main sur le choix fait.
  useEffect(() => {
    if (focusRequest === 0) return;
    if (step === 0) {
      modeGroupRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    } else {
      (step === 1 ? detailsHeadingRef : doneHeadingRef).current?.focus();
    }
  }, [focusRequest, step]);

  const next = () => {
    if (!mode) {
      setMissingMode(true);
      modeGroupRef.current?.querySelector("input")?.focus();
      return;
    }
    goTo(1);
  };

  const restart = () => {
    formRef.current?.reset();
    setCompany({ companyId: null, newName: null });
    setMode(null);
    goTo(0);
  };

  const err = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const current = MODES.find((m) => m.value === mode);
  const headingClass =
    "font-display text-title font-medium tracking-tight text-text focus-visible:outline-none";

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        // Sans `action` : React vide les champs à la fin d'une action de
        // formulaire, y compris quand le serveur refuse — tout était à
        // ressaisir.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <StepProgress
        steps={[step > 0 && current ? current.short : "Nature", "Détails", "Publié"]}
        current={step}
      />

      {/* Étape 1 — nature de la contribution */}
      <div hidden={step !== 0}>
        <h1 className={headingClass}>Qu&apos;est-ce que tu ajoutes&nbsp;?</h1>
        <p className="mt-1.5 font-mono text-meta text-text-faint">
          En tant que <span className="text-text-muted">{author}</span>
        </p>

        <fieldset
          ref={modeGroupRef}
          className="mt-8"
          aria-describedby={missingMode ? "mode-error" : undefined}
        >
          <legend className="sr-only">Nature de la contribution</legend>
          <div className="grid gap-2.5">
            {MODES.map((option) => (
              <ChoiceOption
                key={option.value}
                name="entryKind"
                value={option.value}
                label={option.label}
                description={option.hint}
                checked={mode === option.value}
                onChange={() => {
                  setMode(option.value);
                  setMissingMode(false);
                }}
              />
            ))}
          </div>
          {missingMode ? (
            <p id="mode-error" role="alert" className="mt-3 text-meta text-danger">
              Choisis ce que tu ajoutes pour continuer.
            </p>
          ) : null}
        </fieldset>

        <Button type="button" variant="primary" size="lg" onClick={next} className="mt-8 w-full">
          Continuer
        </Button>
      </div>

      {/* Étape 2 — détails, montés une fois la nature choisie : les champs
          requis d'une nature ne doivent pas bloquer l'autre. */}
      {mode ? (
        <div hidden={step !== 1}>
          <h1 ref={detailsHeadingRef} tabIndex={-1} className={headingClass}>{current?.heading}</h1>
          <p className="mt-1.5 text-body text-text-muted">{current?.hint}</p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CompanyPicker
                companies={companies}
                value={company}
                onChange={setCompany}
              />
              {err.companyId ? (
                <p className="mt-1 text-meta text-danger">{err.companyId}</p>
              ) : null}
            </div>

            <Field label="Ville" name="placeId" error={err.placeId}>
              <select name="placeId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Choisir…
                </option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.city}, {p.countryName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Domaine" name="domain" error={err.domain}>
              <select name="domain" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Choisir…
                </option>
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {DOMAIN_LABELS[d]}
                  </option>
                ))}
              </select>
            </Field>

            {mode === "experience" ? (
              <>
                <Field label="Type" name="kind" error={err.kind}>
                  <select name="kind" required defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      Choisir…
                    </option>
                    {EXPERIENCE_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {EXPERIENCE_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Année" name="year" error={err.year}>
                  <input
                    name="year"
                    type="number"
                    required
                    min={2005}
                    max={2100}
                    defaultValue={CURRENT_YEAR}
                    className={inputClass}
                  />
                </Field>

                <Field label="Poste" name="title" error={err.title} full>
                  <input
                    name="title"
                    required
                    maxLength={120}
                    placeholder="Security Engineer Intern"
                    className={inputClass}
                  />
                </Field>

                <ExperienceCareerFields errors={err} />

                <Field
                  label="Conseils pour candidater"
                  name="summary"
                  error={err.summary}
                  hint={PRIVACY_HINT}
                  full
                >
                  <textarea
                    name="summary"
                    rows={4}
                    maxLength={1000}
                    placeholder="Process, équipe, stack, période…"
                    className={textareaClass}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Prénom" name="firstName" error={err.firstName}>
                  <input
                    name="firstName"
                    required
                    maxLength={80}
                    placeholder="Sarah"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Nom (optionnel)"
                  name="lastName"
                  error={err.lastName}
                  hint="Une initiale suffit."
                >
                  <input
                    name="lastName"
                    maxLength={80}
                    placeholder="M."
                    className={inputClass}
                  />
                </Field>

                <Field label="Poste" name="position" error={err.position} full>
                  <input
                    name="position"
                    required
                    maxLength={120}
                    placeholder="Cybersecurity Recruiter"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="LinkedIn (optionnel)"
                  name="linkedinUrl"
                  error={err.linkedinUrl}
                  full
                >
                  <input
                    name="linkedinUrl"
                    type="url"
                    maxLength={300}
                    placeholder="https://www.linkedin.com/in/…"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Comment tu la connais"
                  name="notes"
                  error={err.notes}
                  hint={PRIVACY_HINT}
                  full
                >
                  <textarea
                    name="notes"
                    rows={3}
                    maxLength={500}
                    placeholder="Ancien encadrant, rencontré en conférence…"
                    className={textareaClass}
                  />
                </Field>
              </>
            )}
          </div>

          {state && !state.ok ? (
            <p role="alert" className="mt-6 text-list text-danger">
              {state.message}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" size="lg" onClick={() => goTo(0)} disabled={pending}>
              Retour
            </Button>
            <Button type="submit" variant="primary" size="lg" loading={pending} className="font-semibold">
              {pending ? "Publication…" : "Publier"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Étape 3 — confirmation */}
      <div hidden={step !== 2}>
        <h1 ref={doneHeadingRef} tabIndex={-1} className={headingClass}>{state?.ok ? state.message : null}</h1>
        {state?.ok && state.createdCompany ? (
          <p className="mt-1.5 text-list text-text-muted">
            Fiche créée : {state.createdCompany}.
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button type="button" variant="primary" size="lg" onClick={restart}>
            Ajouter autre chose
          </Button>
          <Link href="/network" className={buttonClass({ variant: "ghost", size: "lg" })}>
            Voir la carte
          </Link>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  full,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={name} className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className={labelClass}>{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {hint ? (
        <span className="mt-1 block text-meta text-text-faint">{hint}</span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-meta text-danger">{error}</span>
      ) : null}
    </label>
  );
}
