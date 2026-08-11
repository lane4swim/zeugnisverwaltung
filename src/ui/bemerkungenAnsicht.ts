import { datensatzStore } from '../state/store';
import { kompetenzdateiStore } from '../state/kompetenzdateiStore';
import type { Schueler } from '../types';
import { ersetzePlatzhalter } from '../services/textgenerierung';
import { erzeugeBemerkungstext } from '../services/bemerkungen';
import { escapeHtml } from './bestaetigungsDialog';

export function erstelleBemerkungenAnsicht(schuelerId: string, onZurueck: () => void): HTMLElement {
  const wurzel = document.createElement('div');

  const kopf = document.createElement('div');
  kopf.className = 'aktionsleiste';
  kopf.innerHTML = '<button type="button" class="sekundaer" data-aktion="zurueck">← Zurück zur Klassenliste</button>';
  kopf.querySelector('[data-aktion="zurueck"]')?.addEventListener('click', onZurueck);

  const titel = document.createElement('h2');
  const inhalt = document.createElement('div');

  wurzel.append(kopf, titel, inhalt);

  function aktuellerSchueler(): Schueler | null {
    return datensatzStore.get()?.schueler.find((s) => s.id === schuelerId) ?? null;
  }

  function ausgewaehlteIds(): string[] {
    return datensatzStore.get()?.bemerkungen.find((b) => b.schuelerId === schuelerId)?.ausgewaehlteBemerkungen ?? [];
  }

  function render(): void {
    const schueler = aktuellerSchueler();
    if (!schueler) {
      onZurueck();
      return;
    }
    titel.textContent = `Bemerkungen: ${schueler.vorname} ${schueler.nachname}`;

    const kdZustand = kompetenzdateiStore.get();
    if (kdZustand.status !== 'geladen' || !kdZustand.datei) {
      inhalt.innerHTML = '<p class="leerzustand">Kompetenzdatei ist noch nicht geladen.</p>';
      return;
    }
    const bausteine = kdZustand.datei.bemerkungsbausteine;
    const ausgewaehlt = new Set(ausgewaehlteIds());

    if (bausteine.length === 0) {
      inhalt.innerHTML = '<p class="leerzustand">Diese Kompetenzdatei enthält keine Bemerkungsbausteine.</p>';
      return;
    }

    const vorschauText = erzeugeBemerkungstext([...ausgewaehlt], bausteine, schueler);

    inhalt.innerHTML = `
      <section class="karte">
        <h2 class="sr-only">Bemerkungsbausteine</h2>
        <div class="bemerkungen-liste">
          ${bausteine
            .map(
              (baustein) => `
              <label class="bemerkung-option">
                <input type="checkbox" data-bemerkung-id="${escapeHtml(baustein.id)}" ${ausgewaehlt.has(baustein.id) ? 'checked' : ''} />
                <span>${escapeHtml(ersetzePlatzhalter(baustein.text, schueler))}</span>
              </label>
            `,
            )
            .join('')}
        </div>
      </section>
      <section class="karte" aria-labelledby="bemerkungen-vorschau-titel">
        <h2 id="bemerkungen-vorschau-titel">Vorschau: zusammengeführter Bemerkungstext</h2>
        ${
          vorschauText
            ? `<p class="bemerkungen-vorschau">${escapeHtml(vorschauText)}</p>`
            : '<p class="leerzustand">Noch keine Bemerkung ausgewählt.</p>'
        }
      </section>
    `;

    inhalt.querySelectorAll<HTMLInputElement>('input[data-bemerkung-id]').forEach((checkbox) => {
      checkbox.addEventListener('change', async () => {
        const ausgewaehlteJetzt = Array.from(
          inhalt.querySelectorAll<HTMLInputElement>('input[data-bemerkung-id]:checked'),
        ).map((el) => el.dataset.bemerkungId as string);
        await datensatzStore.setzeBemerkungen(schuelerId, ausgewaehlteJetzt);
      });
    });
  }

  datensatzStore.subscribe(() => render());
  kompetenzdateiStore.subscribe(() => render());

  return wurzel;
}
