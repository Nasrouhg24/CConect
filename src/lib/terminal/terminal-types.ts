import type { Company, Place } from "../types";

/**
 * Mode terminal — types partagés.
 *
 * `TerminalPath` est **la** position courante : le prompt, les filtres de la
 * carte, son cadrage et la ville mise en évidence en sont tous dérivés
 * (`terminalView`). Il n'existe pas d'état « carte » séparé à synchroniser.
 */
export type TerminalPath =
  | { type: "world" }
  | { type: "country"; countryCode: string }
  | { type: "city"; countryCode: string; placeId: string }
  | { type: "companies" }
  /**
   * Une entreprise est un seul enregistrement, joignable par plusieurs chemins.
   * `placeId` dit par où on est arrivé : une ville (`/France/Paris/Orange`) ou
   * la racine des entreprises (`/Companies/Orange`, `placeId: null`).
   */
  | { type: "company"; slug: string; placeId: string | null };

export interface TerminalCountry {
  code: string;
  name: string;
  /** Identifiants de villes, triés par nom. */
  cityIds: string[];
}

export interface TerminalCity {
  place: Place;
  /** Slugs d'entreprises présentes dans cette ville, triés par nom. */
  companySlugs: string[];
}

export interface TerminalCompany {
  company: Company;
  /** Toutes les villes où le réseau a une expérience ou un contact chez elle. */
  placeIds: string[];
}

export interface TerminalTree {
  countries: Map<string, TerminalCountry>;
  /** Codes pays triés par nom. */
  countryOrder: string[];
  cities: Map<string, TerminalCity>;
  companies: Map<string, TerminalCompany>;
  /** Slugs triés par nom. */
  companyOrder: string[];
}

/** Ce qu'une commande produit à l'écran. Jamais de HTML : du texte et des liens. */
export type OutputBlock =
  | { type: "text"; lines: string[] }
  | { type: "error"; lines: string[] }
  | { type: "list"; items: { label: string; path: TerminalPath }[]; empty: string }
  | {
      type: "info";
      title: string;
      rows: { label: string; value: string }[];
      lists: { label: string; items: string[] }[];
    };

export const COMMANDS = ["ls", "cd", "cat"] as const;
export type CommandName = (typeof COMMANDS)[number];

export type ParsedInput =
  | { type: "empty" }
  | { type: "command"; command: CommandName; args: string[] }
  | { type: "unknown"; name: string }
  | { type: "invalid"; message: string };
