import type { Bemerkungsbaustein, Schueler } from '../types';
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
