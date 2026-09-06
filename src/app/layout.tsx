import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentMember, isDemoMode } from "@/lib/repository";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex h-full flex-col overflow-hidden font-sans">
        {isDemoMode ? (
          <p className="shrink-0 border-b border-border bg-surface px-4 py-1 text-center text-[11px] text-text-faint">
            Mode démo — données fictives, aucune base connectée.
          </p>
        ) : null}

        <SiteHeader member={member} />

        <main className="thin-scroll flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
