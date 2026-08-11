import { pwaStore } from '../state/pwaStore';

export function erstellePwaBanner(): HTMLElement {
  const wurzel = document.createElement('div');
  wurzel.className = 'pwa-banner-bereich';
  wurzel.setAttribute('aria-live', 'polite');

  function render(): void {
    const teile: string[] = [];

    if (pwaStore.updateVerfuegbar) {
      teile.push(`
        <div class="pwa-banner">
          <p>Eine neue Version der App ist verfügbar.</p>
          <button type="button" data-aktion="aktualisieren">Jetzt aktualisieren</button>
        </div>
      `);
    }
    if (pwaStore.installierbar) {
      teile.push(`
        <div class="pwa-banner pwa-banner--info">
          <p>Diese App lässt sich installieren – für schnelleren Zugriff, auch offline.</p>
          <button type="button" data-aktion="installieren">App installieren</button>
        </div>
      `);
    }
    if (pwaStore.offlineBereit) {
      teile.push(`
        <div class="pwa-banner pwa-banner--info">
          <p>Fertig geladen: Die App funktioniert ab jetzt auch ohne Internetverbindung.</p>
          <button type="button" class="sekundaer" data-aktion="offline-ausblenden">OK</button>
        </div>
      `);
    }

    wurzel.innerHTML = teile.join('');
    wurzel.querySelector('[data-aktion="aktualisieren"]')?.addEventListener('click', () => {
      void pwaStore.jetztAktualisieren();
    });
    wurzel.querySelector('[data-aktion="installieren"]')?.addEventListener('click', () => {
      void pwaStore.jetztInstallieren();
    });
    wurzel.querySelector('[data-aktion="offline-ausblenden"]')?.addEventListener('click', () => {
      pwaStore.blendeOfflineHinweisAus();
    });
  }

  pwaStore.subscribe(render);
  render();

  return wurzel;
}
