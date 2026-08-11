import type { Bewertung, KompetenzDatei } from '../types';
import { alleKompetenzen } from '../utils/kompetenzstruktur';

export type Bewertungsstatus = 'vollstaendig' | 'teilweise' | 'nicht_begonnen';

export interface Bewertungsfortschritt {
  status: Bewertungsstatus;
  bewerteteAnzahl: number;
  gesamtAnzahl: number;
}

/**
 * Ermittelt den Bewertungsfortschritt einer Person anhand der Anzahl
 * gültiger Bewertungen (siehe 4.1: eine nach einem Kompetenzdatei-Update
 * ungültig gewordene Stufe zählt nicht als bewertet) gegenüber der
 * Gesamtzahl an Kompetenzen in der aktuellen Kompetenzdatei. Grundlage für
 * die Ampel in der Klassenliste und die Vollständigkeitswarnung vor dem
 * Word-Export.
 */
export function ermittleBewertungsfortschritt(
  schuelerId: string,
  bewertungen: Bewertung[],
  kompetenzdatei: KompetenzDatei,
): Bewertungsfortschritt {
  const kompetenzen = alleKompetenzen(kompetenzdatei);
  const gesamtAnzahl = kompetenzen.length;

  const gueltigBewerteteIds = new Set(
    bewertungen
      .filter((b) => b.schuelerId === schuelerId)
      .filter((b) => {
        const eintrag = kompetenzen.find((k) => k.kompetenz.id === b.kompetenzId);
        return eintrag !== undefined && b.stufe <= eintrag.kompetenz.stufen.length;
      })
      .map((b) => b.kompetenzId),
  );
  const bewerteteAnzahl = gueltigBewerteteIds.size;

  let status: Bewertungsstatus;
  if (gesamtAnzahl === 0 || bewerteteAnzahl === gesamtAnzahl) {
    status = 'vollstaendig';
  } else if (bewerteteAnzahl === 0) {
    status = 'nicht_begonnen';
  } else {
    status = 'teilweise';
  }

  return { status, bewerteteAnzahl, gesamtAnzahl };
}
