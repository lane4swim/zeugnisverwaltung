import { datensatzStore } from '../state/store';
import { kompetenzdateiStore } from '../state/kompetenzdateiStore';
import type { Bewertung, Kompetenz, KompetenzDatei, Schueler } from '../types';
import { findeKompetenz } from '../utils/kompetenzstruktur';
import { escapeHtml } from './bestaetigungsDialog';

export function erstelleBewertungsAnsicht(schuelerId: string, onZurueck: () => void): HTMLElement {
  const wurzel = document.createElement('div');

  const kopf = document.createElement('div');
  kopf.className = 'aktionsleiste';
  kopf.innerHTML = '<button type="button" class="sekundaer" data-aktion="zurueck">← Zurück zur Klassenliste</button>';
  kopf.querySelector('[data-aktion="zurueck"]')?.addEventListener('click', onZurueck);

  const titel = document.createElement('h2');
  const veralteteBereich = document.createElement('section');
  veralteteBereich.className = 'karte';

  const baum = document.createElement('div');

  wurzel.append(kopf, titel, veralteteBereich, baum);

  function aktuellerSchueler(): Schueler | null {
    return datensatzStore.get()?.schueler.find((s) => s.id === schuelerId) ?? null;
  }

  function bewertungFuer(kompetenzId: string): Bewertung | null {
    return datensatzStore.get()?.bewertungen.find((b) => b.schuelerId === schuelerId && b.kompetenzId === kompetenzId) ?? null;
  }

  function kompetenzBlockHtml(kompetenz: Kompetenz): string {
    const bewertung = bewertungFuer(kompetenz.id);
    const stufenzahl = kompetenz.stufen.length;
    const ungueltig = bewertung !== null && bewertung.stufe > stufenzahl;
    const radios = kompetenz.stufen
      .map((stufe) => {
        const checked = bewertung?.stufe === stufe.stufe ? 'checked' : '';
        return `
          <label class="stufen-option">
            <input type="radio" name="stufe-${escapeHtml(kompetenz.id)}" value="${stufe.stufe}" data-kompetenz-id="${escapeHtml(kompetenz.id)}" ${checked} />
            ${stufe.stufe}: ${escapeHtml(stufe.bezeichnung)}
          </label>
        `;
      })
      .join('');

    return `
      <fieldset class="kompetenz-block">
        <legend>${escapeHtml(kompetenz.titel)}</legend>
        ${ungueltig ? `<p class="fehler" role="alert">Bisherige Bewertung (Stufe ${bewertung!.stufe}) ist nach einem Kompetenzdatei-Update nicht mehr gültig (nur noch ${stufenzahl} Stufe(n)). <button type="button" class="sekundaer" data-bereinigen="${escapeHtml(kompetenz.id)}">Bereinigen</button></p>` : ''}
        <div class="stufen-radiogroup" role="radiogroup" aria-label="${escapeHtml(kompetenz.titel)}">${radios}</div>
      </fieldset>
    `;
  }

  function baumHtml(datei: KompetenzDatei): string {
    return datei.abschnitte
      .map(
        (abschnitt) => `
        <details open class="abschnitt-block">
          <summary>${escapeHtml(abschnitt.titel)}</summary>
          ${abschnitt.bereiche
            .map(
              (bereich) => `
              <details open class="bereich-block">
                <summary>${escapeHtml(bereich.titel)}</summary>
                ${bereich.kompetenzen.map(kompetenzBlockHtml).join('')}
              </details>
            `,
            )
            .join('')}
        </details>
      `,
      )
      .join('');
  }

  function veralteteHtml(datei: KompetenzDatei): string {
    const datensatz = datensatzStore.get();
    if (!datensatz) return '';
    const veraltete = datensatz.bewertungen.filter(
      (b) => b.schuelerId === schuelerId && findeKompetenz(datei, b.kompetenzId) === null,
    );
    if (veraltete.length === 0) return '';
    return `
      <h2>Veraltete Bewertungen</h2>
      <p>Diese Kompetenzen gibt es in der aktuell geladenen Kompetenzdatei nicht mehr:</p>
      <ul>
        ${veraltete
          .map(
            (b) => `<li>${escapeHtml(b.kompetenzId)} (Stufe ${b.stufe}) <button type="button" class="sekundaer" data-bereinigen="${escapeHtml(b.kompetenzId)}">Bereinigen</button></li>`,
          )
          .join('')}
      </ul>
    `;
  }

  function render(): void {
    const schueler = aktuellerSchueler();
    if (!schueler) {
      onZurueck();
      return;
    }
    titel.textContent = `Bewertung: ${schueler.vorname} ${schueler.nachname}`;

    const kdZustand = kompetenzdateiStore.get();
    if (kdZustand.status !== 'geladen' || !kdZustand.datei) {
      veralteteBereich.innerHTML = '';
      baum.innerHTML = '<p class="leerzustand">Kompetenzdatei ist noch nicht geladen.</p>';
      return;
    }

    veralteteBereich.innerHTML = veralteteHtml(kdZustand.datei);
    baum.innerHTML = baumHtml(kdZustand.datei);

    wurzel.querySelectorAll<HTMLInputElement>('input[type="radio"][data-kompetenz-id]').forEach((eingabe) => {
      eingabe.addEventListener('change', async () => {
        const kompetenzId = eingabe.dataset.kompetenzId as string;
        await datensatzStore.setzeBewertung(schuelerId, kompetenzId, Number(eingabe.value));
      });
    });
    wurzel.querySelectorAll<HTMLButtonElement>('[data-bereinigen]').forEach((knopf) => {
      knopf.addEventListener('click', async () => {
        await datensatzStore.entferneBewertung(schuelerId, knopf.dataset.bereinigen as string);
      });
    });
  }

  datensatzStore.subscribe(() => render());
  kompetenzdateiStore.subscribe(() => render());

  return wurzel;
}
