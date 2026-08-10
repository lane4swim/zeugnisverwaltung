import { datensatzStore } from '../state/store';
import { kompetenzdateiStore } from '../state/kompetenzdateiStore';
import type { Bewertung, Bewertungstext, Kompetenz, KompetenzDatei, Schueler } from '../types';
import { findeKompetenz } from '../utils/kompetenzstruktur';
import { ersetzePlatzhalter, waehleBausteinIndex } from '../services/textgenerierung';
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

  function textFuer(kompetenzId: string): Bewertungstext | null {
    return (
      datensatzStore.get()?.bewertungstexte.find((t) => t.schuelerId === schuelerId && t.kompetenzId === kompetenzId) ?? null
    );
  }

  function kompetenzBlockHtml(kompetenz: Kompetenz): string {
    const bewertung = bewertungFuer(kompetenz.id);
    const text = textFuer(kompetenz.id);
    const stufenzahl = kompetenz.stufen.length;
    const ungueltig = bewertung !== null && bewertung.stufe > stufenzahl;
    const gesperrt = text?.gesperrt ?? false;

    const radios = kompetenz.stufen
      .map((stufe) => {
        const checked = bewertung?.stufe === stufe.stufe ? 'checked' : '';
        return `
          <label class="stufen-option">
            <input type="radio" name="stufe-${escapeHtml(kompetenz.id)}" value="${stufe.stufe}" data-kompetenz-id="${escapeHtml(kompetenz.id)}" ${checked} ${gesperrt ? 'disabled' : ''} />
            ${stufe.stufe}: ${escapeHtml(stufe.bezeichnung)}
          </label>
        `;
      })
      .join('');

    let textBereichHtml = '';
    if (bewertung !== null && !ungueltig) {
      const aktuelleStufe = kompetenz.stufen.find((s) => s.stufe === bewertung.stufe);
      const anzahlBausteine = aktuelleStufe?.satzbausteine.length ?? 0;
      const anzeigeText = text?.manuellerText ?? text?.generierterText ?? '';
      textBereichHtml = `
        <div class="bewertungstext-block">
          <label class="sr-only" for="text-${escapeHtml(kompetenz.id)}">Zeugnistext für ${escapeHtml(kompetenz.titel)}</label>
          <textarea id="text-${escapeHtml(kompetenz.id)}" data-text-kompetenz-id="${escapeHtml(kompetenz.id)}" rows="2">${escapeHtml(anzeigeText)}</textarea>
          <div class="bewertungstext-werkzeuge">
            ${gesperrt ? '<span class="gesperrt-hinweis">🔒 Manuell bearbeitet – Stufenauswahl gesperrt</span>' : ''}
            ${
              anzahlBausteine > 1
                ? `<button type="button" class="sekundaer" data-wuerfeln="${escapeHtml(kompetenz.id)}" ${gesperrt ? 'disabled' : ''}>🎲 Neu würfeln</button>`
                : ''
            }
            ${gesperrt ? `<button type="button" class="sekundaer" data-zuruecksetzen="${escapeHtml(kompetenz.id)}">Zurücksetzen</button>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <fieldset class="kompetenz-block">
        <legend>${escapeHtml(kompetenz.titel)}</legend>
        ${ungueltig ? `<p class="fehler" role="alert">Bisherige Bewertung (Stufe ${bewertung!.stufe}) ist nach einem Kompetenzdatei-Update nicht mehr gültig (nur noch ${stufenzahl} Stufe(n)). <button type="button" class="sekundaer" data-bereinigen="${escapeHtml(kompetenz.id)}">Bereinigen</button></p>` : ''}
        <div class="stufen-radiogroup" role="radiogroup" aria-label="${escapeHtml(kompetenz.titel)}">${radios}</div>
        ${textBereichHtml}
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
    const datei = kdZustand.datei;

    veralteteBereich.innerHTML = veralteteHtml(datei);
    baum.innerHTML = baumHtml(datei);

    wurzel.querySelectorAll<HTMLInputElement>('input[type="radio"][data-kompetenz-id]').forEach((eingabe) => {
      eingabe.addEventListener('change', async () => {
        const kompetenzId = eingabe.dataset.kompetenzId as string;
        const kompetenz = findeKompetenz(datei, kompetenzId)?.kompetenz;
        const stufe = Number(eingabe.value);
        const stufenDefinition = kompetenz?.stufen.find((s) => s.stufe === stufe);
        const aktuellerSchuelerWert = aktuellerSchueler();
        if (!stufenDefinition || !aktuellerSchuelerWert) return;
        const index = waehleBausteinIndex(stufenDefinition.satzbausteine.length);
        const text = ersetzePlatzhalter(stufenDefinition.satzbausteine[index], aktuellerSchuelerWert);
        await datensatzStore.setzeBewertungMitGeneriertemText(schuelerId, kompetenzId, stufe, index, text);
      });
    });

    wurzel.querySelectorAll<HTMLButtonElement>('[data-wuerfeln]').forEach((knopf) => {
      knopf.addEventListener('click', async () => {
        const kompetenzId = knopf.dataset.wuerfeln as string;
        const kompetenz = findeKompetenz(datei, kompetenzId)?.kompetenz;
        const bewertung = bewertungFuer(kompetenzId);
        const aktuellerSchuelerWert = aktuellerSchueler();
        const stufenDefinition = kompetenz?.stufen.find((s) => s.stufe === bewertung?.stufe);
        if (!kompetenz || !bewertung || !stufenDefinition || !aktuellerSchuelerWert) return;
        const index = waehleBausteinIndex(stufenDefinition.satzbausteine.length, bewertung.gewaehlterBausteinIndex);
        const text = ersetzePlatzhalter(stufenDefinition.satzbausteine[index], aktuellerSchuelerWert);
        await datensatzStore.setzeBewertungMitGeneriertemText(schuelerId, kompetenzId, bewertung.stufe, index, text);
      });
    });

    wurzel.querySelectorAll<HTMLButtonElement>('[data-zuruecksetzen]').forEach((knopf) => {
      knopf.addEventListener('click', async () => {
        const kompetenzId = knopf.dataset.zuruecksetzen as string;
        const kompetenz = findeKompetenz(datei, kompetenzId)?.kompetenz;
        const bewertung = bewertungFuer(kompetenzId);
        const aktuellerSchuelerWert = aktuellerSchueler();
        const stufenDefinition = kompetenz?.stufen.find((s) => s.stufe === bewertung?.stufe);
        if (!bewertung || !stufenDefinition || !aktuellerSchuelerWert) return;
        const text = ersetzePlatzhalter(stufenDefinition.satzbausteine[bewertung.gewaehlterBausteinIndex], aktuellerSchuelerWert);
        await datensatzStore.setzeTextZurueck(schuelerId, kompetenzId, text);
      });
    });

    wurzel.querySelectorAll<HTMLTextAreaElement>('textarea[data-text-kompetenz-id]').forEach((textfeld) => {
      textfeld.addEventListener('change', async () => {
        if (textfeld.value === textfeld.defaultValue) return;
        const kompetenzId = textfeld.dataset.textKompetenzId as string;
        await datensatzStore.setzeManuellenText(schuelerId, kompetenzId, textfeld.value);
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
