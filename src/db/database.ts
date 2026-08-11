import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { normalisiereKlassendatensatz, type Halbjahr, type KompetenzDatei, type Klassendatensatz } from '../types';

const DB_NAME = 'zeugnisverwaltung';
const DB_VERSION = 2;
const STORE = 'aktiverDatensatz';
const KOMPETENZDATEI_STORE = 'kompetenzdateien';
/**
 * Es wird laut Spezifikation (2, 3.2) genau ein Klassendatensatz gleichzeitig
 * aktiv verwaltet – daher fester Schlüssel statt Autoincrement.
 */
const AKTIVER_SCHLUESSEL = 'aktuell';

interface GecachteKompetenzdatei {
  datei: KompetenzDatei;
  geladenAm: string;
}

interface ZeugnisDBSchema extends DBSchema {
  [STORE]: {
    key: string;
    value: Klassendatensatz;
  };
  [KOMPETENZDATEI_STORE]: {
    key: Halbjahr;
    value: GecachteKompetenzdatei;
  };
}

let dbPromise: Promise<IDBPDatabase<ZeugnisDBSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<ZeugnisDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ZeugnisDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
        if (!db.objectStoreNames.contains(KOMPETENZDATEI_STORE)) {
          db.createObjectStore(KOMPETENZDATEI_STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function ladeAktivenDatensatz(): Promise<Klassendatensatz | null> {
  const db = await getDb();
  const wert = await db.get(STORE, AKTIVER_SCHLUESSEL);
  return wert ? normalisiereKlassendatensatz(wert) : null;
}

export async function speichereAktivenDatensatz(datensatz: Klassendatensatz): Promise<void> {
  const db = await getDb();
  await db.put(STORE, datensatz, AKTIVER_SCHLUESSEL);
}

export async function loescheAktivenDatensatz(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, AKTIVER_SCHLUESSEL);
}

/**
 * Kompetenzdateien enthalten keine Schülerdaten (spezifikation.md 4) und
 * werden je Halbjahr lokal zwischengespeichert, damit die App nach dem
 * ersten Laden auch offline funktioniert.
 */
export async function ladeKompetenzdateiAusCache(halbjahr: Halbjahr): Promise<KompetenzDatei | null> {
  const db = await getDb();
  const wert = await db.get(KOMPETENZDATEI_STORE, halbjahr);
  return wert?.datei ?? null;
}

export async function speichereKompetenzdateiImCache(halbjahr: Halbjahr, datei: KompetenzDatei): Promise<void> {
  const db = await getDb();
  await db.put(KOMPETENZDATEI_STORE, { datei, geladenAm: new Date().toISOString() }, halbjahr);
}
