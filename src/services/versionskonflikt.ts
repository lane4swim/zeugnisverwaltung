import type { Bewertung, KompetenzDatei, Schueler } from '../types';
import { kompetenzIds } from '../utils/kompetenzstruktur';

export interface EntfalleneKompetenz {
  kompetenzId: string;
  betroffeneSchueler: Schueler[];
}

export interface GeaenderteStufenanzahl {
  kompetenzId: string;
  neueStufenanzahl: number;
  betroffeneSchueler: { schueler: Schueler; bisherigeStufe: number }[];
}

export interface Versionskonflikte {
  hatKonflikte: boolean;
  entfalleneKompetenzen: EntfalleneKompetenz[];
  geaenderteStufenanzahl: GeaenderteStufenanzahl[];
}

/**
 * Prüft gemäß spezifikation.md 4.1, ob bestehende Bewertungen mit einer neu
 * geladenen Kompetenzdatei in Konflikt stehen: entfallene Kompetenz-IDs oder
 * eine gespeicherte Stufe außerhalb der (ggf. geänderten) Stufenanzahl.
 */
export function ermittleVersionskonflikte(
  neueDatei: KompetenzDatei,
  bewertungen: Bewertung[],
  schuelerListe: Schueler[],
): Versionskonflikte {
  const ids = kompetenzIds(neueDatei);
  const stufenzahlProKompetenz = new Map<string, number>();
  for (const { kompetenz } of alleKompetenzenMitStufenzahl(neueDatei)) {
    stufenzahlProKompetenz.set(kompetenz.id, kompetenz.stufen.length);
  }
  const schuelerNachId = new Map(schuelerListe.map((s) => [s.id, s]));

  const entfalleneMap = new Map<string, Schueler[]>();
  const geaenderteMap = new Map<string, { neueStufenanzahl: number; betroffene: { schueler: Schueler; bisherigeStufe: number }[] }>();

  for (const bewertung of bewertungen) {
    const schueler = schuelerNachId.get(bewertung.schuelerId);
    if (!schueler) continue;

    if (!ids.has(bewertung.kompetenzId)) {
      const liste = entfalleneMap.get(bewertung.kompetenzId) ?? [];
      liste.push(schueler);
      entfalleneMap.set(bewertung.kompetenzId, liste);
      continue;
    }

    const stufenzahl = stufenzahlProKompetenz.get(bewertung.kompetenzId) ?? 0;
    if (bewertung.stufe > stufenzahl) {
      const eintrag = geaenderteMap.get(bewertung.kompetenzId) ?? { neueStufenanzahl: stufenzahl, betroffene: [] };
      eintrag.betroffene.push({ schueler, bisherigeStufe: bewertung.stufe });
      geaenderteMap.set(bewertung.kompetenzId, eintrag);
    }
  }

  const entfalleneKompetenzen: EntfalleneKompetenz[] = [...entfalleneMap.entries()].map(
    ([kompetenzId, betroffeneSchueler]) => ({ kompetenzId, betroffeneSchueler }),
  );
  const geaenderteStufenanzahl: GeaenderteStufenanzahl[] = [...geaenderteMap.entries()].map(
    ([kompetenzId, wert]) => ({ kompetenzId, neueStufenanzahl: wert.neueStufenanzahl, betroffeneSchueler: wert.betroffene }),
  );

  return {
    hatKonflikte: entfalleneKompetenzen.length > 0 || geaenderteStufenanzahl.length > 0,
    entfalleneKompetenzen,
    geaenderteStufenanzahl,
  };
}

function alleKompetenzenMitStufenzahl(datei: KompetenzDatei) {
  return datei.abschnitte.flatMap((a) => a.bereiche.flatMap((b) => b.kompetenzen.map((kompetenz) => ({ kompetenz }))));
}

/** Reine Textzeilen für einen Hinweisdialog (z. B. nach einem JSON-Import, siehe 7). */
export function formatiereKonfliktZeilenAlsText(konflikte: Versionskonflikte): string[] {
  const zeilen: string[] = [];
  for (const e of konflikte.entfalleneKompetenzen) {
    const namen = e.betroffeneSchueler.map((s) => `${s.vorname} ${s.nachname}`).join(', ');
    zeilen.push(`Kompetenz "${e.kompetenzId}" gibt es in der aktuell geladenen Version nicht mehr. Betroffen: ${namen}.`);
  }
  for (const g of konflikte.geaenderteStufenanzahl) {
    const namen = g.betroffeneSchueler.map((b) => `${b.schueler.vorname} ${b.schueler.nachname} (bisher Stufe ${b.bisherigeStufe})`).join(', ');
    zeilen.push(`Kompetenz "${g.kompetenzId}" hat jetzt nur noch ${g.neueStufenanzahl} Stufe(n). Betroffen: ${namen}.`);
  }
  return zeilen;
}
