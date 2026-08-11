import { datensatzStore } from '../state/store';
import { erstelleStartScreen } from './startScreen';
import { erstelleKlassenAnsicht } from './klassenAnsicht';
import { erstellePwaBanner } from './pwaBanner';

export function erstelleAppRoot(): HTMLElement {
  const wurzel = document.createElement('div');

  const uebersprungLink = document.createElement('a');
  uebersprungLink.href = '#hauptinhalt';
  uebersprungLink.className = 'uebersprung-link';
  uebersprungLink.textContent = 'Zum Inhalt springen';

  const kopf = document.createElement('header');
  kopf.className = 'kopfzeile';
  kopf.innerHTML =
    '<h1>Zeugnisverwaltung</h1>' +
    '<a class="anleitung-link" href="./anleitung.html" target="_blank" rel="noopener">Anleitung öffnen (neuer Tab)</a>';

  const hinweis = document.createElement('p');
  hinweis.className = 'datenschutz-hinweis';
  hinweis.textContent =
    'Alle Schülerdaten verbleiben ausschließlich in deinem Browser (IndexedDB). Es findet keine Übertragung an einen Server statt. Exportiere regelmäßig als JSON, um ein Backup zu haben.';

  const pwaBanner = erstellePwaBanner();

  const inhalt = document.createElement('main');
  inhalt.id = 'hauptinhalt';
  inhalt.tabIndex = -1;

  wurzel.append(uebersprungLink, kopf, pwaBanner, hinweis, inhalt);

  let aktuelleAnsicht: 'start' | 'klasse' | null = null;

  datensatzStore.subscribe((datensatz) => {
    const naechsteAnsicht = datensatz ? 'klasse' : 'start';
    if (naechsteAnsicht === aktuelleAnsicht) return;
    aktuelleAnsicht = naechsteAnsicht;
    inhalt.replaceChildren(naechsteAnsicht === 'klasse' ? erstelleKlassenAnsicht() : erstelleStartScreen());
  });

  return wurzel;
}
