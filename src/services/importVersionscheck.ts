import type { Klassendatensatz } from '../types';
import { kompetenzdateiStore } from '../state/kompetenzdateiStore';
import { ermittleVersionskonflikte, formatiereKonfliktZeilenAlsText } from './versionskonflikt';
import { meldungAnzeigen } from '../ui/meldungDialog';

/**
 * Fehlerbehandlung bei Import-Versionskonflikten (spezifikation.md 7/4.1):
 * Nach einem JSON-Import wird geprüft, ob der importierte Datensatz zur
 * aktuell verfügbaren Kompetenzdatei des Halbjahres passt. Der Import
 * selbst wird dabei nicht rückgängig gemacht (die Datei ist bereits die
 * bewusste Nutzerentscheidung) – es folgt lediglich ein informativer
 * Hinweis, analog zur Warnung beim manuellen „Aktualisieren" (4.1).
 */
export async function pruefeUndMeldeImportVersionskonflikt(datensatz: Klassendatensatz): Promise<void> {
  await kompetenzdateiStore.ladeNeu(datensatz.halbjahr);
  const zustand = kompetenzdateiStore.get();
  if (zustand.status !== 'geladen' || !zustand.datei) return;
  if (datensatz.kompetenzdateiVersion && datensatz.kompetenzdateiVersion === zustand.datei.version) return;

  const konflikte = ermittleVersionskonflikte(zustand.datei, datensatz.bewertungen, datensatz.schueler);
  if (!konflikte.hatKonflikte) return;

  await meldungAnzeigen('Hinweis: abweichende Kompetenzdatei-Version', [
    `Diese Datei wurde mit Kompetenzdatei-Version "${datensatz.kompetenzdateiVersion ?? 'unbekannt'}" erstellt, aktuell geladen ist Version "${zustand.datei.version}".`,
    ...formatiereKonfliktZeilenAlsText(konflikte),
    'Betroffene Bewertungen bleiben im Datensatz erhalten und sind in der Bewertungsansicht der jeweiligen Kompetenz markiert.',
  ]);
}
