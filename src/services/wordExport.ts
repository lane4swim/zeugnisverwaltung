import type { Abschnitt, Bereich, Klassendatensatz, KompetenzDatei, Schueler } from '../types';
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

/** Alle Kompetenztexte eines Bereichs, in Definitionsreihenfolge zusammengefügt (entspricht `Bereich_<id>`, siehe 6.1). */
export function erzeugeBereichText(bereich: Bereich, schuelerId: string, datensatz: Klassendatensatz): string {
  return bereich.kompetenzen
    .map((kompetenz) => effektiverKompetenzText(datensatz, schuelerId, kompetenz.id))
    .filter((text) => text !== '')
    .join(' ');
}

/**
 * Gesamttext eines ganzen Fachs (Abschnitts): alle Bereichstexte dieses
 * Fachs, in Definitionsreihenfolge zusammengefügt. Grundlage der
 * einblendbaren Gesamttextvorschau je Fach in der Bewertungsansicht
 * (spezifikation.md 5.2) – entspricht genau dem Text, der beim Word-Export
 * entstünde, wenn eine Vorlage dort alle `{{Bereich_*}}`-Platzhalter dieses
 * Fachs nacheinander verwendet.
 */
export function erzeugeAbschnittGesamttext(abschnitt: Abschnitt, schuelerId: string, datensatz: Klassendatensatz): string {
  return abschnitt.bereiche
    .map((bereich) => erzeugeBereichText(bereich, schuelerId, datensatz))
    .filter((text) => text !== '')
    .join(' ');
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
      for (const kompetenz of bereich.kompetenzen) {
        kontext[`Kompetenz_${kompetenz.id}`] = effektiverKompetenzText(datensatz, schueler.id, kompetenz.id);
      }
      kontext[`Bereich_${bereich.id}`] = erzeugeBereichText(bereich, schueler.id, datensatz);
    }
  }

  const bemerkungEintrag = datensatz.bemerkungen.find((b) => b.schuelerId === schueler.id);
  kontext.Bemerkungen = erzeugeBemerkungstext(
    bemerkungEintrag?.ausgewaehlteBemerkungen ?? [],
    erzeugeVollstaendigeBausteinListe(kompetenzdatei),
    schueler,
    bemerkungEintrag?.auspraegungen ?? {},
  );

  return kontext;
}
