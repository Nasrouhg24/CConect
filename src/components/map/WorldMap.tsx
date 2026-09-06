"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import worldTopo from "world-atlas/countries-110m.json";
import type { PlaceCluster } from "@/lib/entries";
import { MapControls } from "./MapControls";

const MIN_SCALE = 1;
const MAX_SCALE = 14;
/** Marge haute réservée à la barre de recherche flottante. */
const TOP_INSET = 76;

/**
 * Carte vectorielle rendue en SVG : pas de tuiles, pas de clé API, aucune
 * requête réseau. La géométrie vient de `world-atlas` (Natural Earth, domaine
 * public).
 *
 * La projection est recalculée à la taille réelle du conteneur plutôt que
 * posée dans un viewBox fixe : c'est ce qui permet à la carte d'occuper toute
 * la largeur sans jamais rogner un continent.
 *
 * Zoom et déplacement sont une transformation `translate(x y) scale(k)` avec
 * `transform-origin: 0 0`, ce qui permet de zoomer exactement sous le
 * curseur : x' = mx − (mx − x) · k'/k.
 */
const COUNTRIES = (() => {
  const topology = worldTopo as unknown as Topology;
  const collection = feature(
    topology,
    topology.objects.countries,
  ) as unknown as GeoJSON.FeatureCollection;
  return collection.features;
})();

interface View {
  k: number;
  x: number;
  y: number;
}

const HOME: View = { k: 1, x: 0, y: 0 };

export interface WorldMapProps {
  clusters: PlaceCluster[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string | null) => void;
  /** Un panneau contextuel occupe la droite de la carte. */
  panelOpen?: boolean;
}

export function WorldMap({
  clusters,
  selectedPlaceId,
  onSelectPlace,
  panelOpen = false,
}: WorldMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 640 });
  const [view, setView] = useState<View>(HOME);
  const [eased, setEased] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const { projection, spherePath, countryPaths } = useMemo(() => {
    const proj = geoNaturalEarth1().fitExtent(
      [
        [8, TOP_INSET],
        [size.w - 8, size.h - 8],
      ],
      { type: "Sphere" } as GeoPermissibleObjects,
    );
    const builder = geoPath(proj);
    return {
      projection: proj,
      spherePath: builder({ type: "Sphere" } as GeoPermissibleObjects) ?? "",
      countryPaths: COUNTRIES.map((f, i) => ({
        id: `c${i}`,
        d: builder(f as unknown as GeoPermissibleObjects) ?? "",
      })).filter((c) => c.d.length > 0),
    };
  }, [size.w, size.h]);

  const clampView = useCallback(
    (next: View): View => {
      const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.k));
      return {
        k,
        x: Math.min(0, Math.max(-size.w * (k - 1), next.x)),
        y: Math.min(0, Math.max(-size.h * (k - 1), next.y)),
      };
    },
    [size.w, size.h],
  );

  const maxCount = useMemo(
    () => clusters.reduce((m, c) => Math.max(m, c.entries.length), 1),
    [clusters],
  );

  const points = useMemo(
    () =>
      clusters.flatMap((cluster) => {
        const xy = projection([cluster.place.lng, cluster.place.lat]);
        if (!xy) return [];
        const count = cluster.entries.length;
        // Aire proportionnelle au volume : le rayon suit la racine.
        const r = 5 + Math.sqrt(count / maxCount) * 9;
        return [
          {
            cluster,
            cx: xy[0],
            cy: xy[1],
            r,
            tone:
              count >= Math.max(4, maxCount * 0.6)
                ? "var(--color-node-3)"
                : count > 1
                  ? "var(--color-node-2)"
                  : "var(--color-node-1)",
          },
        ];
      }),
    [clusters, maxCount, projection],
  );

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { mx: 0, my: 0 };
    return { mx: clientX - rect.left, my: clientY - rect.top };
  }, []);

  const zoomAt = useCallback(
    (factor: number, mx: number, my: number, smooth = false) => {
      setEased(smooth);
      setView((v) => {
        const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.k * factor));
        if (k === v.k) return v;
        const ratio = k / v.k;
        return clampView({
          k,
          x: mx - (mx - v.x) * ratio,
          y: my - (my - v.y) * ratio,
        });
      });
    },
    [clampView],
  );

  const zoomFromCenter = useCallback(
    (factor: number) => zoomAt(factor, size.w / 2, size.h / 2, true),
    [zoomAt, size.w, size.h],
  );

  const reset = useCallback(() => {
    setEased(true);
    setView(HOME);
  }, []);

  /**
   * `wheel` est attaché à la main : React l'enregistre en écouteur passif, ce
   * qui interdit `preventDefault()` et laisse la page défiler pendant le zoom.
   */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { mx, my } = toLocal(event.clientX, event.clientY);
      // Pincement trackpad : Chrome le signale via ctrlKey.
      const intensity = event.ctrlKey ? 0.015 : 0.0022;
      zoomAt(Math.exp(-event.deltaY * intensity), mx, my);
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [toLocal, zoomAt]);

  const zoomed = view.k > 1.001;

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
      moved: false,
    };
    setEased(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
    setView((v) => clampView({ ...v, x: d.originX + dx, y: d.originY + dy }));
  }

  function endDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      drag.current = null;
    }
  }

  const active = hovered ?? selectedPlaceId;
  const activePoint = points.find((p) => p.cluster.place.id === active);

  return (
    <div ref={hostRef} className="relative h-full w-full overflow-hidden bg-base">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        className={`block h-full w-full touch-none select-none ${
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
        role="application"
        aria-label="Carte du réseau CConnect : villes où la communauté a des expériences et des contacts"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(event) => {
          const { mx, my } = toLocal(event.clientX, event.clientY);
          zoomAt(1.8, mx, my, true);
        }}
      >
        <g
          transform={`translate(${view.x} ${view.y}) scale(${view.k})`}
          style={{
            transformOrigin: "0 0",
            transition: eased
              ? "transform 260ms cubic-bezier(0.22,1,0.36,1)"
              : undefined,
          }}
        >
          <path d={spherePath} fill="#090e15" />
          <g
            fill="#1a242f"
            stroke="#2b3846"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          >
            {countryPaths.map((c) => (
              <path key={c.id} d={c.d} />
            ))}
          </g>

          {/* Liens ténus vers le nœud actif : un réseau, pas des épingles. */}
          {activePoint
            ? points
                .filter((p) => p !== activePoint)
                .map((p) => (
                  <line
                    key={`link-${p.cluster.place.id}`}
                    x1={activePoint.cx}
                    y1={activePoint.cy}
                    x2={p.cx}
                    y2={p.cy}
                    stroke="var(--color-accent)"
                    strokeOpacity={0.16}
                    strokeWidth={0.7 / view.k}
                  />
                ))
            : null}

          {points.map(({ cluster, cx, cy, r, tone }, index) => {
            const isActive = cluster.place.id === active;
            const isSelected = cluster.place.id === selectedPlaceId;
            const radius = r / view.k;
            return (
              <g
                key={cluster.place.id}
                transform={`translate(${cx} ${cy})`}
                className="cursor-pointer"
                onPointerEnter={() => setHovered(cluster.place.id)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => {
                  if (drag.current?.moved) return;
                  setFocusIndex(index);
                  onSelectPlace(isSelected ? null : cluster.place.id);
                }}
              >
                {/* Cible de clic confortable, invisible. */}
                <circle r={Math.max(radius * 1.9, 11 / view.k)} fill="transparent" />
                {isSelected || isActive ? (
                  <circle
                    r={radius + 4.5 / view.k}
                    fill="none"
                    stroke={isSelected ? "var(--color-accent)" : tone}
                    strokeOpacity={isSelected ? 0.9 : 0.45}
                    strokeWidth={1.2 / view.k}
                  />
                ) : null}
                <circle
                  r={radius}
                  fill={tone}
                  fillOpacity={isActive ? 0.95 : 0.8}
                  stroke="var(--color-base)"
                  strokeWidth={1.2 / view.k}
                />
                {cluster.entries.length > 1 ? (
                  <text
                    y={radius * 0.36}
                    textAnchor="middle"
                    fontSize={(r * 0.8) / view.k}
                    fontWeight={600}
                    fill="var(--color-base)"
                    pointerEvents="none"
                  >
                    {cluster.entries.length}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Parcours clavier des marqueurs — hors du SVG pour rester focusable. */}
      <button
        type="button"
        className="sr-only"
        onFocus={() => setHovered(points[focusIndex]?.cluster.place.id ?? null)}
        onBlur={() => setHovered(null)}
        onKeyDown={(event) => {
          if (points.length === 0) return;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            const next = (focusIndex + 1) % points.length;
            setFocusIndex(next);
            setHovered(points[next].cluster.place.id);
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            const next = (focusIndex - 1 + points.length) % points.length;
            setFocusIndex(next);
            setHovered(points[next].cluster.place.id);
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectPlace(points[focusIndex].cluster.place.id);
          }
        }}
      >
        Parcourir les villes du réseau au clavier
      </button>

      {activePoint ? (
        <div
          className="animate-fade pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-sm border border-border-strong bg-surface-raised px-2.5 py-1.5 shadow-[var(--shadow-panel)]"
          style={{
            left: activePoint.cx * view.k + view.x,
            top: activePoint.cy * view.k + view.y - activePoint.r - 14,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-[13px] font-medium leading-tight text-text">
            {activePoint.cluster.place.city}
          </p>
          <p className="text-[11px] leading-tight text-text-muted">
            {activePoint.cluster.experienceCount} exp. ·{" "}
            {activePoint.cluster.contactCount} contact
            {activePoint.cluster.contactCount > 1 ? "s" : ""}
          </p>
        </div>
      ) : null}

      <MapControls
        onZoomIn={() => zoomFromCenter(1.55)}
        onZoomOut={() => zoomFromCenter(1 / 1.55)}
        onReset={reset}
        canZoomIn={view.k < MAX_SCALE - 0.01}
        canZoomOut={zoomed}
        canReset={zoomed}
        zoomLabel={`${view.k.toFixed(1)}×`}
        shifted={panelOpen}
      />
    </div>
  );
}
