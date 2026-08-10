import { istHalbjahr, type Klassendatensatz } from '../types';

export interface ValidierungsErgebnis {
  gueltig: boolean;
  fehler: string[];
}

function istString(wert: unknown): wert is string {
  return typeof wert === 'string';
}

/**
 * Prüft eine importierte JSON-Struktur gegen das Exportformat aus
 * spezifikation.md 3.7. Bewusst tolerant gegenüber unbekannten
 * Zusatzfeldern, aber strikt bei fehlenden Pflichtfeldern und falschen Typen.
 */
export function validiereKlassendatensatz(daten: unknown): ValidierungsErgebnis {
  const fehler: string[] = [];

  if (typeof daten !== 'object' || daten === null) {
    return { gueltig: false, fehler: ['Die Datei enthält kein gültiges JSON-Objekt.'] };
  }
  const d = daten as Record<string, unknown>;

  if (d.formatVersion !== 1) {
    fehler.push('Unbekannte oder fehlende formatVersion (erwartet: 1).');
  }
  if (!istHalbjahr(d.halbjahr)) {
    fehler.push(`Ungültiges oder fehlendes Halbjahr: ${String(d.halbjahr)}`);
  }
  if (typeof d.klasse !== 'object' || d.klasse === null) {
    fehler.push('Feld "klasse" fehlt oder ist ungültig.');
  } else {
    const klasse = d.klasse as Record<string, unknown>;
    if (!istString(klasse.name) || klasse.name.trim() === '') {
      fehler.push('Klassenname fehlt.');
    }
    if (!istString(klasse.schuljahr) || klasse.schuljahr.trim() === '') {
      fehler.push('Schuljahr fehlt.');
    }
  }
  if (!Array.isArray(d.schueler)) {
    fehler.push('Feld "schueler" fehlt oder ist kein Array.');
  } else {
    const ids = new Set<string>();
    d.schueler.forEach((eintrag, i) => {
      if (typeof eintrag !== 'object' || eintrag === null) {
        fehler.push(`schueler[${i}] ist kein Objekt.`);
        return;
      }
      const s = eintrag as Record<string, unknown>;
      if (!istString(s.id) || s.id === '') fehler.push(`schueler[${i}].id fehlt.`);
      else if (ids.has(s.id)) fehler.push(`schueler[${i}].id ist doppelt vergeben: ${s.id}`);
      else ids.add(s.id);
      if (!istString(s.nachname) || s.nachname.trim() === '') fehler.push(`schueler[${i}].nachname fehlt.`);
      if (!istString(s.vorname) || s.vorname.trim() === '') fehler.push(`schueler[${i}].vorname fehlt.`);
      if (!istString(s.geburtsdatum) || !/^\d{4}-\d{2}-\d{2}$/.test(s.geburtsdatum)) {
        fehler.push(`schueler[${i}].geburtsdatum ist ungültig (erwartet yyyy-mm-dd).`);
      }
      if (s.geschlecht !== 'w' && s.geschlecht !== 'm') {
        fehler.push(`schueler[${i}].geschlecht muss "w" oder "m" sein.`);
      }
    });
  }
  for (const feld of ['bewertungen', 'bewertungstexte', 'bemerkungen'] as const) {
    if (!Array.isArray(d[feld])) {
      fehler.push(`Feld "${feld}" fehlt oder ist kein Array.`);
    }
  }

  return { gueltig: fehler.length === 0, fehler };
}

export function alsKlassendatensatz(daten: unknown): Klassendatensatz {
  return daten as Klassendatensatz;
}
