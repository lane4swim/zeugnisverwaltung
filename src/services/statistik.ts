/**
 * Klassenmedian/-durchschnitt je Kompetenz (spezifikation.md 5.2). Fehlende
 * Bewertungen fließen nicht ein (Aufrufer übergibt nur tatsächlich
 * vorhandene Stufenwerte); bei leerer Liste wird null geliefert.
 */

export function berechneDurchschnitt(werte: number[]): number | null {
  if (werte.length === 0) return null;
  const summe = werte.reduce((a, b) => a + b, 0);
  return Math.round((summe / werte.length) * 10) / 10;
}

/**
 * Bei ungerader Anzahl ist der Median ein tatsächlich vorkommender Wert,
 * bei gerader Anzahl der (ggf. fraktionale) Mittelwert der beiden mittleren
 * Werte (spezifikation.md 5.2).
 */
export function berechneMedian(werte: number[]): number | null {
  if (werte.length === 0) return null;
  const sortiert = [...werte].sort((a, b) => a - b);
  const mitte = Math.floor(sortiert.length / 2);
  if (sortiert.length % 2 === 1) {
    return sortiert[mitte];
  }
  // Stufenwerte sind stets ganzzahlig, daher ist die Summe zweier Werte immer
  // ganzzahlig und die Division durch 2 liefert exakt einen ganzzahligen oder
  // einen exakten .5-Wert – kein Rundungsfehler möglich.
  return (sortiert[mitte - 1] + sortiert[mitte]) / 2;
}

/** Formatiert eine Stufenzahl mit deutschem Dezimalkomma, ganze Zahlen ohne Nachkommastelle. */
export function formatiereStufenwert(wert: number): string {
  return Number.isInteger(wert) ? String(wert) : wert.toFixed(1).replace('.', ',');
}
