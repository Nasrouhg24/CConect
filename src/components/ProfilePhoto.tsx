"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Button } from "@/components/ui";
import { avatarDisplay } from "@/lib/avatar";

/** Types acceptés — la même liste que le serveur, qui revalide tout. */
const ACCEPT = "image/jpeg,image/png,image/webp";
const ACCEPTED = new Set(ACCEPT.split(","));
/** Plafond avant recadrage : l'envoi, lui, fait quelques centaines de Ko. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MIN_SIDE = 128;
const VIEWPORT = 256;
const OUTPUT = 1024;
const MIN_OUTPUT = 256;
const MAX_ZOOM = 3;

interface Source {
  url: string;
  image: HTMLImageElement;
  width: number;
  height: number;
}

/** Une caméra n'est proposée que sur un appareil tactile, où `capture` a un sens. */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(pointer: coarse)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

/**
 * Photo de profil : l'avatar, et la fenêtre qui permet de la changer.
 *
 * Le recadrage se fait ici, dans un canvas, pour n'envoyer qu'un carré de
 * 1024 px : une photo de téléphone de 8 Mo devient un envoi de quelques
 * centaines de Ko. Le serveur ne fait confiance à rien de ce qui arrive — il
 * revérifie le contenu et réencode l'image.
 */
export function ProfilePhoto({
  member,
  version,
}: {
  member: { id: string; fullName: string };
  version: string | null;
}) {
  const router = useRouter();
  const coarse = useCoarsePointer();
  const display = avatarDisplay(member, version);
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "remove" | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);

  const clearSource = useCallback(() => {
    setSource((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const close = useCallback(() => {
    if (pending) return;
    clearSource();
    setError(null);
    setOpen(false);
    triggerRef.current?.focus();
  }, [clearSource, pending]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("button, [tabindex='0']")?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, source, close]);

  const scaleFor = (s: Source, z: number) => (VIEWPORT / Math.min(s.width, s.height)) * z;

  const clamp = (s: Source, z: number, x: number, y: number) => {
    const scale = scaleFor(s, z);
    return {
      x: Math.min(0, Math.max(VIEWPORT - s.width * scale, x)),
      y: Math.min(0, Math.max(VIEWPORT - s.height * scale, y)),
    };
  };

  function pick(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.has(file.type)) {
      setError("Format non accepté : JPEG, PNG ou WebP uniquement.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("Image trop lourde pour être recadrée.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image;
      if (Math.min(width, height) < MIN_SIDE) {
        URL.revokeObjectURL(url);
        setError(`Image trop petite : ${MIN_SIDE} px de côté au minimum.`);
        return;
      }
      clearSource();
      const next = { url, image, width, height };
      const scale = scaleFor(next, 1);
      setSource(next);
      setZoom(1);
      // Centré au départ.
      setOffset({ x: (VIEWPORT - width * scale) / 2, y: (VIEWPORT - height * scale) / 2 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Image illisible.");
    };
    image.src = url;
  }

  function changeZoom(next: number) {
    if (!source) return;
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    // Le point au centre du cadre reste au centre en zoomant.
    const before = scaleFor(source, zoom);
    const after = scaleFor(source, z);
    const cx = (VIEWPORT / 2 - offset.x) / before;
    const cy = (VIEWPORT / 2 - offset.y) / before;
    setZoom(z);
    setOffset(clamp(source, z, VIEWPORT / 2 - cx * after, VIEWPORT / 2 - cy * after));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!source) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId || !source) return;
    setOffset(clamp(source, zoom, d.ox + event.clientX - d.x, d.oy + event.clientY - d.y));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === event.pointerId) drag.current = null;
  }

  function onCropKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!source) return;
    const step = event.shiftKey ? 32 : 8;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      setOffset(clamp(source, zoom, offset.x + dx, offset.y + dy));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      changeZoom(zoom + 0.1);
    } else if (event.key === "-") {
      event.preventDefault();
      changeZoom(zoom - 0.1);
    }
  }

  async function save() {
    if (!source) return;
    setPending("save");
    setError(null);
    try {
      const scale = scaleFor(source, zoom);
      const side = VIEWPORT / scale;
      // Un petit original zoomé donnerait un recadrage sous le minimum du
      // serveur : on agrandit plutôt que de refuser un choix légitime.
      const out = Math.round(Math.max(MIN_OUTPUT, Math.min(OUTPUT, side)));
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas");
      context.imageSmoothingQuality = "high";
      context.drawImage(source.image, -offset.x / scale, -offset.y / scale, side, side, 0, 0, out, out);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("encode");

      const body = new FormData();
      body.append("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/profile-photo", { method: "POST", body });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || !result?.ok) {
        setError(result?.message ?? "Enregistrement impossible. Réessaie.");
        return;
      }
      clearSource();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Recadrage impossible sur ce navigateur.");
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    setPending("remove");
    setError(null);
    try {
      const response = await fetch("/api/profile-photo", { method: "DELETE" });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || !result?.ok) {
        setError(result?.message ?? "Suppression impossible. Réessaie.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Suppression impossible. Réessaie.");
    } finally {
      setPending(null);
    }
  }

  const scale = source ? scaleFor(source, zoom) : 1;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={version ? "Changer ma photo de profil" : "Ajouter une photo de profil"}
        className="group relative h-16 w-16 shrink-0 rounded-md"
      >
        <Avatar display={display} className="h-16 w-16 rounded-md text-section" />
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-border-strong bg-surface-raised text-text-muted transition-colors group-hover:text-text"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3">
            <path
              d="M7.5 2.5l2 2M2 10l.5-2.5L8 2l2 2-5.5 5.5L2 10z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          className="animate-fade fixed inset-0 z-50 grid place-items-center bg-base/70 p-4 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm overflow-hidden rounded-md border border-border bg-surface-raised shadow-[var(--shadow-overlay)]"
          >
            <header className="border-b border-border px-5 py-4">
              <h2 id={titleId} className="text-section text-text">
                Photo de profil
              </h2>
              <p className="mt-0.5 text-meta text-text-muted">
                Visible par les membres, comme ton profil. JPEG, PNG ou WebP.
              </p>
            </header>

            <div className="px-5 py-5">
              {source ? (
                <div className="flex flex-col items-center">
                  <div
                    tabIndex={0}
                    role="img"
                    aria-label="Recadrage : fais glisser l'image, flèches pour déplacer, + et − pour zoomer"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onKeyDown={onCropKey}
                    className="relative cursor-grab touch-none select-none overflow-hidden rounded-sm border border-border-strong bg-surface active:cursor-grabbing"
                    style={{ width: VIEWPORT, height: VIEWPORT }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), rien à optimiser */}
                    <img
                      src={source.url}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute left-0 top-0 max-w-none"
                      style={{
                        width: source.width * scale,
                        height: source.height * scale,
                        transform: `translate(${offset.x}px, ${offset.y}px)`,
                      }}
                    />
                  </div>
                  <label className="mt-4 flex w-full items-center gap-3 text-meta text-text-muted">
                    <span>Zoom</span>
                    <input
                      type="range"
                      min={1}
                      max={MAX_ZOOM}
                      step={0.01}
                      value={zoom}
                      onChange={(e) => changeZoom(Number(e.target.value))}
                      className="flex-1 accent-[var(--color-accent)]"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Avatar display={display} className="h-24 w-24 rounded-md text-title" />
                  <div className="flex w-full flex-col gap-2">
                    <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                      {version ? "Choisir une autre image" : "Importer une image"}
                    </Button>
                    {coarse ? (
                      <Button variant="secondary" onClick={() => cameraRef.current?.click()}>
                        Prendre une photo
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <input
                ref={cameraRef}
                type="file"
                accept={ACCEPT}
                capture="user"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              {error ? (
                <p role="alert" className="mt-4 text-meta text-danger">
                  {error}
                </p>
              ) : null}
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3.5">
              {version && !source ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={remove}
                  loading={pending === "remove"}
                  disabled={Boolean(pending)}
                >
                  Supprimer
                </Button>
              ) : null}
              <div className="ml-auto flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={source ? clearSource : close}
                  disabled={Boolean(pending)}
                >
                  {source ? "Retour" : "Fermer"}
                </Button>
                {source ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={save}
                    loading={pending === "save"}
                    disabled={Boolean(pending)}
                  >
                    Enregistrer
                  </Button>
                ) : null}
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Avatar({
  display,
  className,
}: {
  display: ReturnType<typeof avatarDisplay>;
  className: string;
}) {
  if (display.kind === "photo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- image privée servie avec la session, hors de l'optimiseur
      <img
        src={display.src}
        alt={display.alt}
        className={`block ${className} border border-border object-cover`}
      />
    );
  }
  return (
    <span aria-hidden className={`monogram monogram-invert ${className}`}>
      {display.initial}
    </span>
  );
}
