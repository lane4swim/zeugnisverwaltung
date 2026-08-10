import { datensatzStore } from '../state/store';
import { erstelleStartScreen } from './startScreen';
import { erstelleKlassenAnsicht } from './klassenAnsicht';

export function erstelleAppRoot(): HTMLElement {
  const wurzel = document.createElement('div');

  const kopf = document.createElement('header');
  kopf.className = 'kopfzeile';
  kopf.innerHTML = '<h1>Zeugnisverwaltung</h1>';

  const hinweis = document.createElement('p');
  hinweis.className = 'datenschutz-hinweis';
  hinweis.textContent =
    'Alle Schülerdaten verbleiben ausschließlich in deinem Browser (IndexedDB). Es findet keine Übertragung an einen Server statt. Exportiere regelmäßig als JSON, um ein Backup zu haben.';

  const inhalt = document.createElement('main');

  wurzel.append(kopf, hinweis, inhalt);

  let aktuelleAnsicht: 'start' | 'klasse' | null = null;

  datensatzStore.subscribe((datensatz) => {
    const naechsteAnsicht = datensatz ? 'klasse' : 'start';
    if (naechsteAnsicht === aktuelleAnsicht) return;
    aktuelleAnsicht = naechsteAnsicht;
    inhalt.replaceChildren(naechsteAnsicht === 'klasse' ? erstelleKlassenAnsicht() : erstelleStartScreen());
  });

  return wurzel;
}
