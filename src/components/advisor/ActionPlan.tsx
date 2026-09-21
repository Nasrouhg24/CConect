import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { PROFILE_CAREER_HREF } from "@/lib/links";
import type { ActionPlan as Plan, ActionPriority } from "@/lib/advisor-actions";

const PRIORITY: Record<ActionPriority, { label: string; mark: string }> = {
  high: { label: "Prioritaire", mark: "bg-accent" },
  medium: { label: "Utile", mark: "border border-accent bg-transparent" },
  low: { label: "Facultatif", mark: "border border-border-strong bg-transparent" },
};

/**
 * « Ton plan d'action » — la couche « que faire ensuite » posée sur le
 * tableau du conseiller.
 *
 * Des lignes, pas des tuiles : priorité, titre, une phrase, un seul bouton.
 * « Pourquoi ? » est un `<details>` natif — aucun JavaScript, et la liste des
 * faits reste lisible au clavier et par un lecteur d'écran.
 *
 * La priorité se lit par la forme du repère (plein, cerclé, gris) *et* par un
 * mot : la couleur ne porte jamais seule l'information.
 */
export function ActionPlan({ plan }: { plan: Plan }) {
  // L'accueil remplace l'action de profil : on ne montre pas les deux.
  const actions = plan.onboarding
    ? plan.actions.filter((a) => a.id !== "profile-goal")
    : plan.actions;

  return (
    <section aria-labelledby="advisor-plan">
      {/* Seul titre de section en toutes lettres : c'est le bloc d'action de la
          page, les autres sections restent des étiquettes d'appui. */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <h2 id="advisor-plan" className="text-section font-medium text-text">
          Ton plan d&apos;action
        </h2>
        {actions.length > 0 ? (
          <p className="font-mono text-label tabular-nums text-text-faint">
            {actions.length} action{actions.length > 1 ? "s" : ""}
          </p>
        ) : null}
      </div>

      {plan.onboarding ? (
        <div className="mb-4 rounded-sm border border-border bg-surface px-4 py-4">
          <p className="text-body font-medium text-text">Commence par définir ton objectif</p>
          <p className="mt-0.5 text-meta text-text-muted">
            Le plan se construit à partir de ces cinq informations, toutes dans ton profil.
          </p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {plan.onboarding.map((step, i) => (
              <li key={step.label} className="flex items-baseline gap-2.5 text-list">
                <span className="font-mono text-label tabular-nums text-text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className={step.done ? "text-text" : "text-text-muted"}>{step.label}</span>
                  <span className="block text-meta text-text-faint">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link
            href={PROFILE_CAREER_HREF}
            className={buttonClass({ variant: "primary", size: "sm", className: "mt-4" })}
          >
            Définir mon objectif
          </Link>
        </div>
      ) : null}

      {actions.length === 0 ? (
        plan.onboarding ? null : (
          <p className="border-y border-border py-4 text-list text-text-muted">
            Rien de plus à faire pour l&apos;instant : ton profil est renseigné, et le réseau
            n&apos;a pas encore de contribution dans ton périmètre.
          </p>
        )
      ) : (
        <ol className="divide-y divide-border border-y border-border">
          {actions.map((action, index) => {
            const priority = PRIORITY[action.priority];
            return (
              <li
                key={action.id}
                data-action={action.id}
                className="grid gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-start"
              >
                <span className="inline-flex items-center gap-2 pt-0.5 text-label uppercase tracking-[0.08em] text-text-faint">
                  <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${priority.mark}`} />
                  {priority.label}
                </span>

                <div className="min-w-0">
                  <p className="text-body font-medium text-text">{action.title}</p>
                  <p className="mt-0.5 text-list text-text-muted">{action.description}</p>
                  {action.evidence.length > 0 ? (
                    <details className="group mt-1.5">
                      <summary className="w-fit cursor-pointer list-none rounded-xs text-meta text-text-muted underline-offset-2 hover:text-text hover:underline [&::-webkit-details-marker]:hidden">
                        <span aria-hidden className="mr-1 inline-block transition-transform group-open:rotate-90">
                          ›
                        </span>
                        Pourquoi ?
                      </summary>
                      <ul className="mt-1.5 space-y-0.5 border-l border-border pl-3">
                        {action.evidence.map((fact) => (
                          <li key={fact} className="text-meta text-text-muted">
                            {fact}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>

                <Link
                  href={action.href}
                  className={buttonClass({
                    // Un seul bouton plein : trois verts d'affilée se disputent l'attention.
                    variant: index === 0 && action.priority === "high" ? "primary" : "secondary",
                    size: "sm",
                    className: "justify-self-start",
                  })}
                >
                  {action.label}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
