/* Classes de champ, sans "use client" : importables depuis un Server Component. */

/**
 * Champs de saisie.
 *
 * 40 px de haut plutôt que 36 : un formulaire n'est pas une barre d'outils,
 * il se remplit au clavier et souvent au pouce. La cible tactile passe ainsi
 * au-dessus du seuil confortable sans que les champs deviennent des pavés.
 *
 * Le focus ne se contente plus de changer la couleur de la bordure — un
 * passage de `border` à `accent` sur 1 px se voit mal sur fond sombre. Un
 * anneau de 3 px dit sans ambiguïté où l'on écrit. Il remplace l'anneau de
 * focus global (d'où `focus:outline-none`), il ne s'y ajoute pas.
 */
const fieldBase =
  "w-full rounded-sm border border-border-strong bg-surface text-body text-text placeholder:text-text-faint transition-[color,background-color,border-color,box-shadow] duration-150 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft";

export const inputClass = `${fieldBase} h-11 px-3.5`;

export const textareaClass = `${fieldBase} px-3.5 py-3`;

export const selectClass = `${inputClass} appearance-none bg-[length:10px] bg-[right_0.6rem_center] bg-no-repeat pr-8`;

export const labelClass =
  "block text-label font-medium uppercase tracking-[0.08em] text-text-faint";

export const panelClass =
  "rounded-md border border-border bg-surface-raised shadow-[var(--shadow-panel)]";
