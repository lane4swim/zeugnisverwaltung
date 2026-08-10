import './style.css';
import { datensatzStore } from './state/store';
import { erstelleAppRoot } from './ui/appRoot';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app-Element nicht gefunden');

app.appendChild(erstelleAppRoot());

void datensatzStore.init();

if ('serviceWorker' in navigator) {
  // Registrierung übernimmt vite-plugin-pwa; hier nur Absicherung für
  // Umgebungen ohne automatische Injektion (z. B. reines `vite preview`).
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {
      /* PWA-Registrierung ist optional; App funktioniert auch ohne. */
    });
}
