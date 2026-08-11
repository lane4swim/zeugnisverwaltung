import type { Bewertungsfortschritt } from '../services/bewertungsstatus';
import { escapeHtml } from './bestaetigungsDialog';

const AMPEL_KONFIG = {
  vollstaendig: { farbe: 'gruen', text: 'Vollständig' },
  teilweise: { farbe: 'gelb', text: 'Teilweise' },
  nicht_begonnen: { farbe: 'rot', text: 'Nicht begonnen' },
} as const;

/**
 * Ampel-Anzeige des Bewertungsfortschritts (grün/gelb/rot). Farbe UND Text
 * gemeinsam, damit der Status nicht ausschließlich über Farbe vermittelt
 * wird (spezifikation.md 7 Barrierefreiheit).
 */
export function erstelleAmpelHtml(fortschritt: Bewertungsfortschritt): string {
  const konfig = AMPEL_KONFIG[fortschritt.status];
  const beschreibung = `${fortschritt.bewerteteAnzahl} von ${fortschritt.gesamtAnzahl} Kompetenzen bewertet`;
  return `
    <span class="ampel" title="${escapeHtml(beschreibung)}">
      <span class="ampel-punkt ampel-punkt--${konfig.farbe}" aria-hidden="true"></span>
      ${konfig.text}
      <span class="sr-only"> (${escapeHtml(beschreibung)})</span>
    </span>
  `;
}
