/** Formatiert ein ISO-Datum (yyyy-mm-dd) als TT.MM.JJJJ (spezifikation.md 6.1). */
export function formatiereDatum(iso: string): string {
  const [jahr, monat, tag] = iso.split('-');
  if (!jahr || !monat || !tag) return iso;
  return `${tag}.${monat}.${jahr}`;
}
