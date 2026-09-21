import { redirect } from "next/navigation";
import { ConsentGate } from "@/components/legal/ConsentGate";
import { FlowShell } from "@/components/PageShell";
import { POLICY_VERSION } from "@/lib/legal";
import { getCurrentMember, getPolicyAcceptance } from "@/lib/repository";

export const metadata = { title: "Accepter les politiques" };

/**
 * Écran d'acceptation, vers lequel `src/proxy.ts` renvoie tant que la version
 * en vigueur n'est pas acceptée.
 *
 * Il se garde lui-même plutôt que de faire confiance au renvoi : on y arrive
 * aussi par un lien ou un signet, et un membre déjà à jour n'a rien à y faire.
 */
export default async function AcceptPolicyPage({
  searchParams,
}: PageProps<"/legal/accepter">) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const consent = await getPolicyAcceptance(member.id);
  const { next } = await searchParams;

  if (consent.version === POLICY_VERSION) redirect(safeNext(next));

  return (
    <FlowShell>
      <ConsentGate previousVersion={consent.version} next={safeNext(next)} />
    </FlowShell>
  );
}

/**
 * Destination de retour, ramenée à un chemin interne.
 *
 * `next` vient de l'URL : sans ce filtre, `?next=https://…` transformerait
 * l'écran d'acceptation en tremplin de redirection ouverte. On n'accepte qu'un
 * chemin absolu du site, et `//` est refusé parce qu'un navigateur le lit comme
 * un hôte.
 */
function safeNext(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  if (typeof path !== "string") return "/network";
  if (!path.startsWith("/") || path.startsWith("//")) return "/network";
  return path;
}
