import { datensatzStore } from '../state/store';
import { kompetenzdateiStore } from '../state/kompetenzdateiStore';
import { erstelleDropzone } from './dropzone';
import { meldungAnzeigen } from './meldungDialog';
import { erzeugeDatenkontext, sortiereSchuelerFuerExport } from '../services/wordExport';
import { baueSammeldokument, WordExportFehler } from '../services/wordMerge';
import { loeseDateiDownloadAus } from '../utils/download';
import { ermittleBewertungsfortschritt } from '../services/bewertungsstatus';
import { unvollstaendigkeitsWarnungOeffnen, type UnvollstaendigeBewertung } from './unvollstaendigkeitsDialog';

const WORD_MIME_TYP = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function dateinameFuerSammeldokument(klassenname: string, halbjahr: string): string {
  const heute = new Date().toISOString().slice(0, 10);
  const klasse = klassenname.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'klasse';
  return `sammelzeugnisse_${klasse}_${halbjahr}_${heute}.docx`;
}

/**
 * Sammeldokument-Export (spezifikation.md 5.6): Die Word-Vorlage wird
 * unmittelbar vor dem Export lokal ausgewählt, nirgends gespeichert und nur
 * für diesen einen Exportvorgang im Speicher gehalten.
 */
export function erstelleWordExportKarte(): HTMLElement {
  const wurzel = document.createElement('section');
  wurzel.className = 'karte';
  wurzel.setAttribute('aria-labelledby', 'word-export-titel');
  wurzel.innerHTML = `
    <h2 id="word-export-titel">Sammelzeugnis exportieren</h2>
    <p>
      Wähle eine Word-Vorlage (.docx) mit Platzhaltern wie <code>{{Vorname}}</code>,
      <code>{{Bereich_lesen}}</code> oder <code>{{Bemerkungen}}</code> (siehe spezifikation.md 6.1).
      Für jede Person in der Klasse wird die Vorlage einmal befüllt; alle Einzelzeugnisse werden zu
      einer einzigen Word-Datei zusammengeführt und direkt heruntergeladen. Die Vorlage wird dabei
      nicht dauerhaft gespeichert.
    </p>
    <div data-bereich="status"></div>
    <div data-bereich="dropzone"></div>
  `;

  const statusBereich = wurzel.querySelector('[data-bereich="status"]') as HTMLDivElement;
  const dropzoneBereich = wurzel.querySelector('[data-bereich="dropzone"]') as HTMLDivElement;

  let beschaeftigt = false;

  const dropzone = erstelleDropzone({
    beschriftung: 'Word-Vorlage (.docx) für den Sammeldokument-Export.',
    akzeptiert: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    onDatei: (datei) => {
      if (beschaeftigt) return;
      void exportAusfuehren(datei);
    },
  });
  dropzoneBereich.appendChild(dropzone);

  async function exportAusfuehren(vorlagenDatei: File): Promise<void> {
    const datensatz = datensatzStore.get();
    const kdZustand = kompetenzdateiStore.get();

    if (!datensatz) return;
    if (kdZustand.status !== 'geladen' || !kdZustand.datei) {
      await meldungAnzeigen('Export nicht möglich', ['Die Kompetenzdatei für dieses Halbjahr ist noch nicht geladen.']);
      return;
    }
    if (datensatz.schueler.length === 0) {
      await meldungAnzeigen('Export nicht möglich', ['Die Klasse enthält noch keine Schüler:innen.']);
      return;
    }
    if (!vorlagenDatei.name.toLowerCase().endsWith('.docx')) {
      await meldungAnzeigen('Export nicht möglich', [`"${vorlagenDatei.name}" ist keine .docx-Datei.`]);
      return;
    }

    const unvollstaendige: UnvollstaendigeBewertung[] = datensatz.schueler
      .map((schueler) => {
        const nichtRelevanteAbschnittIds =
          datensatz.nichtRelevanteAbschnitte.find((e) => e.schuelerId === schueler.id)?.abschnittIds ?? [];
        return {
          schueler,
          fortschritt: ermittleBewertungsfortschritt(schueler.id, datensatz.bewertungen, kdZustand.datei!, nichtRelevanteAbschnittIds),
        };
      })
      .filter(({ fortschritt }) => fortschritt.status !== 'vollstaendig');
    if (unvollstaendige.length > 0) {
      const fortfahren = await unvollstaendigkeitsWarnungOeffnen(unvollstaendige);
      if (!fortfahren) return;
    }

    beschaeftigt = true;
    statusBereich.innerHTML = `<p>Sammeldokument wird erstellt für ${datensatz.schueler.length} Schüler:in(nen)…</p>`;

    try {
      const vorlagenBuffer = await vorlagenDatei.arrayBuffer();
      const sortierteSchueler = sortiereSchuelerFuerExport(datensatz.schueler);
      const datenkontexte = sortierteSchueler.map((schueler) => erzeugeDatenkontext(schueler, datensatz, kdZustand.datei!));
      const sammeldokument = baueSammeldokument(vorlagenBuffer, datenkontexte);
      loeseDateiDownloadAus(
        sammeldokument,
        dateinameFuerSammeldokument(datensatz.klasse.name, datensatz.halbjahr),
        WORD_MIME_TYP,
      );
      statusBereich.innerHTML = `<p>Sammeldokument für ${sortierteSchueler.length} Schüler:in(nen) wurde heruntergeladen.</p>`;
    } catch (fehler) {
      const meldungen = fehler instanceof WordExportFehler ? fehler.message.split('\n') : [String(fehler)];
      statusBereich.innerHTML = '';
      await meldungAnzeigen('Export fehlgeschlagen', meldungen);
    } finally {
      beschaeftigt = false;
    }
  }

  return wurzel;
}
