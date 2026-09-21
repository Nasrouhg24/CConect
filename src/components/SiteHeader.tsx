"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { BrandLockup } from "./Brand";
import { IconButton } from "./ui";
import { buttonClass } from "./ui/button";
import { CAMPUS_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { Author } from "@/lib/types";
import { avatarDisplay } from "@/lib/avatar";

const NAV = [
  { href: "/network", label: "Carte" },
  { href: "/companies", label: "Entreprises" },
  { href: "/people", label: "Personnes" },
  { href: "/contribute", label: "Ajouter" },
  { href: "/stats", label: "Couverture" },
  { href: "/advisor", label: "Conseiller" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barre de navigation.
 *
 * Quatre destinations, des mots d'une seule syllabe de lecture : « Carte »
 * dit ce qu'on voit, là où « Réseau » nommait un concept. L'ordre suit le
 * parcours réel : on cherche (Carte), on creuse (Entreprises), on ajoute
 * (Ajouter), on regarde ce qui manque (Couverture).
 *
 * Trois zones séparées par un filet vertical : la marque, les destinations,
 * le compte. Le compte ne se mêle pas à la navigation — ce n'est pas un
 * endroit où l'on va, c'est qui l'on est.
 */
export function SiteHeader({
  member,
  photoVersion = null,
}: {
  member: Author | null;
  /** Version de la photo du membre connecté ; `null` → initiale. */
  photoVersion?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Une navigation ferme le menu mobile, y compris par le bouton retour.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    /* Sticky, mais opaque : rester à portée au défilement est un
       comportement utile ; laisser le contenu transparaître à travers un flou
       n'en est pas un. Un filet d'encre sépare l'en-tête du document, comme
       en haut d'une page imprimée. */
    <header
      className="sticky top-0 z-40 border-b border-border bg-base"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
    >
      {/* Même colonne que le contenu : à 1600 px, la marque se décollait de la
          page de près de 200 px sur un grand écran, et l'en-tête ne se lisait
          plus comme le haut du document. */}
      <div className="mx-auto flex h-14 max-w-content items-center px-4 sm:px-6">
        <Link
          href="/"
          aria-label="CConnect — accueil"
          className="-ml-1 flex h-10 items-center rounded-sm px-1"
        >
          <BrandLockup />
        </Link>

        <span aria-hidden className="mx-5 hidden h-5 w-px bg-border md:block" />

        <nav
          className="hidden h-full flex-1 items-stretch gap-1 md:flex"
          aria-label="Navigation principale"
        >
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group relative flex items-center focus-visible:outline-none"
              >
                <span
                  className={`flex h-8 items-center rounded-sm px-2.5 text-list transition-colors duration-150 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent ${
                    active
                      ? "font-medium text-text"
                      : "text-text-muted group-hover:bg-surface-hover group-hover:text-text"
                  }`}
                >
                  {item.label}
                </span>
                {/* Le filet vert se pose sur la bordure de l'en-tête : l'onglet
                    courant se lit par sa forme, la couleur ne fait que le
                    confirmer (WCAG 1.4.1). `aria-current` porte l'information
                    pour les lecteurs d'écran. */}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-t-xs bg-accent"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {member ? (
            <AccountMenu member={member} photoVersion={photoVersion} />
          ) : (
            <Link href="/login" className={buttonClass({ variant: "primary", size: "sm" })}>
              Se connecter
            </Link>
          )}

          <IconButton
            label={open ? "Fermer le menu" : "Menu"}
            variant="ghost"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="md:hidden"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
              {open ? (
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              ) : (
                <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              )}
            </svg>
          </IconButton>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Navigation principale"
          className="animate-fade border-t border-border bg-surface px-4 py-2 sm:px-6 md:hidden"
        >
          <ul className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`relative flex h-11 items-center rounded-sm px-3 text-body transition-colors duration-150 ${
                      active
                        ? "bg-surface-hover font-medium text-text"
                        : "text-text-muted hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    {active ? (
                      <span aria-hidden className="absolute inset-y-2.5 left-0 w-0.5 rounded-r-xs bg-accent" />
                    ) : null}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

const ACCOUNT_LINKS = [
  [
    { href: "/profile", label: "Mon profil" },
    { href: "/profile#contributions", label: "Mes contributions" },
  ],
  [{ href: "/companies/new", label: "Nouvelle entreprise" }],
  // Navigation expérimentale : discrète, jamais le chemin par défaut.
  [{ href: "/terminal", label: "Mode terminal" }],
] as const;

/**
 * Menu du compte — motif « menu button » de l'ARIA APG : flèches pour se
 * déplacer, Échap pour refermer et rendre le focus au déclencheur, Tab ou un
 * clic ailleurs pour sortir.
 */
function AccountMenu({ member, photoVersion }: { member: Author; photoVersion: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => list[(i + list.length) % list.length]?.focus();
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(list.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const firstName = member.fullName.split(" ")[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Compte de ${member.fullName}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex h-9 items-center gap-2 rounded-sm border pl-1 pr-1.5 text-list transition-colors duration-150 sm:pr-2 ${
          open
            ? "border-border bg-surface-hover text-text"
            : "border-transparent text-text-muted hover:bg-surface-hover hover:text-text"
        }`}
      >
        <HeaderAvatar member={member} version={photoVersion} className="h-7 w-7 rounded-xs text-micro" />
        <span className="hidden max-w-[9rem] truncate sm:inline">{firstName}</span>
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 text-text-faint transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Compte"
          onKeyDown={onMenuKeyDown}
          className="animate-fade absolute right-0 top-[calc(100%+6px)] z-50 w-64 overflow-hidden rounded-md border border-border bg-surface-raised shadow-[var(--shadow-overlay)]"
        >
          <div className="flex items-center gap-3 border-b border-border px-3.5 py-3">
            <HeaderAvatar member={member} version={photoVersion} className="h-9 w-9 rounded-sm text-list" />
            <div className="min-w-0">
              <p className="truncate text-list font-medium text-text">{member.fullName}</p>
              <p className="truncate text-meta text-text-faint">
                {STATUS_LABELS[member.status]} {member.promotion} · {CAMPUS_LABELS[member.campus]}
              </p>
            </div>
          </div>

          {ACCOUNT_LINKS.map((group, i) => (
            <div
              key={i}
              role="group"
              className={`p-1 ${i > 0 ? "border-t border-border" : ""}`}
            >
              {group.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  className="flex h-9 items-center rounded-xs px-2.5 text-list text-text-muted outline-none transition-colors duration-100 hover:bg-surface-hover hover:text-text focus-visible:bg-surface-hover focus-visible:text-text"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Photo du membre si elle existe, sinon la même initiale qu'avant. */
function HeaderAvatar({
  member,
  version,
  className,
}: {
  member: Author;
  version: string | null;
  className: string;
}) {
  const display = avatarDisplay(member, version);
  if (display.kind === "photo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- image privée servie avec la session, hors de l'optimiseur
      <img src={display.src} alt="" className={`block shrink-0 border border-border object-cover ${className}`} />
    );
  }
  return (
    <span aria-hidden className={`monogram monogram-invert ${className}`}>
      {display.initial}
    </span>
  );
}
