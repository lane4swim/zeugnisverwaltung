import { ladeKompetenzdateiAusCache, speichereKompetenzdateiImCache } from '../db/database';
import type { Halbjahr, KompetenzDatei } from '../types';

export class KompetenzdateiFehler extends Error {}

function pfadFuer(halbjahr: Halbjahr): string {
  // Relativer Pfad (kein führender Slash), damit der Abruf sowohl im
  // Entwicklungsserver als auch aus dem gebauten dist/-Ordner heraus
  // funktioniert (siehe vite.config.ts base: './').
  return `kompetenzdaten/${halbjahr}.json`;
}

function validiere(daten: unknown, erwartetesHalbjahr: Halbjahr): KompetenzDatei {
  if (typeof daten !== 'object' || daten === null) {
    throw new KompetenzdateiFehler('Kompetenzdatei ist kein gültiges JSON-Objekt.');
  }
  const d = daten as Record<string, unknown>;
  if (d.halbjahr !== erwartetesHalbjahr) {
    throw new KompetenzdateiFehler(
      `Kompetenzdatei-Inhalt (Halbjahr "${String(d.halbjahr)}") passt nicht zum erwarteten Halbjahr "${erwartetesHalbjahr}".`,
    );
  }
  if (typeof d.version !== 'string' || d.version.trim() === '') {
    throw new KompetenzdateiFehler('Kompetenzdatei hat kein gültiges "version"-Feld.');
  }
  if (!Array.isArray(d.abschnitte)) {
    throw new KompetenzdateiFehler('Kompetenzdatei hat kein "abschnitte"-Array.');
  }
  if (!Array.isArray(d.bemerkungsbausteine)) {
    throw new KompetenzdateiFehler('Kompetenzdatei hat kein "bemerkungsbausteine"-Array.');
  }
  return daten as KompetenzDatei;
}

/** Lädt die Kompetenzdatei ausschließlich vom Server (kein Cache-Zugriff). */
export async function ladeKompetenzdateiVomServer(halbjahr: Halbjahr, keinBrowserCache = false): Promise<KompetenzDatei> {
  let antwort: Response;
  try {
    antwort = await fetch(pfadFuer(halbjahr), { cache: keinBrowserCache ? 'no-store' : 'default' });
  } catch {
    throw new KompetenzdateiFehler(`Kompetenzdatei für Halbjahr ${halbjahr} ist ohne Internetverbindung nicht erreichbar.`);
  }
  if (!antwort.ok) {
    throw new KompetenzdateiFehler(
      antwort.status === 404
        ? `Für Halbjahr ${halbjahr} ist (noch) keine Kompetenzdatei verfügbar.`
        : `Kompetenzdatei für Halbjahr ${halbjahr} konnte nicht geladen werden (HTTP ${antwort.status}).`,
    );
  }
  let geparst: unknown;
  try {
    geparst = await antwort.json();
  } catch {
    throw new KompetenzdateiFehler(`Kompetenzdatei für Halbjahr ${halbjahr} enthält kein gültiges JSON.`);
  }
  return validiere(geparst, halbjahr);
}

export interface KompetenzdateiLadeErgebnis {
  datei: KompetenzDatei;
  quelle: 'netzwerk' | 'cache';
}

/**
 * Normales Laden beim Öffnen eines Klassendatensatzes (spezifikation.md 4):
 * Netzwerk zuerst, bei Fehlschlag Fallback auf den lokalen Cache (Offline-
 * Fähigkeit), damit die App nach dem ersten Laden auch offline funktioniert.
 */
export async function holeKompetenzdatei(halbjahr: Halbjahr): Promise<KompetenzdateiLadeErgebnis> {
  try {
    const datei = await ladeKompetenzdateiVomServer(halbjahr);
    await speichereKompetenzdateiImCache(halbjahr, datei);
    return { datei, quelle: 'netzwerk' };
  } catch (fehler) {
    const gecacht = await ladeKompetenzdateiAusCache(halbjahr);
    if (gecacht) return { datei: gecacht, quelle: 'cache' };
    throw fehler;
  }
}

export { speichereKompetenzdateiImCache };
