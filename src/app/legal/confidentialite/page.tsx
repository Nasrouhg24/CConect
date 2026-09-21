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
  Register,
} from "@/components/legal/LegalDoc";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/env";
import { CONTROLLER, PROCESSING_REGISTER } from "@/lib/legal";
import { isLogoProviderEnabled } from "@/lib/logo-provider";

export const metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données CConnect traite, pourquoi, pendant combien de temps, et comment exercer ses droits.",
};

const domains = ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(", ");

/**
 * La politique est écrite à partir de ce que le code fait, pas l'inverse : le
 * registre des traitements vient de `src/lib/legal.ts`, et la mention du
 * fournisseur de logos n'apparaît que s'il est réellement activé. Une page
 * légale recopiée à la main finit toujours par décrire un produit d'il y a six
 * mois.
 */
export default function PrivacyPage() {
  return (
    <PageShell title="Politique de confidentialité" width="narrow">
      <LegalDoc>
        <LegalMeta lead="CConnect est un réseau fermé d'étudiants et d'alumni. Ce document dit exactement quelles données y circulent, pourquoi, et ce que tu peux exiger à leur sujet." />

        <Article id="responsable" title="Qui est responsable">
          <P>
            Le responsable du traitement est le {CONTROLLER}. CConnect est un
            service interne : seules les adresses {domains} peuvent y créer un
            compte, et cette restriction est vérifiée par la base de données, pas
            seulement par le formulaire.
          </P>
          <P>
            Le traitement est soumis à la loi marocaine 09-08 relative à la
            protection des personnes physiques à l&apos;égard du traitement des
            données à caractère personnel, sous le contrôle de la CNDP. Les
            membres résidant dans l&apos;Union européenne bénéficient en outre du
            RGPD ; les droits décrits plus bas sont accordés à tous les membres,
            sans distinction de lieu.
          </P>
        </Article>

        <Article id="donnees" title="Ce qui est collecté, et pour quoi">
          <P>
            Rien n&apos;est déduit, acheté ni importé : toute donnée du tableau
            ci-dessous a été saisie par un membre, dans un formulaire qu&apos;il a
            vu.
          </P>
          <Register
            caption="Registre des traitements"
            columns={["Donnée", "Finalité", "Base légale", "Conservation"]}
            rows={PROCESSING_REGISTER.map((entry) => [
              entry.data,
              entry.purpose,
              entry.basis,
              entry.retention,
            ])}
          />
          <P>
            Aucun profilage automatisé, aucune décision produisant des effets
            juridiques : le conseiller d&apos;orientation ne fait que rapprocher
            ce que tu as écrit de ce que d&apos;autres ont écrit, et ses résultats
            ne sont lus que par toi.
          </P>
        </Article>

        <Article id="minimisation" title="Ce qui n'est structurellement pas collecté">
          <Guarantee>
            La table des contacts n&apos;a ni colonne email ni colonne téléphone.
            Ce n&apos;est pas une règle d&apos;interface qu&apos;une évolution
            pourrait contourner : le stockage d&apos;une coordonnée privée est
            impossible par construction.
          </Guarantee>
          <List
            items={[
              "Les champs de texte libre sont analysés à l'écriture : une adresse email ou un numéro de téléphone glissé dans un résumé fait échouer l'enregistrement.",
              "Aucune donnée de localisation n'est relevée : la carte affiche les villes déclarées dans les contributions, jamais la position de l'appareil.",
              "Aucune mesure d'audience, aucun traceur publicitaire, aucun bouton de réseau social. La carte du monde est dessinée localement (Natural Earth, domaine public) et les polices sont servies depuis nos serveurs — ouvrir une page n'envoie aucune requête à Google.",
              "Aucune donnée sensible au sens de la loi (santé, opinions, origine, religion) n'est demandée. N'en écris pas dans les champs libres.",
            ]}
          />
        </Article>

        <Article id="tiers" title="Les personnes mentionnées par un membre">
          <P>
            Un membre peut enregistrer un contact : une personne qu&apos;il
            connaît dans une entreprise, avec son nom, son poste et
            éventuellement son profil LinkedIn public. Cette personne n&apos;est
            pas membre et n&apos;a pas créé la fiche. Trois limites encadrent
            cette collecte :
          </P>
          <List
            items={[
              "Rien qui permette de joindre la personne directement : ni email, ni téléphone. Un profil LinkedIn public est une identité professionnelle, pas une coordonnée privée.",
              "La fiche n'est visible que des membres du réseau, jamais du public ni d'un moteur de recherche.",
              "Toute personne mentionnée peut demander la suppression de sa fiche et l'obtient sans avoir à se justifier. Chaque membre peut aussi signaler une fiche en un clic.",
            ]}
          />
          <P>
            La base légale invoquée est l&apos;intérêt légitime du réseau à savoir
            qui connaît qui, mis en balance avec la vie privée de la personne :
            c&apos;est cette mise en balance qui impose les trois limites
            ci-dessus, et elle tombe dès que la personne s&apos;y oppose.
          </P>
        </Article>

        <Article id="destinataires" title="Qui voit ces données">
          <List
            items={[
              <>
                <strong className="font-medium text-text">Les autres membres</strong>{" "}
                du réseau, et eux seuls. Chaque table est en Row Level Security :
                un compte sans profil vérifié ne lit rien, même en interrogeant
                l&apos;API directement.
              </>,
              <>
                <strong className="font-medium text-text">Toi seul</strong>, pour
                tes préférences de recherche (domaine visé, pays visés,
                entreprises visées, ouverture au mentorat) et ton historique de
                consentement. La base l&apos;impose : aucun autre membre ne peut
                les lire.
              </>,
              <>
                <strong className="font-medium text-text">
                  Nos hébergeurs, en sous-traitance
                </strong>{" "}
                : Supabase (base de données, authentification, stockage des
                photos) et l&apos;hébergeur de l&apos;application. Ils traitent
                les données pour notre compte, sur instruction, et ne les
                exploitent pas.
              </>,
              ...(isLogoProviderEnabled
                ? [
                    <>
                      <strong className="font-medium text-text">Logo.dev</strong>,
                      qui fournit les logos d&apos;entreprise. Ton navigateur lui
                      demande une image : il en reçoit donc ton adresse IP et le
                      nom de domaine de l&apos;entreprise affichée, jamais ton
                      identité ni tes contributions.
                    </>,
                  ]
                : []),
            ]}
          />
          <P>
            Aucune donnée n&apos;est vendue, louée, ni transmise à un tiers à des
            fins commerciales. Une transmission à une autorité ne se ferait que
            sur réquisition régulière.
          </P>
        </Article>

        <Article id="transferts" title="Où les données sont hébergées">
          <P>
            Les serveurs de nos sous-traitants peuvent se situer hors du Maroc,
            notamment dans l&apos;Union européenne. Ces transferts s&apos;appuient
            sur les clauses contractuelles types de la Commission européenne et,
            pour le Maroc, sur l&apos;autorisation de transfert requise par la loi
            09-08.
          </P>
        </Article>

        <Article id="securite" title="Comment elles sont protégées">
          <List
            items={[
              "Connexion par lien à usage unique envoyé sur l'adresse institutionnelle : aucun mot de passe n'est stocké.",
              "Cookie de session limité à 30 jours glissants, transmis uniquement sur connexion chiffrée en production.",
              "Row Level Security sur toutes les tables : lecture réservée aux membres, écriture réservée à l'auteur de la contribution.",
              "Politique de sécurité du contenu à nonce, qui bloque l'exécution d'un script injecté.",
              "Photos de profil dans un espace privé, servies avec la session — jamais par une URL publique devinable.",
              "Journal d'audit des écritures et compteurs anti-abus, conservés 12 mois.",
            ]}
          />
        </Article>

        <Article id="droits" title="Tes droits, et comment les exercer">
          <P>
            Tu disposes d&apos;un droit d&apos;accès, de rectification,
            d&apos;effacement, de limitation, d&apos;opposition et de portabilité,
            ainsi que du droit de retirer un consentement à tout moment — le
            retrait ne remet pas en cause ce qui a été fait avant.
          </P>
          <List
            items={[
              <>
                <strong className="font-medium text-text">
                  Immédiatement, seul
                </strong>{" "}
                : ton{" "}
                <Link
                  href="/profile"
                  className="text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  profil
                </Link>{" "}
                permet de corriger tes informations, de vider un champ facultatif,
                de retirer ta photo et de supprimer une à une tes contributions.
              </>,
              <>
                <strong className="font-medium text-text">Sur demande</strong> :
                copie de toutes tes données dans un format lisible par machine,
                suppression complète du compte, ou opposition à un traitement.
                Réponse sous 30 jours.
              </>,
            ]}
          />
          <P>
            Supprimer ton compte efface ton profil, ta photo, tes préférences et
            ton historique de consentement. Tes contributions sont supprimées avec
            lui, sauf si tu demandes expressément à les laisser au réseau : elles
            sont alors détachées de ton nom.
          </P>
          <LegalContact />
          <P>
            Si la réponse ne te satisfait pas, tu peux saisir la CNDP (Commission
            nationale de contrôle de la protection des données à caractère
            personnel) au Maroc, ou l&apos;autorité de protection des données de
            ton pays de résidence dans l&apos;Union européenne.
          </P>
        </Article>

        <Article id="cookies" title="Cookies">
          <P>
            CConnect n&apos;utilise que des cookies strictement nécessaires à son
            fonctionnement — aucune mesure d&apos;audience, aucun traceur. Le
            détail, cookie par cookie, est dans la{" "}
            <Link
              href="/legal/cookies"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              politique de cookies
            </Link>
            .
          </P>
        </Article>

        <Article id="modifications" title="Modifications">
          <P>
            Toute évolution de ce document est publiée ici avec une nouvelle
            version datée. Si elle change ce qui est traité ou pourquoi, ton
            acceptation est redemandée à ta prochaine visite : l&apos;accès au
            réseau reste bloqué tant que tu n&apos;as pas tranché.
          </P>
        </Article>

        <LegalNav current="/legal/confidentialite" />
      </LegalDoc>
    </PageShell>
  );
}
