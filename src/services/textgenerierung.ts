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

/** Ersetzt die Platzhalter aus spezifikation.md 6.1, die innerhalb eines Satzbausteins vorkommen können. */
export function ersetzePlatzhalter(satzbaustein: string, schueler: Schueler): string {
  const pronomen = PRONOMEN[schueler.geschlecht];
  return satzbaustein
    .replaceAll('{Vorname}', schueler.vorname)
    .replaceAll('{Nachname}', schueler.nachname)
    .replaceAll('{Pronomen_Nom}', pronomen.nom)
    .replaceAll('{Pronomen_Akk}', pronomen.akk)
    .replaceAll('{Pronomen_Dat}', pronomen.dat)
    .replaceAll('{Pronomen_Poss}', pronomen.poss)
    .replaceAll('{Geburtsdatum}', formatiereDatum(schueler.geburtsdatum));
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
