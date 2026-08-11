import { datensatzStore } from '../state/store';
import { kompetenzdateiStore } from '../state/kompetenzdateiStore';
import type { Klassendatensatz } from '../types';
import { erstelleSchuelerListe } from './schuelerListe';
import { erstelleDropzone } from './dropzone';
import { erstelleKompetenzdateiStatus } from './kompetenzdateiStatus';
import { erstelleBewertungsAnsicht } from './bewertungsAnsicht';
import { erstelleBemerkungenAnsicht } from './bemerkungenAnsicht';
import { erstelleWordExportKarte } from './wordExportKarte';
import { exportiereDatensatz, importiereDatei } from '../services/exportImport';
import { bestaetigen, escapeHtml } from './bestaetigungsDialog';
import { meldungAnzeigen } from './meldungDialog';
import { halbjahreswechselDialogOeffnen } from './halbjahreswechselDialog';

export function erstelleKlassenAnsicht(): HTMLElement {
  const wurzel = document.createElement('div');

  const kopf = document.createElement('header');
  kopf.className = 'kopfzeile';

  const toolbar = document.createElement('div');
  toolbar.className = 'aktionsleiste';
  toolbar.innerHTML = `
    <button type="button" data-aktion="export">Als JSON exportieren</button>
    <button type="button" class="sekundaer" data-aktion="halbjahreswechsel">Halbjahreswechsel…</button>
    <button type="button" class="sekundaer" data-aktion="schliessen">Datensatz schließen</button>
  `;

  const kompetenzdateiStatus = erstelleKompetenzdateiStatus();

  const importKarte = document.createElement('section');
  importKarte.className = 'karte';
  importKarte.setAttribute('aria-labelledby', 'ersetzen-titel');
  importKarte.innerHTML = '<h2 id="ersetzen-titel">Anderen Datensatz laden</h2>';
  const dropzone = erstelleDropzone({
    beschriftung: 'Ersetzt den aktuell aktiven Datensatz durch eine importierte JSON-Datei.',
    onDatei: (datei) => importAusfuehren(datei),
  });
  importKarte.appendChild(dropzone);

  const wordExportKarte = erstelleWordExportKarte();

  type Ansicht = { modus: 'liste' } | { modus: 'bewertung'; schuelerId: string } | { modus: 'bemerkungen'; schuelerId: string };
  let ansicht: Ansicht = { modus: 'liste' };
  const inhalt = document.createElement('div');

  function zurZurListe(): void {
    ansicht = { modus: 'liste' };
    renderInhalt();
  }

  function renderInhalt(): void {
    if (ansicht.modus === 'bewertung') {
      inhalt.replaceChildren(erstelleBewertungsAnsicht(ansicht.schuelerId, zurZurListe));
      return;
    }
    if (ansicht.modus === 'bemerkungen') {
      inhalt.replaceChildren(erstelleBemerkungenAnsicht(ansicht.schuelerId, zurZurListe));
      return;
    }
    const schuelerListe = erstelleSchuelerListe({
      onBewerten: (schuelerId) => {
        ansicht = { modus: 'bewertung', schuelerId };
        renderInhalt();
      },
      onBemerkungen: (schuelerId) => {
        ansicht = { modus: 'bemerkungen', schuelerId };
        renderInhalt();
      },
    });
    inhalt.replaceChildren(schuelerListe, wordExportKarte, importKarte);
  }

  wurzel.append(kopf, toolbar, kompetenzdateiStatus, inhalt);
  renderInhalt();

  function renderKopf(datensatz: Klassendatensatz): void {
    kopf.innerHTML = `
      <h1>${escapeHtml(datensatz.klasse.name)} — Halbjahr ${escapeHtml(datensatz.halbjahr)}</h1>
      <p>Schuljahr ${escapeHtml(datensatz.klasse.schuljahr)} · ${datensatz.schueler.length} Schüler:in(nen)</p>
    `;
  }

  async function importAusfuehren(datei: File): Promise<void> {
    const ergebnis = await importiereDatei(datei);
    if (!ergebnis.erfolgreich || !ergebnis.datensatz) {
      await meldungAnzeigen(`"${datei.name}" konnte nicht importiert werden`, ergebnis.fehler);
      return;
    }
    const bestaetigt = await bestaetigen({
      titel: 'Aktuellen Datensatz ersetzen?',
      beschreibung: `Der aktive Datensatz „${datensatzStore.get()?.klasse.name ?? ''}" wird durch „${ergebnis.datensatz.klasse.name}" (Halbjahr ${ergebnis.datensatz.halbjahr}) ersetzt. Nicht exportierte Änderungen im aktuellen Datensatz gehen dabei nicht verloren (bleiben bis zum nächsten Überschreiben in der lokalen Datenbank), werden aber aus der Ansicht entfernt.`,
      bestaetigenText: 'Ersetzen',
      gefahr: true,
    });
    if (bestaetigt) {
      ansicht = { modus: 'liste' };
      await datensatzStore.setzeDatensatz(ergebnis.datensatz);
    }
  }

  toolbar.querySelector('[data-aktion="export"]')?.addEventListener('click', () => {
    const datensatz = datensatzStore.get();
    if (datensatz) exportiereDatensatz(datensatz);
  });

  toolbar.querySelector('[data-aktion="schliessen"]')?.addEventListener('click', async () => {
    const datensatz = datensatzStore.get();
    if (!datensatz) return;
    const bestaetigt = await schliessenDialogOeffnen(datensatz);
    if (bestaetigt) await datensatzStore.schliesseDatensatz();
  });

  toolbar.querySelector('[data-aktion="halbjahreswechsel"]')?.addEventListener('click', async () => {
    const aktuell = datensatzStore.get();
    if (!aktuell) return;
    const neuerDatensatz = await halbjahreswechselDialogOeffnen(aktuell);
    if (neuerDatensatz) {
      ansicht = { modus: 'liste' };
      await datensatzStore.setzeDatensatz(neuerDatensatz);
    }
  });

  datensatzStore.subscribe((datensatz) => {
    if (!datensatz) return;
    renderKopf(datensatz);
    void kompetenzdateiStore.stelleSicher(datensatz.halbjahr);
  });

  // Sobald eine (neue oder aktualisierte) Kompetenzdatei-Version geladen ist,
  // im Klassendatensatz vermerken (spezifikation.md 3.7).
  kompetenzdateiStore.subscribe((zustand) => {
    if (zustand.status !== 'geladen' || !zustand.datei) return;
    const datensatz = datensatzStore.get();
    if (datensatz && datensatz.halbjahr === zustand.halbjahr && datensatz.kompetenzdateiVersion !== zustand.datei.version) {
      void datensatzStore.setzeKompetenzdateiVersion(zustand.datei.version);
    }
  });

  return wurzel;
}

/**
 * Da genau ein Datensatz aktiv verwaltet wird (siehe spezifikation.md 3.2),
 * entfernt „Schließen" den Datensatz endgültig aus der lokalen Datenbank.
 * Der Dialog macht das unmissverständlich und bietet einen Export als
 * Backup direkt an, bevor bestätigt werden muss.
 */
function schliessenDialogOeffnen(datensatz: Klassendatensatz): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'schliessen-titel');
    dialog.innerHTML = `
      <div class="dialog-inhalt">
        <h2 id="schliessen-titel">Datensatz schließen</h2>
        <p>
          „${escapeHtml(datensatz.klasse.name)}" (Halbjahr ${escapeHtml(datensatz.halbjahr)}) wird
          <strong>endgültig aus der lokalen Datenbank entfernt</strong>. Ohne vorherigen JSON-Export
          sind alle Daten danach unwiederbringlich verloren.
        </p>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="export-zuerst">Zuerst als JSON exportieren</button>
        </div>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">Abbrechen</button>
          <button type="button" class="gefahr" data-aktion="schliessen">Endgültig schließen</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    const beenden = (ergebnis: boolean) => {
      dialog.close();
      dialog.remove();
      resolve(ergebnis);
    };

    dialog.querySelector('[data-aktion="export-zuerst"]')?.addEventListener('click', () => {
      exportiereDatensatz(datensatz);
    });
    dialog.querySelector('[data-aktion="abbrechen"]')?.addEventListener('click', () => beenden(false));
    dialog.querySelector('[data-aktion="schliessen"]')?.addEventListener('click', () => beenden(true));
    dialog.addEventListener('cancel', () => beenden(false));

    dialog.showModal();
  });
}
