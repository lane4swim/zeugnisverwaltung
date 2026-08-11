import { datensatzStore } from '../state/store';
import type { Schueler } from '../types';
import { schuelerDialogOeffnen } from './schuelerDialog';
import { bestaetigen, escapeHtml } from './bestaetigungsDialog';
import { formatiereDatum } from '../utils/datum';

type SortSpalte = 'nachname' | 'vorname' | 'geburtsdatum' | 'geschlecht';

const SPALTEN: { schluessel: SortSpalte; label: string }[] = [
  { schluessel: 'nachname', label: 'Nachname' },
  { schluessel: 'vorname', label: 'Vorname' },
  { schluessel: 'geburtsdatum', label: 'Geburtsdatum' },
  { schluessel: 'geschlecht', label: 'Geschlecht' },
];

export function erstelleSchuelerListe(optionen: {
  onBewerten: (schuelerId: string) => void;
  onBemerkungen: (schuelerId: string) => void;
}): HTMLElement {
  const wurzel = document.createElement('section');
  wurzel.className = 'karte';
  wurzel.setAttribute('aria-labelledby', 'klassenliste-titel');

  let sortSpalte: SortSpalte = 'nachname';
  let sortAufsteigend = true;
  let filterText = '';

  wurzel.innerHTML = `
    <h2 id="klassenliste-titel">Klassenliste</h2>
    <div class="tabellen-werkzeuge">
      <label class="sr-only" for="schueler-filter">Klassenliste nach Name filtern</label>
      <input id="schueler-filter" type="text" placeholder="Nach Name filtern…" />
      <button type="button" data-aktion="hinzufuegen">+ Schüler:in hinzufügen</button>
    </div>
    <div data-bereich="tabelle"></div>
  `;

  const filterEingabe = wurzel.querySelector('#schueler-filter') as HTMLInputElement;
  const tabellenBereich = wurzel.querySelector('[data-bereich="tabelle"]') as HTMLDivElement;

  function spaltenKopf(spalte: SortSpalte, label: string): string {
    const aktiv = sortSpalte === spalte;
    const richtung = aktiv ? (sortAufsteigend ? 'ascending' : 'descending') : 'none';
    const pfeil = aktiv ? (sortAufsteigend ? ' ▲' : ' ▼') : '';
    return `<th scope="col" aria-sort="${richtung}"><button type="button" data-sort="${spalte}">${label}<span aria-hidden="true">${pfeil}</span></button></th>`;
  }

  function zeileHtml(s: Schueler): string {
    const anzeigename = `${escapeHtml(s.vorname)} ${escapeHtml(s.nachname)}`;
    return `
      <tr>
        <td>${escapeHtml(s.nachname)}</td>
        <td>${escapeHtml(s.vorname)}</td>
        <td>${formatiereDatum(s.geburtsdatum)}</td>
        <td>${s.geschlecht === 'w' ? 'weiblich' : 'männlich'}</td>
        <td>
          <button type="button" data-bewerten="${s.id}">Bewerten<span class="sr-only"> ${anzeigename}</span></button>
          <button type="button" class="sekundaer" data-bemerkungen="${s.id}">Bemerkungen<span class="sr-only"> ${anzeigename}</span></button>
          <button type="button" class="sekundaer" data-bearbeiten="${s.id}">Bearbeiten<span class="sr-only"> ${anzeigename}</span></button>
          <button type="button" class="gefahr" data-loeschen="${s.id}">Löschen<span class="sr-only"> ${anzeigename}</span></button>
        </td>
      </tr>
    `;
  }

  function render(): void {
    const datensatz = datensatzStore.get();
    if (!datensatz) {
      tabellenBereich.innerHTML = '';
      return;
    }

    const suchbegriff = filterText.trim().toLowerCase();
    const gefiltert = datensatz.schueler.filter(
      (s) =>
        suchbegriff === '' ||
        s.vorname.toLowerCase().includes(suchbegriff) ||
        s.nachname.toLowerCase().includes(suchbegriff),
    );
    const sortiert = [...gefiltert].sort((a, b) => {
      const vergleich = a[sortSpalte].localeCompare(b[sortSpalte], 'de');
      return sortAufsteigend ? vergleich : -vergleich;
    });

    if (datensatz.schueler.length === 0) {
      tabellenBereich.innerHTML = '<p class="leerzustand">Noch keine Schüler:innen angelegt.</p>';
      return;
    }
    if (sortiert.length === 0) {
      tabellenBereich.innerHTML = '<p class="leerzustand">Kein Treffer für den Filter.</p>';
      return;
    }

    tabellenBereich.innerHTML = `
      <table class="schuelerliste">
        <caption class="sr-only">Klassenliste, sortiert nach ${sortSpalte}, ${sortAufsteigend ? 'aufsteigend' : 'absteigend'}</caption>
        <thead>
          <tr>
            ${SPALTEN.map((s) => spaltenKopf(s.schluessel, s.label)).join('')}
            <th scope="col"><span class="sr-only">Aktionen</span></th>
          </tr>
        </thead>
        <tbody>${sortiert.map(zeileHtml).join('')}</tbody>
      </table>
    `;

    tabellenBereich.querySelectorAll<HTMLButtonElement>('button[data-sort]').forEach((knopf) => {
      knopf.addEventListener('click', () => {
        const spalte = knopf.dataset.sort as SortSpalte;
        if (sortSpalte === spalte) sortAufsteigend = !sortAufsteigend;
        else {
          sortSpalte = spalte;
          sortAufsteigend = true;
        }
        render();
      });
    });
    tabellenBereich.querySelectorAll<HTMLButtonElement>('button[data-bewerten]').forEach((knopf) => {
      knopf.addEventListener('click', () => {
        optionen.onBewerten(knopf.dataset.bewerten as string);
      });
    });
    tabellenBereich.querySelectorAll<HTMLButtonElement>('button[data-bemerkungen]').forEach((knopf) => {
      knopf.addEventListener('click', () => {
        optionen.onBemerkungen(knopf.dataset.bemerkungen as string);
      });
    });
    tabellenBereich.querySelectorAll<HTMLButtonElement>('button[data-bearbeiten]').forEach((knopf) => {
      knopf.addEventListener('click', async () => {
        const id = knopf.dataset.bearbeiten as string;
        const schueler = datensatzStore.get()?.schueler.find((s) => s.id === id) ?? null;
        if (!schueler) return;
        const ergebnis = await schuelerDialogOeffnen(schueler);
        if (ergebnis) await datensatzStore.aktualisiereSchueler(ergebnis);
      });
    });
    tabellenBereich.querySelectorAll<HTMLButtonElement>('button[data-loeschen]').forEach((knopf) => {
      knopf.addEventListener('click', async () => {
        const id = knopf.dataset.loeschen as string;
        const schueler = datensatzStore.get()?.schueler.find((s) => s.id === id);
        if (!schueler) return;
        const bestaetigt = await bestaetigen({
          titel: 'Schüler:in löschen',
          beschreibung: `Sollen ${schueler.vorname} ${schueler.nachname} sowie alle zugehörigen Bewertungen, Texte und Bemerkungen unwiderruflich aus diesem Datensatz entfernt werden?`,
          bestaetigenText: 'Löschen',
          gefahr: true,
        });
        if (bestaetigt) await datensatzStore.entferneSchueler(id);
      });
    });
  }

  filterEingabe.addEventListener('input', () => {
    filterText = filterEingabe.value;
    render();
  });

  wurzel.querySelector('[data-aktion="hinzufuegen"]')?.addEventListener('click', async () => {
    const ergebnis = await schuelerDialogOeffnen(null);
    if (ergebnis) await datensatzStore.fuegeSchuelerHinzu(ergebnis);
  });

  datensatzStore.subscribe(() => render());

  return wurzel;
}
