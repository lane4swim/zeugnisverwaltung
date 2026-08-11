import { datensatzStore } from '../state/store';
import { HALBJAHRE, type Halbjahr, erzeugeLeerenDatensatz } from '../types';
import { erstelleDropzone } from './dropzone';
import { importiereDatei } from '../services/exportImport';
import { pruefeUndMeldeImportVersionskonflikt } from '../services/importVersionscheck';
import { meldungAnzeigen } from './meldungDialog';

function aktuellesSchuljahr(): string {
  const heute = new Date();
  const jahr = heute.getFullYear();
  // Schuljahr in NRW beginnt im Sommer (grob: ab August).
  const startjahr = heute.getMonth() >= 7 ? jahr : jahr - 1;
  return `${startjahr}/${startjahr + 1}`;
}

export function erstelleStartScreen(): HTMLElement {
  const wurzel = document.createElement('div');

  const neuKarte = document.createElement('section');
  neuKarte.className = 'karte';
  neuKarte.setAttribute('aria-labelledby', 'neu-titel');
  neuKarte.innerHTML = `
    <h2 id="neu-titel">Neuen Klassendatensatz anlegen</h2>
    <form novalidate>
      <div class="formularzeile">
        <label for="feld-halbjahr">Halbjahr</label>
        <select id="feld-halbjahr" name="halbjahr" required>
          ${HALBJAHRE.map((hj) => `<option value="${hj}">${hj}</option>`).join('')}
        </select>
      </div>
      <div class="formularzeile">
        <label for="feld-klassenname">Klassenname</label>
        <input id="feld-klassenname" name="klassenname" type="text" required placeholder="z. B. 4b" />
      </div>
      <div class="formularzeile">
        <label for="feld-schuljahr">Schuljahr</label>
        <input id="feld-schuljahr" name="schuljahr" type="text" required value="${aktuellesSchuljahr()}" />
      </div>
      <p class="fehler" id="neu-fehler" role="alert"></p>
      <button type="submit">Anlegen</button>
    </form>
    <p><small>Das Halbjahr bestimmt die zu ladende Kompetenzdatei und ist nachträglich nicht änderbar.</small></p>
  `;

  const importKarte = document.createElement('section');
  importKarte.className = 'karte';
  importKarte.setAttribute('aria-labelledby', 'import-titel');
  importKarte.innerHTML = '<h2 id="import-titel">Bestehenden Datensatz öffnen</h2>';
  const dropzone = erstelleDropzone({
    beschriftung: 'JSON-Export eines zuvor gesicherten Klassendatensatzes importieren.',
    onDatei: async (datei) => {
      const ergebnis = await importiereDatei(datei);
      if (!ergebnis.erfolgreich || !ergebnis.datensatz) {
        await meldungAnzeigen(`"${datei.name}" konnte nicht importiert werden`, ergebnis.fehler);
        return;
      }
      await datensatzStore.setzeDatensatz(ergebnis.datensatz);
      await pruefeUndMeldeImportVersionskonflikt(ergebnis.datensatz);
    },
  });
  importKarte.appendChild(dropzone);

  wurzel.append(neuKarte, importKarte);

  const form = neuKarte.querySelector('form') as HTMLFormElement;
  const fehlerFeld = neuKarte.querySelector('#neu-fehler') as HTMLParagraphElement;
  form.addEventListener('submit', async (ereignis) => {
    ereignis.preventDefault();
    const daten = new FormData(form);
    const halbjahr = String(daten.get('halbjahr')) as Halbjahr;
    const klassenname = String(daten.get('klassenname') ?? '').trim();
    const schuljahr = String(daten.get('schuljahr') ?? '').trim();
    if (!klassenname || !schuljahr) {
      fehlerFeld.textContent = 'Bitte Klassenname und Schuljahr angeben.';
      return;
    }
    const datensatz = erzeugeLeerenDatensatz(halbjahr, { name: klassenname, schuljahr });
    await datensatzStore.setzeDatensatz(datensatz);
  });

  return wurzel;
}
