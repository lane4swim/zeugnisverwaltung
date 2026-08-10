import { escapeHtml } from './bestaetigungsDialog';

export interface SkalaMarker {
  typ: 'eigene' | 'vergleich' | 'median' | 'durchschnitt';
  wert: number; // Stufenwert, bei Median/Durchschnitt ggf. fraktional
  label: string;
}

/**
 * Kleine Balken-/Skalenanzeige neben der eigenen Bewertung (spezifikation.md
 * 5.2). Rein dekorativ (aria-hidden) – die vollständige Information steht
 * zusätzlich als Text neben der Skala, damit sie ohne visuelle Wahrnehmung
 * zugänglich bleibt (spezifikation.md 7 Barrierefreiheit).
 */
export function erstelleSkalaHtml(stufenzahl: number, marker: SkalaMarker[]): string {
  if (stufenzahl <= 1 || marker.length === 0) return '';

  const positionProzent = (wert: number): number => {
    const geklemmt = Math.min(Math.max(wert, 1), stufenzahl);
    return ((geklemmt - 1) / (stufenzahl - 1)) * 100;
  };

  const ticksHtml = Array.from({ length: stufenzahl }, (_, i) => {
    const stufe = i + 1;
    return `<span class="skala-tick" style="left:${positionProzent(stufe)}%"></span>`;
  }).join('');

  const markerHtml = marker
    .map(
      (m) =>
        `<span class="skala-marker skala-marker--${m.typ}" style="left:${positionProzent(m.wert)}%" title="${escapeHtml(m.label)}"></span>`,
    )
    .join('');

  return `<div class="vergleichsskala" aria-hidden="true"><div class="skala-leiste">${ticksHtml}${markerHtml}</div></div>`;
}
