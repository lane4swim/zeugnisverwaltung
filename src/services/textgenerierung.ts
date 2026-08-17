import type { Geschlecht, Schueler } from '../types';
import { formatiereDatum } from '../utils/datum';

interface Pronomentabelle {
  nom: string;
  akk: string;
  dat: string;
  poss: string;
}

// Feste Ersetzungstabelle gemäß spezifikation.md 5.4/6.2: ausschließlich
// binär "w"/"m", "divers" wird bewusst nicht angeboten. `poss` ist bewusst
// nur der Stamm des Possessivpronomens (die endungslose Form, korrekt für
// z. B. "sein Arbeitsmaterial") – die übrigen Deklinationsformen (siehe
// PRONOMEN_POSS_ENDUNGEN) werden daraus abgeleitet.
const PRONOMEN: Record<Geschlecht, Pronomentabelle> = {
  w: { nom: 'sie', akk: 'sie', dat: 'ihr', poss: 'ihr' },
  m: { nom: 'er', akk: 'ihn', dat: 'ihm', poss: 'sein' },
};

/**
 * Possessivpronomen ("ein-Wörter" wie sein/ihr) dekliniert vollständig
 * regelmäßig durch Anhängen einer Endung an den Stamm – anders als bei
 * Personalpronomen (Pronomen_Nom/_Akk/_Dat) reicht daher eine einzige feste
 * Zeichenkette je Geschlecht nicht aus: "sein Arbeitsmaterial" (Neutrum
 * Singular, endungslos) braucht eine andere Form als "seine
 * Arbeitsmaterialien" (Plural, Endung „-e"). Diese Tabelle bildet die in
 * Zeugnistexten vorkommenden Fälle auf ihre Endung ab (spezifikation.md 6.1/
 * 6.2); der Platzhaltername entspricht jeweils der angehängten Endung.
 */
const PRONOMEN_POSS_ENDUNGEN = {
  /** Maskulinum Nominativ Singular, Neutrum Nominativ/Akkusativ Singular, z. B. "sein Arbeitsmaterial". */
  Poss: '',
  /** Femininum Nominativ/Akkusativ Singular, Plural Nominativ/Akkusativ, z. B. "seine Arbeitsmaterialien". */
  Poss_e: 'e',
  /** Maskulinum Akkusativ Singular, Plural Dativ, z. B. "seinen Mitschüler:innen". */
  Poss_en: 'en',
  /** Maskulinum/Neutrum Dativ Singular, z. B. "seinem Heft". */
  Poss_em: 'em',
  /** Maskulinum/Neutrum Genitiv Singular, z. B. "seines Hefts". */
  Poss_es: 'es',
  /** Femininum Dativ/Genitiv Singular, Plural Genitiv, z. B. "seiner Mappe". */
  Poss_er: 'er',
} satisfies Record<string, string>;

/**
 * Liefert die Schülerstammdaten-Platzhalter aus spezifikation.md 6.1 als
 * flache Schlüssel/Wert-Tabelle (ohne die geschweiften Klammern) – Basis für
 * sowohl die Satzbaustein-Ersetzung als auch den Word-Export (Phase 6).
 */
export function erzeugeSchuelerFelder(schueler: Schueler): Record<string, string> {
  const pronomen = PRONOMEN[schueler.geschlecht];
  const possessivFelder = Object.fromEntries(
    Object.entries(PRONOMEN_POSS_ENDUNGEN).map(([platzhalter, endung]) => [
      `Pronomen_${platzhalter}`,
      `${pronomen.poss}${endung}`,
    ]),
  );
  return {
    Vorname: schueler.vorname,
    Nachname: schueler.nachname,
    Pronomen_Nom: pronomen.nom,
    Pronomen_Akk: pronomen.akk,
    Pronomen_Dat: pronomen.dat,
    ...possessivFelder,
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

export interface Auswahlgruppe {
  start: number;
  ende: number;
  optionen: string[];
}

/**
 * Findet Auswahlgruppen der Form `{Option A|Option B|Option C}` in einem
 * Bemerkungstext (spezifikation.md 3.6/5.3), z. B.
 * `{schulisch|außerschulisch}`. Unterscheidet sich von einem regulären
 * Platzhalter wie `{Vorname}` durch das Trennzeichen `|`, sodass beide
 * Syntaxen im selben Text nebeneinander vorkommen können. Die
 * zurückgegebene Reihenfolge entspricht der Fundstelle im Text.
 */
export function ermittleAuswahlgruppen(text: string): Auswahlgruppe[] {
  const gruppen: Auswahlgruppe[] = [];
  const regex = /\{([^{}]*)\}/g;
  let treffer: RegExpExecArray | null;
  while ((treffer = regex.exec(text))) {
    const inhalt = treffer[1];
    if (inhalt.includes('|')) {
      gruppen.push({
        start: treffer.index,
        ende: treffer.index + treffer[0].length,
        optionen: inhalt.split('|').map((option) => option.trim()),
      });
    }
  }
  return gruppen;
}

/**
 * Löst Auswahlgruppen im Text anhand gewählter Options-Indizes auf (in
 * Fundreihenfolge); reguläre Platzhalter wie `{Vorname}` bleiben
 * unverändert stehen und werden separat über ersetzePlatzhalter ersetzt.
 * Fehlt für eine Gruppe ein gewählter Index (z. B. noch keine bewusste
 * Auswahl getroffen) oder liegt er außerhalb des gültigen Bereichs, gilt
 * die jeweils erste Option als Voreinstellung.
 */
export function loeseAuswahlgruppenAuf(text: string, gewaehlteIndizes: number[] | undefined): string {
  const gruppen = ermittleAuswahlgruppen(text);
  if (gruppen.length === 0) return text;

  let ergebnis = '';
  let cursor = 0;
  gruppen.forEach((gruppe, index) => {
    ergebnis += text.slice(cursor, gruppe.start);
    const gewaehlterIndex = gewaehlteIndizes?.[index];
    const gueltigerIndex =
      gewaehlterIndex !== undefined && gewaehlterIndex >= 0 && gewaehlterIndex < gruppe.optionen.length
        ? gewaehlterIndex
        : 0;
    ergebnis += gruppe.optionen[gueltigerIndex];
    cursor = gruppe.ende;
  });
  ergebnis += text.slice(cursor);
  return ergebnis;
}
