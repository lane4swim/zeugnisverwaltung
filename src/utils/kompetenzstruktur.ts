import type { Abschnitt, Bereich, Kompetenz, KompetenzDatei } from '../types';

export interface KompetenzMitPfad {
  abschnitt: Abschnitt;
  bereich: Bereich;
  kompetenz: Kompetenz;
}

export function alleKompetenzen(datei: KompetenzDatei): KompetenzMitPfad[] {
  const ergebnis: KompetenzMitPfad[] = [];
  for (const abschnitt of datei.abschnitte) {
    for (const bereich of abschnitt.bereiche) {
      for (const kompetenz of bereich.kompetenzen) {
        ergebnis.push({ abschnitt, bereich, kompetenz });
      }
    }
  }
  return ergebnis;
}

export function findeKompetenz(datei: KompetenzDatei, kompetenzId: string): KompetenzMitPfad | null {
  return alleKompetenzen(datei).find((k) => k.kompetenz.id === kompetenzId) ?? null;
}

export function kompetenzIds(datei: KompetenzDatei): Set<string> {
  return new Set(alleKompetenzen(datei).map((k) => k.kompetenz.id));
}
