import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { MEMBER_STATUSES, STATUS_DESCRIPTIONS, STATUS_LABELS } from "@/lib/labels";
import type { Author } from "@/lib/types";

/**
 * Dernière section de l'accueil et de la Couverture.
 *
 * Pour un visiteur : comment rejoindre — Student ou Alumni, puis la connexion
 * UM6P qui crée le profil. Pour un membre déjà connecté, la seule action qui
 * fait grandir le réseau : ajouter une contribution.
 */
export function JoinSection({ member }: { member: Author | null }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid w-full max-w-content gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-20">
        {member ? (
          <>
            <div>
              <h2 className="text-section font-medium text-text">
                Tu es passé·e par une entreprise&nbsp;?
              </h2>
              <p className="mt-1.5 max-w-[28rem] text-list text-text-muted">
                Un stage ou un contact, et le prochain qui la vise sait à qui
                écrire.
              </p>
            </div>
            <div className="flex items-start lg:justify-end">
              <Link href="/contribute" className={buttonClass({ variant: "primary", size: "lg" })}>
                Ajouter
              </Link>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-section font-medium text-text">Rejoindre CConnect</h2>
              <p className="mt-1.5 max-w-[28rem] text-list text-text-muted">
                Connecte-toi avec ton adresse UM6P : ton profil se crée à la
                première connexion.
              </p>
              <Link
                href="/login"
                className={buttonClass({ variant: "primary", size: "lg", className: "mt-6" })}
              >
                Se connecter
              </Link>
            </div>
            <dl className="divide-y divide-border border-y border-border">
              {MEMBER_STATUSES.map((status) => (
                <div key={status} className="flex flex-col gap-0.5 py-4 sm:flex-row sm:gap-6">
                  <dt className="text-body font-medium text-text sm:w-28 sm:shrink-0">
                    {STATUS_LABELS[status]}
                  </dt>
                  <dd className="text-list text-text-muted">{STATUS_DESCRIPTIONS[status]}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </section>
  );
}
