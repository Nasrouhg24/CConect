import Link from "next/link";
import { BrandMark } from "@/components/Brand";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { NetworkSample } from "@/lib/entries";
import { STATUS_LABELS } from "@/lib/labels";

type NodeKey = "company" | "alumni" | "student" | "place";

/* Positions en % de la zone de dessin. Le centre est la marque ; les quatre
   nœuds s'en écartent de façon inégale, pour qu'on lise une constellation et
   non un schéma en croix. */
const POSITIONS: Record<NodeKey, { x: number; y: number }> = {
  company: { x: 21, y: 27 },
  alumni: { x: 77, y: 15 },
  student: { x: 80, y: 70 },
  place: { x: 27, y: 83 },
};
const CENTER = { x: 50, y: 49 };

interface PreviewNode {
  key: NodeKey;
  href: string;
  name: string;
  label: string;
  mark: React.ReactNode;
}

/**
 * Aperçu du réseau — la proposition de valeur, dessinée.
 *
 * Quatre éléments réels autour de la marque : une entreprise, un alumni, un
 * étudiant, une ville. Ce n'est pas une visualisation : aucun volume, aucun
 * chiffre, aucune prétention d'exhaustivité. Les liens vers le centre disent
 * « CConnect relie » ; les liens pointillés entre une personne et l'entreprise
 * n'existent que si cette personne y est vraiment passée.
 *
 * Aucun JavaScript. Les liens se tracent une fois à l'arrivée, et le survol
 * d'un nœud éclaire les siens — deux règles CSS (`.net-*` dans globals.css).
 * Sous 640 px, l'aperçu se réduit à une ligne : entreprise — marque — étudiant.
 */
export function NetworkPreview({ sample }: { sample: NetworkSample }) {
  const nodes: PreviewNode[] = [];

  if (sample.company) {
    nodes.push({
      key: "company",
      href: `/companies/${sample.company.slug}`,
      name: sample.company.name,
      label: "entreprise",
      mark: <CompanyLogo company={sample.company} size="sm" />,
    });
  }
  for (const key of ["alumni", "student"] as const) {
    const person = sample[key];
    if (!person) continue;
    nodes.push({
      key,
      href: `/network?q=${encodeURIComponent(person.author.fullName)}`,
      name: person.author.fullName,
      label: STATUS_LABELS[person.author.status].toLowerCase(),
      mark: (
        <span className="monogram h-7 w-7 rounded-xs text-micro">
          {person.author.fullName.slice(0, 1)}
        </span>
      ),
    });
  }
  if (sample.place) {
    nodes.push({
      key: "place",
      href: `/network?q=${encodeURIComponent(sample.place.city)}`,
      name: sample.place.city,
      label: "ville",
      mark: (
        <span className="monogram h-7 w-7 rounded-xs text-micro">
          {sample.place.countryCode}
        </span>
      ),
    });
  }

  // Liens réels personne → entreprise, en pointillé.
  const crossLinks = sample.company
    ? (["alumni", "student"] as const).filter((key) => sample[key]?.linked)
    : [];

  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const mobile = [byKey.get("company"), byKey.get("student") ?? byKey.get("alumni")].filter(
    (n): n is PreviewNode => Boolean(n),
  );

  return (
    <figure aria-label="Aperçu du réseau CConnect" className="net">
      {/* ---- Desktop et tablette : la constellation ---------------------- */}
      <div className="relative hidden aspect-[5/4] w-full sm:block">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          {nodes.map((node, i) => (
            <line
              key={node.key}
              data-edge={node.key}
              className="net-edge"
              style={{ animationDelay: `${120 + i * 110}ms` }}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={POSITIONS[node.key].x}
              y2={POSITIONS[node.key].y}
              pathLength={1}
            />
          ))}
          {crossLinks.map((key, i) => (
            <line
              key={`cross-${key}`}
              data-edge={`${key} company`}
              className="net-edge net-edge--cross"
              style={{ animationDelay: `${600 + i * 140}ms` }}
              x1={POSITIONS.company.x}
              y1={POSITIONS.company.y}
              x2={POSITIONS[key].x}
              y2={POSITIONS[key].y}
            />
          ))}
        </svg>

        <span
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
          style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
        >
          <span className="monogram monogram-invert h-12 w-12 rounded-md bg-base">
            <BrandMark className="h-6 w-6" />
          </span>
          <span className="font-mono text-label text-text-faint">cconnect</span>
        </span>

        {nodes.map((node) => (
          <Link
            key={node.key}
            href={node.href}
            data-node={node.key}
            className="net-node absolute flex max-w-[12rem] -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-sm border border-border bg-base py-1.5 pl-1.5 pr-3 transition-colors duration-150 hover:border-border-strong hover:bg-surface-raised"
            style={{ left: `${POSITIONS[node.key].x}%`, top: `${POSITIONS[node.key].y}%` }}
          >
            {node.mark}
            <span className="min-w-0">
              <span className="block truncate text-list font-medium text-text">{node.name}</span>
              <span className="block font-mono text-label text-text-faint">{node.label}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* ---- Mobile : une ligne ----------------------------------------- */}
      {mobile.length > 0 ? (
        <div className="flex items-center gap-3 sm:hidden">
          {mobile.map((node, i) => (
            <span key={node.key} className="contents">
              {i === 1 ? (
                <>
                  <span aria-hidden className="h-px flex-1 bg-border-strong/60" />
                  <span className="monogram monogram-invert h-9 w-9 shrink-0 rounded-sm">
                    <BrandMark className="h-4 w-4" />
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-border-strong/60" />
                </>
              ) : null}
              <Link href={node.href} className="flex min-w-0 shrink items-center gap-2">
                {node.mark}
                <span className="min-w-0">
                  <span className="block truncate text-list font-medium text-text">{node.name}</span>
                  <span className="block font-mono text-label text-text-faint">{node.label}</span>
                </span>
              </Link>
            </span>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
