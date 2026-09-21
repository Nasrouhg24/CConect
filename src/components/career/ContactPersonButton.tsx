"use client";

import { useState } from "react";
import { ContactModal } from "@/components/network/ContactModal";
import { buttonClass } from "@/components/ui/button";
import type { Entry } from "@/lib/types";

/**
 * Ouvre la même modale de mise en relation que la carte et les fiches
 * entreprise, ancrée sur une expérience précise : le brouillon cite ce dont
 * on veut parler, pas « ton profil ».
 */
export function ContactPersonButton({ entry, label }: { entry: Entry; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass({ variant: "primary", size: "sm" })}
      >
        {label}
      </button>
      {open ? <ContactModal entry={entry} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
