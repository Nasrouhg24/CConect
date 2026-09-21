import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import {
  Article,
  Guarantee,
  LegalDoc,
  LegalMeta,
  LegalNav,
  List,
  P,
  Register,
} from "@/components/legal/LegalDoc";
import { ESSENTIAL_COOKIES } from "@/lib/legal";

export const metadata = {
  title: "Politique de cookies",
  description:
    "CConnect ne pose que des cookies strictement nécessaires : session, échange du lien de connexion, et mémoire du bandeau d'information.",
};

/**
 * Le tableau est engendré depuis `ESSENTIAL_COOKIES` : ajouter un cookie au
 * code sans l'ajouter à l'inventaire fait échouer `tests/legal.test.ts`, et
 * l'ajouter à l'inventaire le publie ici. C'est le seul moyen qu'une page
 * cookies reste vraie plus de trois mois.
 */
export default function CookiesPage() {
  return (
    <PageShell title="Politique de cookies" width="narrow">
      <LegalDoc>
        <LegalMeta lead="Trois cookies, tous indispensables au fonctionnement du site. Aucun n'observe ta navigation, et aucun n'appartient à un tiers." />

        <Article id="principe" title="Pourquoi on ne te demande pas ton avis">
          <P>
            La loi impose de recueillir un consentement avant de déposer un
            cookie qui n&apos;est pas nécessaire au service demandé — mesure
            d&apos;audience, publicité, réseaux sociaux. Elle en dispense
            expressément les cookies strictement nécessaires.
          </P>
          <Guarantee>
            CConnect n&apos;utilise que des cookies strictement nécessaires. Il
            n&apos;y a donc rien à accepter ni à refuser : le bandeau affiché à
            ta première visite t&apos;informe, il ne te demande pas une
            permission qui n&apos;aurait aucun effet.
          </Guarantee>
          <P>
            Le jour où un cookie de mesure serait envisagé, ce paragraphe
            disparaîtrait au profit d&apos;un vrai choix — refuser aussi simple
            qu&apos;accepter, et rien de déposé avant la réponse.
          </P>
        </Article>

        <Article id="inventaire" title="La liste complète">
          <Register
            caption="Cookies déposés par CConnect"
            columns={["Cookie", "Rôle", "Durée"]}
            rows={ESSENTIAL_COOKIES.map((cookie) => [
              cookie.name,
              cookie.purpose,
              cookie.duration,
            ])}
          />
          <P>
            La référence de projet qui apparaît dans le nom des deux premiers
            cookies est celle de notre base Supabase : elle identifie
            l&apos;installation, pas la personne.
          </P>
        </Article>

        <Article id="absents" title="Ce qui n'est pas posé">
          <List
            items={[
              "Aucun cookie de mesure d'audience — ni Google Analytics, ni équivalent auto-hébergé.",
              "Aucun cookie publicitaire, aucun identifiant de suivi inter-sites.",
              "Aucun cookie tiers : le site ne charge ni iframe, ni bouton de partage, ni widget externe.",
              "Aucun pixel, aucune empreinte de navigateur, aucun stockage local à des fins de suivi.",
            ]}
          />
          <P>
            Les polices de caractères sont servies depuis nos propres serveurs et
            la carte du monde est dessinée localement : afficher une page de
            CConnect n&apos;ouvre de connexion vers aucun autre domaine.
          </P>
        </Article>

        <Article id="gestion" title="Les supprimer">
          <List
            items={[
              "Te déconnecter efface immédiatement le cookie de session.",
              "Ton navigateur permet de supprimer les cookies de ce site, ou de les refuser globalement. Refuser le cookie de session revient à ne pas pouvoir se connecter : il n'y a pas d'autre mécanisme de session.",
              "Le cookie du bandeau d'information peut être supprimé librement — il réapparaîtra, et le bandeau avec lui.",
            ]}
          />
        </Article>

        <Article id="suite" title="Pour le reste">
          <P>
            Quelles données sont traitées, par qui, pendant combien de temps et
            comment exercer tes droits :{" "}
            <Link
              href="/legal/confidentialite"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              politique de confidentialité
            </Link>
            .
          </P>
        </Article>

        <LegalNav current="/legal/cookies" />
      </LegalDoc>
    </PageShell>
  );
}
