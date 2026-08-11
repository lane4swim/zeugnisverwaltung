import type { Klassendatensatz, KompetenzDatei, Schueler } from '../types';
import { erzeugeSchuelerFelder } from './textgenerierung';
import { erzeugeBemerkungstext, erzeugeVollstaendigeBausteinListe } from './bemerkungen';

/** Klassenreihenfolge für den Sammeldokument-Export: alphabetisch nach Nachname, dann Vorname. */
export function sortiereSchuelerFuerExport(schueler: Schueler[]): Schueler[] {
  return [...schueler].sort((a, b) => {
    const vergleich = a.nachname.localeCompare(b.nachname, 'de');
    return vergleich !== 0 ? vergleich : a.vorname.localeCompare(b.vorname, 'de');
  });
}

function effektiverKompetenzText(datensatz: Klassendatensatz, schuelerId: string, kompetenzId: string): string {
  const text = datensatz.bewertungstexte.find((t) => t.schuelerId === schuelerId && t.kompetenzId === kompetenzId);
  return text?.manuellerText ?? text?.generierterText ?? '';
}

/**
 * Baut den vollständigen, flachen Platzhalter-Datenkontext für einen
 * Schüler gemäß spezifikation.md 6.1: Stammdaten/Pronomen, `Bereich_<id>`
 * (alle Kompetenztexte des Bereichs, in Definitionsreihenfolge
 * zusammengefügt), `Kompetenz_<id>` (Einzeltext) und `Bemerkungen`. Jeder in
 * der Kompetenzdatei vorkommende Platzhalter erhält garantiert einen
 * Eintrag (ggf. leerer String), damit im Word-Export kein Platzhalter
 * unaufgelöst bleibt, auch wenn eine Kompetenz noch nicht bewertet wurde.
 */
export function erzeugeDatenkontext(
  schueler: Schueler,
  datensatz: Klassendatensatz,
  kompetenzdatei: KompetenzDatei,
): Record<string, string> {
  const kontext: Record<string, string> = { ...erzeugeSchuelerFelder(schueler) };

  for (const abschnitt of kompetenzdatei.abschnitte) {
    for (const bereich of abschnitt.bereiche) {
      const bereichTeile: string[] = [];
      for (const kompetenz of bereich.kompetenzen) {
        const text = effektiverKompetenzText(datensatz, schueler.id, kompetenz.id);
        kontext[`Kompetenz_${kompetenz.id}`] = text;
        if (text) bereichTeile.push(text);
      }
      kontext[`Bereich_${bereich.id}`] = bereichTeile.join(' ');
    }
  }

  const bemerkungEintrag = datensatz.bemerkungen.find((b) => b.schuelerId === schueler.id);
  kontext.Bemerkungen = erzeugeBemerkungstext(
    bemerkungEintrag?.ausgewaehlteBemerkungen ?? [],
    erzeugeVollstaendigeBausteinListe(kompetenzdatei),
    schueler,
  );

  return kontext;
}
