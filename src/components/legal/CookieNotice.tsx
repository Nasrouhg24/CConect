"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { NOTICE_COOKIE, NOTICE_COOKIE_MAX_AGE, POLICY_VERSION } from "@/lib/legal";

/**
 * Bandeau d'information sur les cookies.
 *
 * Ce n'est pas une demande de consentement, et sa forme le dit&nbsp;: un seul
 * bouton, « J'ai compris ». Tous les cookies du site sont strictement
 * nécessaires — proposer « Refuser » serait mentir, puisque refuser le cookie
 * de session reviendrait à refuser de se connecter. Voir `/legal/cookies`.
 *
 * Le bandeau se pose en bas, au-dessus du contenu mais sans le recouvrir : il
 * ne bloque rien, et il ne réapparaît pas une fois lu. La mémoire est un cookie
 * plutôt qu'un `localStorage` parce que le serveur doit la lire pour ne pas
 * rendre le bandeau du tout — sinon il clignote à chaque chargement, le temps
 * que le navigateur reprenne la main.
 *
 * Le cookie porte la version des politiques : une nouvelle version réaffiche
 * l'information, sans quoi un changement de traitement passerait inaperçu chez
 * ceux qui ont déjà lu le bandeau une fois.
 */
export function CookieNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const acknowledge = () => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${NOTICE_COOKIE}=${POLICY_VERSION}; Path=/; Max-Age=${NOTICE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Information sur les cookies"
      className="animate-fade pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6"
    >
      <div className="pointer-events-auto mx-auto flex max-w-content flex-col gap-3 rounded-md border border-border bg-surface-raised p-4 shadow-[var(--shadow-overlay)] sm:flex-row sm:items-center sm:gap-5">
        <p className="text-body text-text-muted">
          Ce site ne pose que les cookies nécessaires à ta connexion. Pas de
          mesure d&apos;audience, pas de traceur, rien à refuser —{" "}
          <Link
            href="/legal/cookies"
            className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            le détail est ici
          </Link>
          .
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={acknowledge}
          className="shrink-0 sm:ml-auto"
        >
          J&apos;ai compris
        </Button>
      </div>
    </div>
  );
}
