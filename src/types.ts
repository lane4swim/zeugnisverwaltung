// Datenmodell gemäß spezifikation.md Abschnitt 3.

export const HALBJAHRE = [
  '1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2',
] as const;

export type Halbjahr = (typeof HALBJAHRE)[number];

export type Geschlecht = 'w' | 'm';

export interface Schueler {
  id: string;
  nachname: string;
  vorname: string;
  geburtsdatum: string; // ISO-Datum TT als yyyy-mm-dd
  geschlecht: Geschlecht;
}

export interface Bewertung {
  schuelerId: string;
  kompetenzId: string;
  stufe: number;
  bewertetAm: string; // ISO-Zeitstempel
  gewaehlterBausteinIndex: number;
}

export interface Bewertungstext {
  schuelerId: string;
  kompetenzId: string;
  generierterText: string | null;
  manuellerText: string | null;
  gesperrt: boolean;
}

export interface BemerkungEintrag {
  schuelerId: string;
  ausgewaehlteBemerkungen: string[];
}

export interface KlasseInfo {
  name: string;
  schuljahr: string;
}

/** Genau eine Klasse in genau einem Halbjahr (siehe spezifikation.md 3.2, 3.7). */
export interface Klassendatensatz {
  formatVersion: 1;
  erstelltAm: string;
  halbjahr: Halbjahr;
  /** Version der zugehörigen Kompetenzdatei; erst ab Phase 2 gesetzt. */
  kompetenzdateiVersion: string | null;
  klasse: KlasseInfo;
  schueler: Schueler[];
  bewertungen: Bewertung[];
  bewertungstexte: Bewertungstext[];
  bemerkungen: BemerkungEintrag[];
}

export function istHalbjahr(wert: unknown): wert is Halbjahr {
  return typeof wert === 'string' && (HALBJAHRE as readonly string[]).includes(wert);
}

export function erzeugeLeerenDatensatz(halbjahr: Halbjahr, klasse: KlasseInfo): Klassendatensatz {
  return {
    formatVersion: 1,
    erstelltAm: new Date().toISOString(),
    halbjahr,
    kompetenzdateiVersion: null,
    klasse,
    schueler: [],
    bewertungen: [],
    bewertungstexte: [],
    bemerkungen: [],
  };
}
