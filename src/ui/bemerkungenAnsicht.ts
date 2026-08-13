import { datensatzStore } from '../state/store';
import { kompetenzdateiStore } from '../state/kompetenzdateiStore';
import type { Bemerkungsbaustein, Schueler } from '../types';
import { ermittleAuswahlgruppen, ersetzePlatzhalter, loeseAuswahlgruppenAuf } from '../services/textgenerierung';
import {
  BEMERKUNGEN_ABSATZTRENNER,
  erzeugeBemerkungstext,
  erzeugeVollstaendigeBausteinListe,
  istFachNichtRelevantBemerkungsId,
} from '../services/bemerkungen';
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

  function auspraegungen(): Record<string, number[]> {
    return datensatzStore.get()?.bemerkungen.find((b) => b.schuelerId === schuelerId)?.auspraegungen ?? {};
  }

  /**
   * Baustein-Text inkl. aktuell gewählter (oder mangels Auswahl erster)
   * Ausprägung aufgelöst, gefolgt von der regulären Platzhalter-Ersetzung
   * (spezifikation.md 3.6).
   */
  function aufgeloesterText(baustein: Bemerkungsbaustein, schueler: Schueler): string {
    const textMitAufgeloesterAuswahl = loeseAuswahlgruppenAuf(baustein.text, auspraegungen()[baustein.id]);
    return ersetzePlatzhalter(textMitAufgeloesterAuswahl, schueler);
  }

  function bausteinHtml(baustein: Bemerkungsbaustein, schueler: Schueler, istAusgewaehlt: boolean): string {
    const gruppen = ermittleAuswahlgruppen(baustein.text);
    const gespeicherteIndizes = auspraegungen()[baustein.id] ?? [];
    const auswahlHtml =
      istAusgewaehlt && gruppen.length > 0
        ? `<div class="auspraegungen-liste">
            ${gruppen
              .map((gruppe, index) => {
                const gewaehlterIndex = gespeicherteIndizes[index] ?? 0;
                return `
                  <label class="auspraegung-feld">
                    Auswahl ${index + 1}
                    <select data-auspraegung-bemerkung-id="${escapeHtml(baustein.id)}" data-auspraegung-gruppen-index="${index}">
                      ${gruppe.optionen
                        .map(
                          (option, optionsIndex) =>
                            `<option value="${optionsIndex}" ${optionsIndex === gewaehlterIndex ? 'selected' : ''}>${escapeHtml(option)}</option>`,
                        )
                        .join('')}
                    </select>
                  </label>
                `;
              })
              .join('')}
          </div>`
        : '';
    return `
      <div class="bemerkung-eintrag">
        <label class="bemerkung-option">
          <input type="checkbox" data-bemerkung-id="${escapeHtml(baustein.id)}" ${istAusgewaehlt ? 'checked' : ''} />
          <span>${escapeHtml(aufgeloesterText(baustein, schueler))}</span>
        </label>
        ${auswahlHtml}
      </div>
    `;
  }

  /**
   * Zeigt den zusammengeführten Bemerkungstext als eigene Absätze an –
   * jeder Bemerkungsbaustein bildet dabei einen eigenen `<p>`-Absatz
   * (spezifikation.md 5.3), analog zur Absatztrennung im späteren
   * Word-Export (siehe wordMerge.ts).
   */
  function vorschauHtml(text: string): string {
    const absaetze = text
      .split(BEMERKUNGEN_ABSATZTRENNER)
      .map((absatz) => `<p>${escapeHtml(absatz)}</p>`)
      .join('');
    return `<div class="bemerkungen-vorschau">${absaetze}</div>`;
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
    const alleAusgewaehlt = ausgewaehlteIds();
    const ausgewaehlt = new Set(alleAusgewaehlt);
    const automatischeIds = alleAusgewaehlt.filter(istFachNichtRelevantBemerkungsId);
    const vollstaendigeBausteinliste = erzeugeVollstaendigeBausteinListe(kdZustand.datei);

    const automatischeEintraegeHtml = automatischeIds
      .map((id) => vollstaendigeBausteinliste.find((b) => b.id === id))
      .filter((baustein): baustein is NonNullable<typeof baustein> => baustein !== undefined)
      .map(
        (baustein) => `
          <li class="bemerkung-automatisch">
            🔒 ${escapeHtml(aufgeloesterText(baustein, schueler))}
            <span class="fach-bemerkung-hinweis"> (automatisch – Fach als „nicht relevant" markiert, siehe Bewertungsansicht)</span>
          </li>
        `,
      )
      .join('');

    if (bausteine.length === 0 && automatischeIds.length === 0) {
      inhalt.innerHTML = '<p class="leerzustand">Diese Kompetenzdatei enthält keine Bemerkungsbausteine.</p>';
      return;
    }

    const vorschauText = erzeugeBemerkungstext(alleAusgewaehlt, vollstaendigeBausteinliste, schueler, auspraegungen());

    inhalt.innerHTML = `
      <section class="karte">
        <h2 class="sr-only">Bemerkungsbausteine</h2>
        ${
          automatischeEintraegeHtml
            ? `<ul class="bemerkungen-automatisch-liste">${automatischeEintraegeHtml}</ul>`
            : ''
        }
        <div class="bemerkungen-liste">
          ${bausteine.map((baustein) => bausteinHtml(baustein, schueler, ausgewaehlt.has(baustein.id))).join('')}
        </div>
      </section>
      <section class="karte" aria-labelledby="bemerkungen-vorschau-titel">
        <h2 id="bemerkungen-vorschau-titel">Vorschau: zusammengeführter Bemerkungstext</h2>
        ${vorschauText ? vorschauHtml(vorschauText) : '<p class="leerzustand">Noch keine Bemerkung ausgewählt.</p>'}
      </section>
    `;

    inhalt.querySelectorAll<HTMLInputElement>('input[data-bemerkung-id]').forEach((checkbox) => {
      checkbox.addEventListener('change', async () => {
        const regulaereAuswahl = Array.from(
          inhalt.querySelectorAll<HTMLInputElement>('input[data-bemerkung-id]:checked'),
        ).map((el) => el.dataset.bemerkungId as string);
        // Automatische Fach-Bemerkungen haben hier keine Checkbox und müssen
        // beim Neuschreiben der Auswahl erhalten bleiben (siehe 3.7) – nur
        // der Nicht-relevant-Toggle in der Bewertungsansicht steuert sie.
        await datensatzStore.setzeBemerkungen(schuelerId, [...regulaereAuswahl, ...automatischeIds]);
      });
    });

    inhalt.querySelectorAll<HTMLSelectElement>('select[data-auspraegung-bemerkung-id]').forEach((auswahl) => {
      auswahl.addEventListener('change', async () => {
        const bausteinId = auswahl.dataset.auspraegungBemerkungId as string;
        const gruppenIndex = Number(auswahl.dataset.auspraegungGruppenIndex);
        const optionsIndex = Number(auswahl.value);
        await datensatzStore.setzeBemerkungAuspraegung(schuelerId, bausteinId, gruppenIndex, optionsIndex);
      });
    });
  }

  datensatzStore.subscribe(() => render());
  kompetenzdateiStore.subscribe(() => render());

  return wurzel;
}
