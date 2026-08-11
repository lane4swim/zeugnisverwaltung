import type { Schueler } from '../types';
import type { Bewertungsfortschritt } from '../services/bewertungsstatus';
import { erstelleAmpelHtml } from './bewertungsampel';
import { escapeHtml } from './bestaetigungsDialog';

export interface UnvollstaendigeBewertung {
  schueler: Schueler;
  fortschritt: Bewertungsfortschritt;
}

/**
 * Warnt vor dem Word-Sammeldokument-Export, wenn nicht alle Schüler:innen
 * vollständig bewertet sind (bewusst nur hier, nicht beim JSON-Export – der
 * JSON-Export ist ein reines Backup des aktuellen Arbeitsstands und soll
 * jederzeit ohne Rückfrage möglich sein).
 */
export function unvollstaendigkeitsWarnungOeffnen(unvollstaendige: UnvollstaendigeBewertung[]): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'unvollstaendig-titel');
    dialog.setAttribute('role', 'alertdialog');

    const listeHtml = unvollstaendige
      .map(
        ({ schueler, fortschritt }) => `
          <li>
            ${escapeHtml(schueler.vorname)} ${escapeHtml(schueler.nachname)}: ${erstelleAmpelHtml(fortschritt)}
          </li>
        `,
      )
      .join('');

    dialog.innerHTML = `
      <div class="dialog-inhalt">
        <h2 id="unvollstaendig-titel">Nicht alle Bewertungen sind vollständig</h2>
        <p>Für folgende Schüler:innen fehlen noch Bewertungen für mindestens eine Kompetenz:</p>
        <ul class="unvollstaendigkeits-liste">${listeHtml}</ul>
        <p>Der Export ist trotzdem möglich; die betroffenen Platzhalter bleiben im Sammeldokument dann leer.</p>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">Abbrechen</button>
          <button type="button" data-aktion="trotzdem-exportieren">Trotzdem exportieren</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    const schliessen = (ergebnis: boolean) => {
      dialog.close();
      dialog.remove();
      resolve(ergebnis);
    };
    dialog.querySelector('[data-aktion="abbrechen"]')?.addEventListener('click', () => schliessen(false));
    dialog.querySelector('[data-aktion="trotzdem-exportieren"]')?.addEventListener('click', () => schliessen(true));
    dialog.addEventListener('cancel', () => schliessen(false));

    dialog.showModal();
  });
}
