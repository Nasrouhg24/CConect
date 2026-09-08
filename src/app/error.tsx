"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui";

/**
 * Écran d'erreur d'une route.
 *
 * Trois décisions volontaires :
 *
 *  1. **Le message technique n'est pas affiché.** Il nomme des tables et des
 *     contraintes, ce qui renseigne un attaquant sans aider un membre (voir
 *     `src/lib/db-error.ts`). Seul le `digest` est montré : c'est un
 *     identifiant opaque qui permet de retrouver la trace côté serveur.
 *  2. **Réessayer d'abord.** Une lecture qui échoue est le plus souvent une
 *     session expirée ou un aller-retour réseau raté ; `reset()` refait le
 *     rendu sans recharger toute l'application.
 *  3. **Une sortie, toujours.** Si réessayer ne suffit pas, la carte reste
 *     accessible : on ne laisse personne dans un cul-de-sac.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cconnect] erreur de rendu", { digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <p className="text-[11px] uppercase tracking-[0.12em] text-text-faint">
          Erreur
        </p>
        <h1 className="mt-2 text-[22px] font-medium tracking-tight text-text">
          Cette page n&apos;a pas pu se charger
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Le réseau n&apos;a pas répondu, ou ta session a expiré pendant le
          chargement. Rien n&apos;a été modifié : réessayer est sans risque.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button variant="primary" onClick={reset}>
            Réessayer
          </Button>
          <Link
            href="/network"
            className="inline-flex h-9 items-center rounded-sm border border-border-strong bg-surface-raised px-4 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
          >
            Retour à la carte
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-8 border-t border-border pt-4 text-[12px] text-text-faint">
            Si ça se reproduit, communique cette référence :{" "}
            <span className="font-mono text-text-muted">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
