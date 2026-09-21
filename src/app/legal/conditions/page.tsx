import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import {
  Article,
  Guarantee,
  LegalContact,
  LegalDoc,
  LegalMeta,
  LegalNav,
  List,
  P,
} from "@/components/legal/LegalDoc";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/env";
import { CONTROLLER } from "@/lib/legal";

export const metadata = {
  title: "Conditions d'utilisation",
  description:
    "Qui peut rejoindre CConnect, ce qu'on peut y publier, et ce qui fait perdre l'accès.",
};

const domains = ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(", ");

export default function TermsPage() {
  return (
    <PageShell title="Conditions d'utilisation" width="narrow">
      <LegalDoc>
        <LegalMeta lead="CConnect repose sur une promesse simple : ce que tu y écris sert aux suivants, et ce que d'autres y écrivent sur des tiers reste mesuré. Ces conditions disent ce que cela implique." />

        <Article id="objet" title="Objet et éditeur">
          <P>
            CConnect est le réseau interne du {CONTROLLER} : il rassemble les
            expériences professionnelles des étudiants et alumni, les entreprises
            où elles ont eu lieu, et les personnes qu&apos;un membre connaît dans
            ces entreprises. Le service est gratuit, sans publicité, et réservé à
            la communauté.
          </P>
        </Article>

        <Article id="acces" title="Qui peut rejoindre">
          <List
            items={[
              `Une adresse institutionnelle ${domains} est nécessaire. La vérification a lieu en base de données, pas seulement dans le formulaire.`,
              "Un compte appartient à une personne. Ni compte partagé, ni compte créé pour quelqu'un d'autre.",
              "Le compte se perd avec le droit d'utiliser l'adresse : un accès révoqué par l'établissement ferme l'accès au réseau.",
            ]}
          />
        </Article>

        <Article id="contributions" title="Ce que tu publies">
          <P>
            Tu restes responsable de tes contributions, et tu garantis avoir le
            droit de les publier. En les publiant, tu acceptes qu&apos;elles
            soient lues par les autres membres et conservées tant que tu ne les
            supprimes pas.
          </P>
          <List
            items={[
              "Raconte ce que tu as vécu, pas ce qu'on t'a rapporté. Une expérience inventée fausse la carte pour tout le monde.",
              "Respecte ce que ton employeur t'a confié : ne publie ni information confidentielle, ni document interne, ni grille de rémunération soumise au secret.",
              "Pas d'insulte, pas de mise en cause personnelle, pas de propos discriminatoire — sur une entreprise comme sur une personne.",
              "Pas de démarchage, pas de contenu commercial, pas de recrutement pour un tiers.",
            ]}
          />
        </Article>

        <Article id="personnes" title="Les personnes que tu mentionnes">
          <Guarantee>
            On n&apos;enregistre jamais l&apos;email ni le téléphone d&apos;un
            contact. La base n&apos;a pas de colonne pour les recevoir, et les
            champs libres refusent ce qui y ressemble.
          </Guarantee>
          <List
            items={[
              "Ne mentionne une personne que si le lien est réel : un contact sert à savoir qui pourrait répondre, pas à gonfler un carnet d'adresses.",
              "Reste factuel dans la note de relation — un poste, un contexte de rencontre. Ce que tu écris est lisible par tout le réseau.",
              "Une personne mentionnée peut demander le retrait de sa fiche : il est appliqué sans discussion, et sans que tu aies à t'en justifier.",
            ]}
          />
        </Article>

        <Article id="usage" title="Usage du réseau">
          <P>
            L&apos;accès t&apos;est ouvert pour ton orientation et celle de tes
            camarades. Sont interdits :
          </P>
          <List
            items={[
              "L'extraction massive, automatisée ou manuelle, de tout ou partie du contenu — la base compte les écritures et plafonne les lectures pour cette raison.",
              "La republication hors du réseau des contributions d'autres membres, y compris sur un réseau social.",
              "Toute tentative de contourner l'authentification, les politiques d'accès de la base, ou de charger le service au-delà d'un usage normal.",
            ]}
          />
        </Article>

        <Article id="moderation" title="Signalement et modération">
          <P>
            Chaque entrée peut être signalée par n&apos;importe quel membre. Un
            modérateur peut corriger ou retirer un contenu qui enfreint ces
            conditions, et suspendre un compte en cas de manquement grave ou
            répété. Une suspension est notifiée, et contestable auprès du contact
            ci-dessous.
          </P>
        </Article>

        <Article id="donnees" title="Données personnelles">
          <P>
            Le traitement de tes données est décrit dans la{" "}
            <Link
              href="/legal/confidentialite"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              politique de confidentialité
            </Link>
            , qui fait partie intégrante de ces conditions. Les cookies sont
            détaillés dans la{" "}
            <Link
              href="/legal/cookies"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              politique de cookies
            </Link>
            .
          </P>
        </Article>

        <Article id="responsabilite" title="Ce que le service ne garantit pas">
          <P>
            Les contenus sont déclaratifs : ils viennent de membres, pas
            d&apos;une vérification par l&apos;établissement. Vérifie une
            information avant de décider sur sa foi. Le service est fourni en
            l&apos;état, sans garantie de disponibilité continue, et son
            interruption ne peut donner lieu à indemnisation.
          </P>
        </Article>

        <Article id="fin" title="Fin de l'accès">
          <P>
            Tu peux fermer ton compte à tout moment, sans motif. La fermeture
            efface ton profil et tes contributions, selon les modalités décrites
            dans la politique de confidentialité.
          </P>
          <LegalContact />
        </Article>

        <Article id="droit" title="Droit applicable">
          <P>
            Ces conditions sont régies par le droit marocain. Tout litige relève
            des tribunaux compétents du Royaume du Maroc, sans préjudice des
            règles protectrices applicables aux membres résidant dans
            l&apos;Union européenne.
          </P>
        </Article>

        <LegalNav current="/legal/conditions" />
      </LegalDoc>
    </PageShell>
  );
}
