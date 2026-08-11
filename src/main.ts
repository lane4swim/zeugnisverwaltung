import './style.css';
import { datensatzStore } from './state/store';
import { pwaStore } from './state/pwaStore';
import { erstelleAppRoot } from './ui/appRoot';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app-Element nicht gefunden');

app.appendChild(erstelleAppRoot());

void datensatzStore.init();
void pwaStore.init();
