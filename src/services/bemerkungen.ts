import type { Bemerkungsbaustein, KompetenzDatei, Schueler } from '../types';
import { ersetzePlatzhalter } from './textgenerierung';

/**
 * Führt die ausgewählten Bemerkungsbausteine zu einem Text zusammen
 * (spezifikation.md 5.3/6.1, Platzhalter {Bemerkungen}). Die Reihenfolge
 * folgt bewusst fest der Definitionsreihenfolge in der Kompetenzdatei
 * (spezifikation.md 5.3 nennt dies als zulässige Alternative zu einer frei
 * editierbaren Reihenfolge), unbekannte/veraltete IDs werden ignoriert.
 */
export function erzeugeBemerkungstext(
  ausgewaehlteIds: string[],
  alleBausteine: Bemerkungsbaustein[],
  schueler: Schueler,
): string {
  const ausgewaehlt = new Set(ausgewaehlteIds);
  return alleBausteine
    .filter((baustein) => ausgewaehlt.has(baustein.id))
    .map((baustein) => ersetzePlatzhalter(baustein.text, schueler))
    .join(' ');
}

/**
 * Deterministische ID für die automatische „nicht relevant"-Bemerkung eines
 * optionalen Fachs (spezifikation.md 3.7). Kein echter Bemerkungsbaustein
 * der Kompetenzdatei, sondern aus `Abschnitt.nichtRelevantBemerkung`
 * abgeleitet – siehe erzeugeVollstaendigeBausteinListe.
 */
const FACH_NICHT_RELEVANT_PRAEFIX = 'fach_nicht_relevant__';

export function fachNichtRelevantBemerkungsId(abschnittId: string): string {
  return `${FACH_NICHT_RELEVANT_PRAEFIX}${abschnittId}`;
}

/** Erkennt automatisch (über den Fach-Toggle) erzeugte Bemerkungs-IDs, im Unterschied zu frei wählbaren Bausteinen. */
export function istFachNichtRelevantBemerkungsId(bemerkungsId: string): boolean {
  return bemerkungsId.startsWith(FACH_NICHT_RELEVANT_PRAEFIX);
}

/**
 * Reguläre Bemerkungsbausteine der Kompetenzdatei, ergänzt um synthetische
 * Einträge für jedes optionale Fach mit definierter
 * `nichtRelevantBemerkung` – als gemeinsame Nachschlageliste für
 * erzeugeBemerkungstext, damit automatische Fach-Bemerkungen genauso wie
 * regulär ausgewählte Bausteine aufgelöst werden.
 */
export function erzeugeVollstaendigeBausteinListe(kompetenzdatei: KompetenzDatei): Bemerkungsbaustein[] {
  const fachBausteine: Bemerkungsbaustein[] = kompetenzdatei.abschnitte
    .filter((abschnitt) => abschnitt.optional && abschnitt.nichtRelevantBemerkung?.trim())
    .map((abschnitt) => ({
      id: fachNichtRelevantBemerkungsId(abschnitt.id),
      text: abschnitt.nichtRelevantBemerkung as string,
    }));
  return [...kompetenzdatei.bemerkungsbausteine, ...fachBausteine];
}
