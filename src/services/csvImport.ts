import type { Geschlecht, Schueler } from '../types';

export interface CsvImportErgebnis {
  erfolgreich: boolean;
  schueler: Schueler[];
  fehler: string[];
}

const ERWARTETE_SPALTEN = {
  nachname: 'name',
  vorname: 'vorname',
  geburtsdatum: 'geburtsdatum',
  geschlecht: 'geschlecht',
} as const;

const GESCHLECHT_ABBILDUNG: Record<string, Geschlecht> = {
  m: 'm',
  männlich: 'm',
  maennlich: 'm',
  w: 'w',
  weiblich: 'w',
};

const DIVERS_WERTE = new Set(['d', 'divers']);

/** Zerlegt eine CSV-Zeile respektvoll gegenüber Anführungszeichen (RFC4180-artig, ohne mehrzeilige Felder). */
function teileCsvZeile(zeile: string, trenner: string): string[] {
  const felder: string[] = [];
  let aktuell = '';
  let inAnfuehrungszeichen = false;
  for (let i = 0; i < zeile.length; i++) {
    const zeichen = zeile[i];
    if (inAnfuehrungszeichen) {
      if (zeichen === '"') {
        if (zeile[i + 1] === '"') {
          aktuell += '"';
          i++;
        } else {
          inAnfuehrungszeichen = false;
        }
      } else {
        aktuell += zeichen;
      }
    } else if (zeichen === '"') {
      inAnfuehrungszeichen = true;
    } else if (zeichen === trenner) {
      felder.push(aktuell);
      aktuell = '';
    } else {
      aktuell += zeichen;
    }
  }
  felder.push(aktuell);
  return felder;
}

/** Erkennt das Trennzeichen anhand der Kopfzeile (Semikolon zuerst, da bei deutschen Excel-Exporten üblich). */
function ermittleTrenner(kopfzeile: string): string {
  const erwartet = Object.values(ERWARTETE_SPALTEN);
  for (const kandidat of [';', ',', '\t']) {
    const felder = teileCsvZeile(kopfzeile, kandidat).map((f) => f.trim().toLowerCase());
    if (erwartet.every((spalte) => felder.includes(spalte))) return kandidat;
  }
  return [';', ',', '\t'].reduce((bester, kandidat) =>
    teileCsvZeile(kopfzeile, kandidat).length > teileCsvZeile(kopfzeile, bester).length ? kandidat : bester,
  );
}

function normalisiereGeburtsdatum(rohwert: string): string | null {
  const wert = rohwert.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(wert)) {
    const [jahr, monat, tag] = wert.split('-').map(Number);
    return istGueltigesDatum(jahr, monat, tag) ? wert : null;
  }
  const deutschesFormat = wert.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deutschesFormat) {
    const tag = Number(deutschesFormat[1]);
    const monat = Number(deutschesFormat[2]);
    const jahr = Number(deutschesFormat[3]);
    if (!istGueltigesDatum(jahr, monat, tag)) return null;
    return `${jahr}-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`;
  }
  return null;
}

function istGueltigesDatum(jahr: number, monat: number, tag: number): boolean {
  const datum = new Date(jahr, monat - 1, tag);
  return datum.getFullYear() === jahr && datum.getMonth() === monat - 1 && datum.getDate() === tag;
}

/** null = unbekannter Wert, 'divers' = erkannt, aber von dieser App nicht unterstützt (siehe spezifikation.md 5.4). */
function normalisiereGeschlecht(rohwert: string): Geschlecht | 'divers' | null {
  const wert = rohwert.trim().toLowerCase();
  if (DIVERS_WERTE.has(wert)) return 'divers';
  return GESCHLECHT_ABBILDUNG[wert] ?? null;
}

/**
 * Importiert eine Klassenliste aus einer CSV-Datei mit benannten Spalten
 * "Name" (=Nachname), "Vorname", "Geburtsdatum", "Geschlecht" (spezifikation.md
 * 5.1). Geschlecht akzeptiert m/M/w/W sowie "männlich"/"weiblich" ausgeschrieben;
 * "d"/"divers" wird erkannt, aber abgelehnt, da die App ausschließlich die
 * binäre Pronomen-Logik "w"/"m" unterstützt (5.4). Validiert die gesamte
 * Datei zuerst und importiert bei jedem Fehler nichts (alles oder nichts,
 * analog zum JSON-Import in 5.5).
 */
export function importiereKlassenlisteAusCsv(csvText: string): CsvImportErgebnis {
  const bereinigterText = csvText.replace(/^﻿/, '');
  const zeilen = bereinigterText.split(/\r\n|\r|\n/).filter((z) => z.trim() !== '');
  if (zeilen.length === 0) {
    return { erfolgreich: false, schueler: [], fehler: ['Die CSV-Datei ist leer.'] };
  }

  const trenner = ermittleTrenner(zeilen[0]);
  const kopfzeile = teileCsvZeile(zeilen[0], trenner).map((f) => f.trim().toLowerCase());

  const spaltenIndex: Partial<Record<keyof typeof ERWARTETE_SPALTEN, number>> = {};
  const fehlendeSpalten: string[] = [];
  for (const [feld, header] of Object.entries(ERWARTETE_SPALTEN) as [keyof typeof ERWARTETE_SPALTEN, string][]) {
    const index = kopfzeile.indexOf(header);
    if (index === -1) fehlendeSpalten.push(header);
    else spaltenIndex[feld] = index;
  }
  if (fehlendeSpalten.length > 0) {
    return {
      erfolgreich: false,
      schueler: [],
      fehler: [
        `Fehlende Spalte(n) in der CSV-Datei: ${fehlendeSpalten.join(', ')}. Erwartet werden benannte Spalten „Name", „Vorname", „Geburtsdatum", „Geschlecht" (Groß-/Kleinschreibung egal).`,
      ],
    };
  }

  const fehler: string[] = [];
  const schueler: Schueler[] = [];

  for (let i = 1; i < zeilen.length; i++) {
    const zeilenNummer = i + 1; // 1-basiert, Kopfzeile mitgezählt (für Fehlermeldungen wie in einer Tabellenkalkulation)
    const felder = teileCsvZeile(zeilen[i], trenner);
    const nachname = (felder[spaltenIndex.nachname as number] ?? '').trim();
    const vorname = (felder[spaltenIndex.vorname as number] ?? '').trim();
    const geburtsdatumRoh = (felder[spaltenIndex.geburtsdatum as number] ?? '').trim();
    const geschlechtRoh = (felder[spaltenIndex.geschlecht as number] ?? '').trim();
    const anzeigename = `${vorname} ${nachname}`.trim() || `Zeile ${zeilenNummer}`;

    if (!nachname) fehler.push(`Zeile ${zeilenNummer}: Name fehlt.`);
    if (!vorname) fehler.push(`Zeile ${zeilenNummer}: Vorname fehlt.`);

    const geburtsdatum = normalisiereGeburtsdatum(geburtsdatumRoh);
    if (!geburtsdatum) {
      fehler.push(
        `Zeile ${zeilenNummer} (${anzeigename}): Geburtsdatum "${geburtsdatumRoh}" ist ungültig (erwartet TT.MM.JJJJ oder JJJJ-MM-TT).`,
      );
    }

    const geschlecht = normalisiereGeschlecht(geschlechtRoh);
    if (geschlecht === null) {
      fehler.push(
        `Zeile ${zeilenNummer} (${anzeigename}): Geschlecht "${geschlechtRoh}" ist ungültig (erwartet m/M/w/W oder ausgeschrieben „männlich"/„weiblich").`,
      );
    } else if (geschlecht === 'divers') {
      fehler.push(
        `Zeile ${zeilenNummer} (${anzeigename}): Geschlecht „divers" wird von dieser App nicht unterstützt – die Pronomen-Logik kennt ausschließlich „w"/„m" (siehe spezifikation.md 5.4). Bitte die Zeile in der CSV-Datei manuell auf „w" oder „m" korrigieren und erneut importieren.`,
      );
    }

    if (!nachname || !vorname || !geburtsdatum || geschlecht === null || geschlecht === 'divers') continue;

    schueler.push({
      id: crypto.randomUUID(),
      nachname,
      vorname,
      geburtsdatum,
      geschlecht,
    });
  }

  if (fehler.length > 0) {
    return { erfolgreich: false, schueler: [], fehler };
  }
  if (schueler.length === 0) {
    return { erfolgreich: false, schueler: [], fehler: ['Die CSV-Datei enthält keine Datenzeilen unterhalb der Kopfzeile.'] };
  }
  return { erfolgreich: true, schueler, fehler: [] };
}
