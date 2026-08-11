import type { Geschlecht, Schueler } from '../types';
import { formatiereDatum } from '../utils/datum';

interface Pronomentabelle {
  nom: string;
  akk: string;
  dat: string;
  poss: string;
}

// Feste Ersetzungstabelle gemäß spezifikation.md 5.4/6.2: ausschließlich
// binär "w"/"m", "divers" wird bewusst nicht angeboten.
const PRONOMEN: Record<Geschlecht, Pronomentabelle> = {
  w: { nom: 'sie', akk: 'sie', dat: 'ihr', poss: 'ihr' },
  m: { nom: 'er', akk: 'ihn', dat: 'ihm', poss: 'sein' },
};

/**
 * Liefert die Schülerstammdaten-Platzhalter aus spezifikation.md 6.1 als
 * flache Schlüssel/Wert-Tabelle (ohne die geschweiften Klammern) – Basis für
 * sowohl die Satzbaustein-Ersetzung als auch den Word-Export (Phase 6).
 */
export function erzeugeSchuelerFelder(schueler: Schueler): Record<string, string> {
  const pronomen = PRONOMEN[schueler.geschlecht];
  return {
    Vorname: schueler.vorname,
    Nachname: schueler.nachname,
    Pronomen_Nom: pronomen.nom,
    Pronomen_Akk: pronomen.akk,
    Pronomen_Dat: pronomen.dat,
    Pronomen_Poss: pronomen.poss,
    Geburtsdatum: formatiereDatum(schueler.geburtsdatum),
  };
}

/** Ersetzt die Platzhalter aus spezifikation.md 6.1, die innerhalb eines Satzbausteins vorkommen können. */
export function ersetzePlatzhalter(satzbaustein: string, schueler: Schueler): string {
  const felder = erzeugeSchuelerFelder(schueler);
  let ergebnis = satzbaustein;
  for (const [platzhalter, wert] of Object.entries(felder)) {
    ergebnis = ergebnis.replaceAll(`{${platzhalter}}`, wert);
  }
  return ergebnis;
}

/**
 * Wählt einen Satzbaustein-Index (spezifikation.md 3.3/5.4). Bei „Neu
 * würfeln" (ausschluss gesetzt) wird bei ≥2 Alternativen garantiert ein
 * anderer Index als der bisherige geliefert.
 */
export function waehleBausteinIndex(anzahlBausteine: number, ausschluss: number | null = null): number {
  if (anzahlBausteine <= 1) return 0;
  if (ausschluss === null) return Math.floor(Math.random() * anzahlBausteine);
  let index = Math.floor(Math.random() * (anzahlBausteine - 1));
  if (index >= ausschluss) index += 1;
  return index;
}
