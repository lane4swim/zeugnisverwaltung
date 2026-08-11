import { datensatzStore } from '../state/store';
import { importiereKlassenlisteAusCsv } from '../services/csvImport';
import { erstelleDropzone } from './dropzone';
import { bestaetigen, escapeHtml } from './bestaetigungsDialog';
import { meldungAnzeigen } from './meldungDialog';

/**
 * Liest eine Datei als Text. Excel exportiert deutsche CSV-Dateien teils als
 * Windows-1252 statt UTF-8, was Umlaute als Ersatzzeichen (U+FFFD) erscheinen
 * ließe – bei Erkennung eines Ersatzzeichens wird deshalb mit Windows-1252
 * erneut dekodiert (spezifikation.md 5.1).
 */
async function leseDateiAlsText(datei: File): Promise<string> {
  const puffer = await datei.arrayBuffer();
  const utf8Text = new TextDecoder('utf-8').decode(puffer);
  if (!utf8Text.includes('�')) return utf8Text;
  return new TextDecoder('windows-1252').decode(puffer);
}

/** CSV-Import der Klassenliste (spezifikation.md 5.1): fügt Schüler:innen zur aktiven Klasse hinzu. */
export function erstelleCsvImportKarte(): HTMLElement {
  const karte = document.createElement('section');
  karte.className = 'karte';
  karte.setAttribute('aria-labelledby', 'csv-import-titel');
  karte.innerHTML = `
    <h2 id="csv-import-titel">Klassenliste aus CSV importieren</h2>
    <p>
      Erwartete Spalten: „Name", „Vorname", „Geburtsdatum", „Geschlecht"
      (m/M/w/W oder ausgeschrieben). Die importierten Schüler:innen werden der
      aktuellen Klassenliste hinzugefügt.
    </p>
  `;

  const dropzone = erstelleDropzone({
    beschriftung: 'CSV-Datei mit der Klassenliste hier ablegen oder auswählen.',
    akzeptiert: '.csv,text/csv',
    onDatei: (datei) => void csvImportAusfuehren(datei),
  });
  karte.appendChild(dropzone);

  async function csvImportAusfuehren(datei: File): Promise<void> {
    const text = await leseDateiAlsText(datei);
    const ergebnis = importiereKlassenlisteAusCsv(text);
    if (!ergebnis.erfolgreich) {
      await meldungAnzeigen(`„${datei.name}" konnte nicht importiert werden`, ergebnis.fehler);
      return;
    }
    const namen = ergebnis.schueler.map((s) => `${s.vorname} ${s.nachname}`);
    const bestaetigt = await bestaetigen({
      titel: 'Schüler:innen importieren?',
      beschreibung: `${ergebnis.schueler.length} Schüler:in(nen) aus „${escapeHtml(datei.name)}" werden der aktuellen Klassenliste hinzugefügt: ${namen.map(escapeHtml).join(', ')}.`,
      bestaetigenText: 'Importieren',
    });
    if (bestaetigt) await datensatzStore.fuegeSchuelerListeHinzu(ergebnis.schueler);
  }

  return karte;
}
