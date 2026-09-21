"use client";

import { useEffect, useRef, useState } from "react";
import { companyInitials } from "@/lib/company-name";
import { companyLogoSrc } from "@/lib/logo-provider";
import type { Company } from "@/lib/types";

/* Les rayons reprennent l'échelle des tokens (xs/sm/md/lg) au lieu des valeurs
   en dur 4/6/8/10, qui étaient les seules du projet hors échelle. */
const SIZES = {
  sm: { box: 28, text: 11, radius: "var(--radius-xs)" },
  md: { box: 36, text: 14, radius: "var(--radius-sm)" },
  lg: { box: 56, text: 19, radius: "var(--radius-md)" },
  xl: { box: 72, text: 24, radius: "var(--radius-lg)" },
} as const;

/**
 * Identité minimale d'une entreprise pour afficher son logo. Le composant
 * n'a jamais besoin de plus : ni de l'id, ni du secteur, ni du slug.
 */
export interface LogoIdentity {
  name: string;
  domain?: string | null;
  logoUrl?: string | null;
}

/**
 * Domaines dont l'image a déjà échoué dans cet onglet.
 *
 * La liste des entreprises se refiltre à chaque frappe, ce qui démonte et
 * remonte les lignes : sans cette mémoire, une entreprise dont le logo n'existe
 * pas repartirait en requête à chaque lettre tapée. Le navigateur cacherait
 * probablement le 404, mais « probablement » n'est pas une politique de cache.
 * Volontairement un `Set` de module, vidé au rechargement de la page : c'est un
 * cache de session, pas un état à administrer.
 */
const failedSources = new Set<string>();

/**
 * Logo d'une entreprise — **le seul endroit du projet qui décide** de ce
 * qu'on affiche à la place d'une entreprise.
 *
 * L'ordre est toujours le même, et il est explicite :
 *
 *   1. `logoUrl` si un membre en a saisi une (elle gagne : c'est un choix
 *      humain contre une déduction) ;
 *   2. sinon, ou si elle ne charge pas, le fournisseur, interrogé par le
 *      **domaine** de l'entreprise ;
 *   3. sinon — pas de domaine, pas de jeton, réseau coupé, 404, image cassée —
 *      le **monogramme**, qui n'échoue jamais.
 *
 * Le monogramme n'est pas un écran d'attente conditionnel : il est rendu
 * **dessous**, tout le temps. L'image se pose par-dessus quand elle arrive. Il
 * en découle trois propriétés qu'un rendu conditionnel n'aurait pas :
 *
 *   - aucun trou pendant le chargement, et aucun décalage à l'arrivée : la
 *     boîte a sa taille définitive dès le premier rendu ;
 *   - pas de squelette qui pulse : l'attente est occupée par la réponse
 *     correcte, ce qui est plus sobre qu'une animation ;
 *   - sans JavaScript, on voit le monogramme. C'est une dégradation juste.
 *
 * Accessibilité : par défaut le logo est **décoratif** (`alt=""`), parce que le
 * nom de l'entreprise est écrit juste à côté partout où ce composant est
 * utilisé. `decorative={false}` donne un `alt` parlant pour un usage où le logo
 * serait seul.
 */
export function CompanyLogo({
  company,
  name,
  domain,
  logoUrl,
  size = "md",
  decorative = true,
}: {
  size?: keyof typeof SIZES;
  decorative?: boolean;
} & (
  | {
      company: LogoIdentity | (Pick<Company, "name"> & Partial<Company>);
      name?: never;
      domain?: never;
      logoUrl?: never;
    }
  | {
      company?: never;
      name: string;
      domain?: string | null;
      logoUrl?: string | null;
    }
)) {
  const identity: LogoIdentity = company ?? { name, domain, logoUrl };
  const { box, text, radius } = SIZES[size];

  /*
   * Candidats dans l'ordre : l'URL saisie, puis le fournisseur. Une URL saisie
   * cassée ne doit pas masquer un logo que le domaine permet d'obtenir.
   *
   * L'état est rattaché à une **source**, pas à l'instance : le même composant
   * reçoit une autre source quand le domaine change (aperçu du formulaire
   * d'entreprise, liste refiltrée). Un booléen `broken` survivait alors au
   * changement et gardait le monogramme devant un logo valide.
   */
  const candidates = [identity.logoUrl, companyLogoSrc(identity.domain, box)];
  const [, setFailures] = useState(0);
  const src =
    candidates.find(
      (candidate): candidate is string =>
        Boolean(candidate) && !failedSources.has(candidate!),
    ) ?? null;

  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = src !== null && loadedSrc === src;

  const imageRef = useRef<HTMLImageElement>(null);

  /**
   * Suit l'image sans dépendre d'un événement qu'on aurait pu manquer.
   *
   * Le HTML est rendu sur le serveur : le navigateur charge les logos pendant
   * que React hydrate. Selon lequel des deux gagne, `load` est émis avant que
   * le gestionnaire ne soit posé (l'image restait alors invisible derrière son
   * monogramme, définitivement) ou après. On ferme la course en faisant les
   * deux dans le même effet : on lit d'abord l'état réel du nœud, et on n'écoute
   * que s'il n'a pas encore abouti.
   *
   * `complete` avec une largeur naturelle nulle, c'est un échec — le 404 du
   * fournisseur pour une entreprise qu'il ne connaît pas.
   */
  useEffect(() => {
    const node = imageRef.current;
    if (!node || src === null) return;

    // L'échec est mémorisé pour la session ; le rendu suivant passe au
    // candidat d'après, ou au monogramme s'il n'y en a plus.
    const fail = () => {
      failedSources.add(src);
      setFailures((n) => n + 1);
    };

    if (node.complete) {
      if (node.naturalWidth > 0) setLoadedSrc(src);
      else fail();
      return;
    }

    const onLoad = () => setLoadedSrc(src);
    node.addEventListener("load", onLoad);
    node.addEventListener("error", fail);
    return () => {
      node.removeEventListener("load", onLoad);
      node.removeEventListener("error", fail);
    };
  }, [src]);

  const showImage = src !== null;

  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden border border-border-strong bg-surface"
      style={{ width: box, height: box, borderRadius: radius }}
    >
      {/* Le monogramme, toujours présent sous l'image. C'est lui qui est posé
          en absolu, pas l'image : une image en absolu voyait sa taille dépendre
          du bloc conteneur, se retrouvait mesurée à 0 × 0 pendant la mise en
          page, et Chrome ne déclenchait alors jamais son chargement paresseux.
          L'image garde donc une taille propre, en pixels. */}
      <span
        aria-hidden
        className="absolute inset-0 grid place-items-center font-mono tracking-tight text-text-muted"
        style={{ fontSize: text * 0.82 }}
      >
        {companyInitials(identity.name)}
      </span>

      {showImage ? (
        /* Hôte externe inconnu à la compilation : next/image n'apporterait rien
           et exigerait une allowlist de domaines à maintenir en double de la
           CSP. `referrerPolicy` évite d'apprendre au fournisseur quelle page
           d'un réseau privé affiche quelle entreprise. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={imageRef}
          src={src}
          alt={decorative ? "" : `Logo de ${identity.name}`}
          width={box}
          height={box}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          style={{ width: box, height: box }}
          className={`relative bg-surface object-contain p-[2px] transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </span>
  );
}
