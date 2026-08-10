import { HALBJAHRE, type Halbjahr, type Klassendatensatz } from '../types';
import { erzeugeLeerenDatensatz } from '../types';
import { exportiereDatensatz } from '../services/exportImport';
import { escapeHtml } from './bestaetigungsDialog';

function naechstesHalbjahr(aktuell: Halbjahr): Halbjahr {
  const index = HALBJAHRE.indexOf(aktuell);
  return HALBJAHRE[(index + 1) % HALBJAHRE.length];
}

/**
 * Halbjahreswechsel-Assistent gemäß spezifikation.md 3.2/5.1: übernimmt
 * ausschließlich die Schülerstammdaten in einen neuen, leeren Datensatz
 * des gewählten Folgehalbjahres – keine Bewertungen, Texte oder Bemerkungen.
 */
export function halbjahreswechselDialogOeffnen(quelle: Klassendatensatz): Promise<Klassendatensatz | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'wechsel-dialog-titel');

    const optionenHtml = HALBJAHRE.map(
      (hj) => `<option value="${hj}" ${hj === naechstesHalbjahr(quelle.halbjahr) ? 'selected' : ''}>${hj}</option>`,
    ).join('');

    dialog.innerHTML = `
      <form method="dialog" class="dialog-inhalt" novalidate>
        <h2 id="wechsel-dialog-titel">Halbjahreswechsel</h2>
        <p>
          Übernimmt die ${quelle.schueler.length} Schüler:innen der Klasse „${escapeHtml(quelle.klasse.name)}"
          als Stammdaten in einen neuen, leeren Datensatz. Bewertungen, Texte und Bemerkungen
          werden <strong>nicht</strong> übernommen, da sie halbjahresspezifisch sind.
        </p>
        <p><strong>Hinweis:</strong> Der aktuell aktive Datensatz wird dabei ersetzt. Exportiere ihn vorher, falls du ihn als Backup behalten möchtest.</p>
        <div class="formularzeile">
          <label for="feld-ziel-halbjahr">Ziel-Halbjahr</label>
          <select id="feld-ziel-halbjahr" name="halbjahr">${optionenHtml}</select>
        </div>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="export-zuerst">Aktuellen Datensatz zuerst exportieren</button>
        </div>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">Abbrechen</button>
          <button type="submit" data-aktion="uebernehmen">Übernehmen</button>
        </div>
      </form>
    `;
    document.body.appendChild(dialog);

    const schliessen = (ergebnis: Klassendatensatz | null) => {
      dialog.close();
      dialog.remove();
      resolve(ergebnis);
    };

    dialog.querySelector('[data-aktion="abbrechen"]')?.addEventListener('click', () => schliessen(null));
    dialog.addEventListener('cancel', () => schliessen(null));
    dialog.querySelector('[data-aktion="export-zuerst"]')?.addEventListener('click', () => {
      exportiereDatensatz(quelle);
    });

    const form = dialog.querySelector('form') as HTMLFormElement;
    form.addEventListener('submit', (ereignis) => {
      ereignis.preventDefault();
      const ziel = (dialog.querySelector('#feld-ziel-halbjahr') as HTMLSelectElement).value as Halbjahr;
      const neuerDatensatz = erzeugeLeerenDatensatz(ziel, { ...quelle.klasse });
      neuerDatensatz.schueler = quelle.schueler.map((s) => ({ ...s }));
      schliessen(neuerDatensatz);
    });

    dialog.showModal();
  });
}
