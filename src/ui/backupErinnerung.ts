import { datensatzStore } from '../state/store';
import { exportiereDatensatz } from '../services/exportImport';

/** Ab dieser Anzahl inhaltlicher Änderungen seit dem letzten Export wird erinnert (spezifikation.md 7). */
const SCHWELLENWERT = 8;

/**
 * Backup-Erinnerung (spezifikation.md 7 Robustheit): weist unaufdringlich
 * darauf hin, wenn seit dem letzten JSON-Export mehrere Änderungen
 * vorgenommen wurden. Ein „Für jetzt ausblenden" gilt nur bis zur nächsten
 * Schwelle weiterer Änderungen, damit die Erinnerung nicht dauerhaft
 * verschwindet.
 */
export function erstelleBackupErinnerung(): HTMLElement {
  const wurzel = document.createElement('div');
  wurzel.setAttribute('aria-live', 'polite');

  let ausgeblendetBisAenderungen = -1;

  function render(): void {
    const datensatz = datensatzStore.get();
    const anzahl = datensatzStore.anzahlAenderungenSeitExport();
    if (!datensatz || anzahl < SCHWELLENWERT || anzahl < ausgeblendetBisAenderungen + SCHWELLENWERT) {
      wurzel.innerHTML = '';
      return;
    }
    wurzel.innerHTML = `
      <div class="pwa-banner">
        <p>Es gibt ungesicherte Änderungen (${anzahl} seit dem letzten Export). Ein regelmäßiger JSON-Export schützt vor Datenverlust.</p>
        <div class="backup-erinnerung-aktionen">
          <button type="button" data-aktion="jetzt-exportieren">Jetzt exportieren</button>
          <button type="button" class="sekundaer" data-aktion="ausblenden">Für jetzt ausblenden</button>
        </div>
      </div>
    `;
    wurzel.querySelector('[data-aktion="jetzt-exportieren"]')?.addEventListener('click', () => {
      const aktuell = datensatzStore.get();
      if (aktuell) exportiereDatensatz(aktuell);
    });
    wurzel.querySelector('[data-aktion="ausblenden"]')?.addEventListener('click', () => {
      ausgeblendetBisAenderungen = anzahl;
      render();
    });
  }

  datensatzStore.subscribe(() => render());

  return wurzel;
}
