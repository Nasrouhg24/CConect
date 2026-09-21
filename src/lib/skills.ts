/**
 * Compétences : saisie libre, forme canonique partagée.
 *
 * La base calcule la même clé (colonne générée `skills.normalized`, migration
 * 0008) : « Python », « python » et « Python  » sont une seule compétence.
 */

export const MAX_PROFILE_SKILLS = 30;
export const MAX_EXPERIENCE_SKILLS = 12;
const MAX_SKILL_LENGTH = 40;

export function cleanSkillLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function skillKey(raw: string): string {
  return cleanSkillLabel(raw).toLowerCase();
}

/**
 * Découpe une saisie « SIEM, Python; Linux » en liste propre.
 *
 * Renvoie `null` au-delà du plafond, ou pour une entrée trop longue, plutôt
 * que de tronquer en silence : une compétence retirée sans le dire serait une
 * donnée perdue.
 */
export function parseSkillList(raw: string, max: number): string[] | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const label = cleanSkillLabel(part);
    if (label.length === 0) continue;
    if (label.length > MAX_SKILL_LENGTH) return null;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.length > max ? null : out;
}
