import type { Klassendatensatz } from '../types';
import { alsKlassendatensatz, validiereKlassendatensatz } from '../utils/validation';
import { loeseDateiDownloadAus } from '../utils/download';

export function dateinameFuer(datensatz: Klassendatensatz): string {
  const heute = new Date().toISOString().slice(0, 10);
  const klasse = datensatz.klasse.name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'klasse';
  return `zeugnisdaten_${klasse}_${datensatz.halbjahr}_${heute}.json`;
}

export function exportiereDatensatz(datensatz: Klassendatensatz): void {
  const inhalt = JSON.stringify(datensatz, null, 2);
  loeseDateiDownloadAus(inhalt, dateinameFuer(datensatz), 'application/json');
}

export interface ImportErgebnis {
  erfolgreich: boolean;
  datensatz?: Klassendatensatz;
  fehler: string[];
}

export async function importiereDatei(datei: File): Promise<ImportErgebnis> {
  if (!datei.name.toLowerCase().endsWith('.json')) {
    return { erfolgreich: false, fehler: [`"${datei.name}" ist keine JSON-Datei.`] };
  }
  let geparst: unknown;
  try {
    const text = await datei.text();
    geparst = JSON.parse(text);
  } catch {
    return { erfolgreich: false, fehler: ['Die Datei enthält kein gültiges JSON (korrupte Datei).'] };
  }
  const ergebnis = validiereKlassendatensatz(geparst);
  if (!ergebnis.gueltig) {
    return { erfolgreich: false, fehler: ergebnis.fehler };
  }
  return { erfolgreich: true, datensatz: alsKlassendatensatz(geparst), fehler: [] };
}
