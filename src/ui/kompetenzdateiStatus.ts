import { datensatzStore } from '../state/store';
import { kompetenzdateiStore } from '../state/kompetenzdateiStore';
import { ermittleVersionskonflikte } from '../services/versionskonflikt';
import { konfliktDialogOeffnen } from './kompetenzdateiAktualisierenDialog';
import { meldungAnzeigen } from './meldungDialog';
import { escapeHtml } from './bestaetigungsDialog';

export function erstelleKompetenzdateiStatus(): HTMLElement {
  const wurzel = document.createElement('section');
  wurzel.className = 'karte kompetenzdatei-status';
  wurzel.setAttribute('aria-live', 'polite');

  function render(): void {
    const zustand = kompetenzdateiStore.get();
    if (zustand.status === 'leer') {
      wurzel.innerHTML = '';
      return;
    }
    if (zustand.status === 'laedt') {
      wurzel.innerHTML = `<p>Kompetenzdatei für Halbjahr ${escapeHtml(zustand.halbjahr ?? '')} wird geladen…</p>`;
      return;
    }
    if (zustand.status === 'fehler') {
      wurzel.innerHTML = `
        <p class="fehler" role="alert">${escapeHtml(zustand.fehler ?? 'Unbekannter Fehler beim Laden der Kompetenzdatei.')}</p>
        <button type="button" class="sekundaer" data-aktion="erneut">Erneut versuchen</button>
      `;
      wurzel.querySelector('[data-aktion="erneut"]')?.addEventListener('click', () => {
        if (zustand.halbjahr) void kompetenzdateiStore.ladeNeu(zustand.halbjahr);
      });
      return;
    }
    // status === 'geladen'
    wurzel.innerHTML = `
      <p>
        Kompetenzdatei Halbjahr ${escapeHtml(zustand.halbjahr ?? '')} · Version ${escapeHtml(zustand.datei?.version ?? '')}
        (${zustand.quelle === 'cache' ? 'aus lokalem Cache' : 'vom Server'})
      </p>
      <button type="button" class="sekundaer" data-aktion="aktualisieren">Kompetenzdatei aktualisieren</button>
    `;
    wurzel.querySelector('[data-aktion="aktualisieren"]')?.addEventListener('click', aktualisierenAusfuehren);
  }

  async function aktualisierenAusfuehren(): Promise<void> {
    const zustand = kompetenzdateiStore.get();
    const datensatz = datensatzStore.get();
    if (!zustand.halbjahr || !datensatz) return;

    let ergebnis: Awaited<ReturnType<typeof kompetenzdateiStore.pruefeAktualisierung>>;
    try {
      ergebnis = await kompetenzdateiStore.pruefeAktualisierung(zustand.halbjahr);
    } catch (fehler) {
      const meldung = fehler instanceof Error ? fehler.message : String(fehler);
      await meldungAnzeigen('Aktualisierung fehlgeschlagen', [meldung]);
      return;
    }

    if (ergebnis.unveraendert) {
      await meldungAnzeigen('Kompetenzdatei ist aktuell', [`Version ${ergebnis.neueDatei.version} ist bereits geladen.`]);
      return;
    }

    const konflikte = ermittleVersionskonflikte(ergebnis.neueDatei, datensatz.bewertungen, datensatz.schueler);
    if (konflikte.hatKonflikte) {
      const uebernehmen = await konfliktDialogOeffnen({
        alteDatei: zustand.datei,
        neueVersion: ergebnis.neueDatei.version,
        konflikte,
      });
      if (!uebernehmen) return;
    }

    await kompetenzdateiStore.uebernehmeNeueDatei(ergebnis.neueDatei);
    await datensatzStore.setzeKompetenzdateiVersion(ergebnis.neueDatei.version);
    await meldungAnzeigen('Kompetenzdatei aktualisiert', [`Neue Version: ${ergebnis.neueDatei.version}`]);
  }

  kompetenzdateiStore.subscribe(() => render());

  return wurzel;
}
