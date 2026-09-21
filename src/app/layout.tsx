import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { CookieNotice } from "@/components/legal/CookieNotice";
import { SiteHeader } from "@/components/SiteHeader";
import { NOTICE_COOKIE, POLICY_VERSION } from "@/lib/legal";
import { getCurrentMember, getProfilePhotoVersion, isDemoMode } from "@/lib/repository";
import "./globals.css";

/**
 * Deux voix, une par nature de contenu.
 *
 * Geist porte tout ce qui est une *phrase* — titres compris. C'est une
 * grotesque contemporaine dont les formes (a, g, R, chiffres) restent
 * dessinées : elle échappe au gris uniforme d'Inter sans devenir une voix
 * de marque bruyante.
 *
 * Geist Mono porte tout ce qui est une *donnée* : chiffres, villes, promos,
 * numéros d'étape, libellés de champ. La règle se lit à l'oeil nu — si c'est
 * en chasse fixe, ça vient de la base.
 *
 * Chargées par `next/font` et non par un `<link>` vers Google Fonts : les
 * fichiers sont alors auto-hébergés et la métrique de repli est calculée, ce
 * qui supprime le décalage de mise en page au chargement.
 */
const body = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/**
 * Rendu dynamique explicite.
 *
 * Les pages restaient hors du cache partagé parce que `getCurrentMember()`
 * finit par lire les cookies, ce qui suffit à rendre le rendu dynamique. Cette
 * garantie était donc transitive : un remaniement qui déplace la lecture de la
 * session — ou un `use cache` ajouté ailleurs — aurait pu publier la page d'un
 * membre dans le cache du CDN. On l'écrit maintenant noir sur blanc. C'est
 * aussi ce qu'exige le nonce de la CSP, qui doit changer à chaque requête.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "CConnect",
    template: "%s · CConnect",
  },
  description:
    "CConnect — College of Computing Career Network. Le réseau privé des étudiants et alumni UM6P Rabat & Benguerir.",
  robots: { index: false, follow: false },
};

/**
 * Coquille de l'application.
 *
 * `main` ne fixe ni largeur ni marge : c'est chaque page qui décide. La carte
 * peut ainsi occuper tout l'écran, pendant que les pages de contenu se posent
 * dans un conteneur centré.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const member = await getCurrentMember();
  const photoVersion = member ? await getProfilePhotoVersion(member.id) : null;

  /*
   * Le bandeau cookies est décidé côté serveur pour qu'il ne clignote pas chez
   * ceux qui l'ont déjà lu.
   *
   * Le blocage des politiques, lui, n'est *pas* ici : un layout racine n'est
   * pas re-rendu lors d'une navigation côté client, il laisserait donc passer
   * le premier lien cliqué. Il vit dans `src/proxy.ts`, qui voit chaque
   * requête.
   */
  const noticeRead =
    (await cookies()).get(NOTICE_COOKIE)?.value === POLICY_VERSION;

  return (
    <html
      lang="fr"
      className={`${body.variable} ${mono.variable} h-full`}
    >
      <body className="flex h-full flex-col overflow-hidden font-sans">
        {isDemoMode ? (
          <p className="shrink-0 border-b border-border bg-surface px-4 py-1 text-center text-label text-text-faint">
            Mode démo — données fictives, aucune base connectée.
          </p>
        ) : null}

        <SiteHeader member={member} photoVersion={photoVersion} />

        <main className="thin-scroll flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>

        {noticeRead ? null : <CookieNotice />}
      </body>
    </html>
  );
}
