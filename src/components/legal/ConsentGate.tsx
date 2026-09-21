"use client";

import { startTransition, useActionState } from "react";
import { acceptPolicies, type AcceptResult } from "@/app/legal/actions";
import { BrandLockup } from "@/components/Brand";
import { Button } from "@/components/ui";
import { LEGAL_CONTACT, POLICY_UPDATED_LABEL, POLICY_VERSION } from "@/lib/legal";

/**
 * Écran d'acceptation des politiques.
 *
 * Trois partis pris.
 *
 * **Il bloque pour de bon.** Ce n'est pas une modale qu'on ferme à
 * l'échappement : tant que la version en vigueur n'est pas acceptée,
 * `src/proxy.ts` renvoie ici *chaque* requête vers une route protégée — les
 * navigations côté client et les envois de Server Action compris. Il n'y a
 * rien à contourner dans le navigateur, la décision est prise sur le serveur.
 *
 * **Il ne pré-coche rien.** Une case cochée par défaut n'est pas un
 * consentement (RGPD art. 4.11) : il doit être un acte positif. Le bouton reste
 * donc verrouillé tant que la case ne l'est pas.
 *
 * **Il dit ce qu'on accepte avant de demander de l'accepter.** Le résumé
 * ci-dessous n'a pas valeur juridique — les deux documents complets sont à un
 * clic, et le proxy laisse passer `/legal`. Ces deux liens sont des `<a>` et
 * non des `<Link>` : une navigation douce garderait la page d'acceptation en
 * mémoire et rendrait le retour confus, là où un aller-retour serveur remet
 * chaque écran à sa place.
 */
export function ConsentGate({
  previousVersion,
  next,
}: {
  previousVersion: string | null;
  /** Où renvoyer une fois l'acceptation enregistrée. */
  next: string;
}) {
  const [state, formAction, pending] = useActionState<AcceptResult | null, FormData>(
    acceptPolicies,
    null,
  );

  const updated = previousVersion !== null;

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-[34rem]">
        <BrandLockup />

        <h1 className="mt-8 font-display text-title font-medium tracking-tight text-text">
          {updated
            ? "Nos politiques ont changé"
            : "Avant d'entrer dans le réseau"}
        </h1>
        <p className="mt-2 text-body text-text-muted">
          {updated
            ? `Tu avais accepté la version ${previousVersion}. Voici ce qui fait foi à partir du ${POLICY_UPDATED_LABEL} — relis, puis confirme pour retrouver l'accès.`
            : "Deux documents, et ce qu'il faut en retenir. L'accès s'ouvre dès que tu confirmes."}
        </p>

        <ul className="mt-7 grid gap-3">
          <Point>
            Ce que tu publies est lisible par les membres du réseau, et par eux
            seuls. Rien n&apos;est public, rien n&apos;est indexé.
          </Point>
          <Point>
            Aucun traceur, aucune mesure d&apos;audience&nbsp;: les seuls cookies
            posés sont ceux sans lesquels la connexion ne fonctionne pas.
          </Point>
          <Point>
            Les contacts que tu enregistres n&apos;ont ni email ni téléphone — la
            base n&apos;a pas de colonne pour les recevoir.
          </Point>
          <Point>
            Tu peux corriger, retirer ou supprimer tes données à tout moment,
            compte compris.
          </Point>
        </ul>

        <form
          className="mt-8 rounded-md border border-border bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            startTransition(() => formAction(data));
          }}
        >
          <input type="hidden" name="next" value={next} />

          <label className="flex cursor-pointer gap-3 text-body text-text">
            <input
              type="checkbox"
              name="accept"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span>
              J&apos;ai lu et j&apos;accepte la{" "}
              <a
                href="/legal/confidentialite"
                className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                politique de confidentialité
              </a>{" "}
              et les{" "}
              <a
                href="/legal/conditions"
                className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                conditions d&apos;utilisation
              </a>
              .
            </span>
          </label>

          {state && !state.ok ? (
            <p role="alert" className="mt-4 text-meta text-danger">
              {state.message}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={pending}
            className="mt-5 w-full"
          >
            {pending ? "Enregistrement…" : "Accepter et continuer"}
          </Button>

          <p className="mt-3 font-mono text-meta text-text-faint">
            Version {POLICY_VERSION} · ton acceptation est horodatée et
            consultable sur demande
          </p>
        </form>

        {/* Un consentement n'est libre que si le refus mène quelque part. Sans
            cette sortie, l'écran ne laisserait d'autre choix que de fermer
            l'onglet — ce qui n'est pas un refus, seulement un abandon. */}
        <p className="mt-5 text-meta text-text-faint">
          Tu ne veux pas accepter&nbsp;?{" "}
          {LEGAL_CONTACT ? (
            <>
              Écris à{" "}
              <a
                href={`mailto:${LEGAL_CONTACT}?subject=Suppression%20de%20mon%20compte%20CConnect`}
                className="underline underline-offset-2 hover:text-text"
              >
                {LEGAL_CONTACT}
              </a>{" "}
              pour faire supprimer ton compte et tes données. Aucun accès ne
              t&apos;est ouvert entre-temps, et rien de nouveau n&apos;est
              collecté.
            </>
          ) : (
            <>
              Ton compte et tes données peuvent être supprimés sur simple
              demande. Aucun accès ne t&apos;est ouvert entre-temps, et rien de
              nouveau n&apos;est collecté.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-body text-text-muted">
      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
      <span>{children}</span>
    </li>
  );
}
