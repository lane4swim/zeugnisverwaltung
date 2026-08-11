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

/**
 * Für ein Fach (Abschnitt), das in der Kompetenzdatei als `optional`
 * markiert ist, kann je Schüler:in vermerkt werden, dass es nicht
 * zutrifft (z. B. Religion). Für so markierte Fächer ist keine Bewertung
 * möglich; sie fließen nicht in die Vollständigkeitsprüfung ein (siehe
 * spezifikation.md 3.3, 5.1, 5.2).
 */
export interface NichtRelevanterAbschnittEintrag {
  schuelerId: string;
  abschnittIds: string[];
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
  nichtRelevanteAbschnitte: NichtRelevanterAbschnittEintrag[];
}

// Kompetenzdatei (serverseitig, nicht-personenbezogen, je Halbjahr; siehe
// spezifikation.md 3.3/4). Hierarchie: Abschnitt → Bereich → Kompetenz → Stufe.

export interface Stufe {
  stufe: number;
  bezeichnung: string;
  satzbausteine: string[];
}

export interface Kompetenz {
  id: string;
  titel: string;
  stufen: Stufe[];
}

export interface Bereich {
  id: string;
  titel: string;
  kompetenzen: Kompetenz[];
}

export interface Abschnitt {
  id: string;
  titel: string;
  bereiche: Bereich[];
  /**
   * Fächer, die nicht für jede Person zutreffen (z. B. Religion), können
   * hier als optional markiert werden. Die Zuständigkeit „nicht relevant"
   * je Schüler:in wird nicht hier, sondern im Klassendatensatz vermerkt
   * (siehe NichtRelevanterAbschnittEintrag), da die Kompetenzdatei selbst
   * nicht personenbezogen ist. Fehlt das Feld, gilt das Fach als
   * verpflichtend (Standardverhalten vor Einführung dieses Merkmals).
   */
  optional?: boolean;
  /**
   * Nur bei `optional: true` wirksam: Vorlage für eine Bemerkung (gleiche
   * Platzhaltersyntax wie Bemerkungsbausteine, siehe 6.1), die automatisch
   * in die Bemerkungen (3.6) übernommen wird, sobald dieses Fach für eine
   * Person als „nicht relevant" markiert wird, und beim Zurücknehmen der
   * Markierung wieder entfernt wird (siehe 3.7, 5.2, 5.3).
   */
  nichtRelevantBemerkung?: string;
}

export interface Bemerkungsbaustein {
  id: string;
  text: string;
}

export interface KompetenzDatei {
  halbjahr: Halbjahr;
  version: string;
  abschnitte: Abschnitt[];
  bemerkungsbausteine: Bemerkungsbaustein[];
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
    nichtRelevanteAbschnitte: [],
  };
}

/**
 * Füllt bei aus IndexedDB geladenen oder importierten Datensätzen fehlende
 * Felder auf, die erst nach deren Erstellung eingeführt wurden (hier:
 * `nichtRelevanteAbschnitte`), damit ältere Backups weiterhin nutzbar
 * bleiben (Robustheit, spezifikation.md 7).
 */
export function normalisiereKlassendatensatz(datensatz: Klassendatensatz): Klassendatensatz {
  return {
    ...datensatz,
    nichtRelevanteAbschnitte: datensatz.nichtRelevanteAbschnitte ?? [],
  };
}
