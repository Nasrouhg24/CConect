"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLockup } from "./Brand";
import type { Author } from "@/lib/types";

const NAV = [
  { href: "/network", label: "Réseau" },
  { href: "/companies", label: "Entreprises" },
  { href: "/stats", label: "Statistiques" },
  { href: "/contribute", label: "Contribuer" },
] as const;

/**
 * Barre de navigation.
 *
 * Quatre destinations, pas une de plus : chaque entrée correspond à un écran
 * qui existe vraiment. Les liens d'administration n'apparaîtront que pour les
 * modérateurs, quand cet écran existera.
 */
export function SiteHeader({ member }: { member: Author | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="CConnect — accueil">
          <BrandLockup />
        </Link>

        <nav className="hidden flex-1 items-center gap-0.5 md:flex" aria-label="Navigation principale">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-sm px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-surface-hover text-text"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {member ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-sm border border-border px-2.5 py-1.5 text-[13px] text-text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                {member.fullName.slice(0, 1)}
              </span>
              <span className="hidden sm:inline">Profil</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-sm bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Se connecter
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Menu"
            className="grid h-8 w-8 place-items-center rounded-sm border border-border text-text-muted transition-colors hover:text-text md:hidden"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
              <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="animate-fade border-t border-border bg-surface px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-sm px-2 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
