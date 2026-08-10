import type { Geschlecht, Schueler } from '../types';
import { escapeHtml } from './bestaetigungsDialog';

export function schuelerDialogOeffnen(bestehend: Schueler | null): Promise<Schueler | null> {
  return new Promise((resolve) => {
    const istBearbeitung = bestehend !== null;
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'schueler-dialog-titel');
    dialog.innerHTML = `
      <form method="dialog" class="dialog-inhalt" novalidate>
        <h2 id="schueler-dialog-titel">${istBearbeitung ? 'Schüler:in bearbeiten' : 'Schüler:in hinzufügen'}</h2>
        <div class="formularzeile">
          <label for="feld-nachname">Nachname</label>
          <input id="feld-nachname" name="nachname" type="text" required value="${escapeHtml(bestehend?.nachname ?? '')}" />
        </div>
        <div class="formularzeile">
          <label for="feld-vorname">Vorname</label>
          <input id="feld-vorname" name="vorname" type="text" required value="${escapeHtml(bestehend?.vorname ?? '')}" />
        </div>
        <div class="formularzeile">
          <label for="feld-geburtsdatum">Geburtsdatum</label>
          <input id="feld-geburtsdatum" name="geburtsdatum" type="date" required value="${escapeHtml(bestehend?.geburtsdatum ?? '')}" />
        </div>
        <div class="formularzeile">
          <label for="feld-geschlecht">Geschlecht</label>
          <select id="feld-geschlecht" name="geschlecht" required>
            <option value="w" ${bestehend?.geschlecht === 'w' ? 'selected' : ''}>weiblich</option>
            <option value="m" ${bestehend?.geschlecht === 'm' ? 'selected' : ''}>männlich</option>
          </select>
        </div>
        <p id="schueler-dialog-fehler" class="fehler" role="alert"></p>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">Abbrechen</button>
          <button type="submit" data-aktion="speichern">Speichern</button>
        </div>
      </form>
    `;
    document.body.appendChild(dialog);

    const schliessen = (ergebnis: Schueler | null) => {
      dialog.close();
      dialog.remove();
      resolve(ergebnis);
    };

    const form = dialog.querySelector('form') as HTMLFormElement;
    const fehlerFeld = dialog.querySelector('#schueler-dialog-fehler') as HTMLParagraphElement;

    dialog.querySelector('[data-aktion="abbrechen"]')?.addEventListener('click', () => schliessen(null));
    dialog.addEventListener('cancel', () => schliessen(null));

    form.addEventListener('submit', (ereignis) => {
      ereignis.preventDefault();
      const daten = new FormData(form);
      const nachname = String(daten.get('nachname') ?? '').trim();
      const vorname = String(daten.get('vorname') ?? '').trim();
      const geburtsdatum = String(daten.get('geburtsdatum') ?? '');
      const geschlecht = String(daten.get('geschlecht') ?? '') as Geschlecht;

      if (!nachname || !vorname || !geburtsdatum) {
        fehlerFeld.textContent = 'Bitte alle Felder ausfüllen.';
        return;
      }

      const schueler: Schueler = {
        id: bestehend?.id ?? crypto.randomUUID(),
        nachname,
        vorname,
        geburtsdatum,
        geschlecht,
      };
      schliessen(schueler);
    });

    dialog.showModal();
    (dialog.querySelector('#feld-nachname') as HTMLInputElement)?.focus();
  });
}
