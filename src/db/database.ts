import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Klassendatensatz } from '../types';

const DB_NAME = 'zeugnisverwaltung';
const DB_VERSION = 1;
const STORE = 'aktiverDatensatz';
/**
 * Es wird laut Spezifikation (2, 3.2) genau ein Klassendatensatz gleichzeitig
 * aktiv verwaltet – daher fester Schlüssel statt Autoincrement.
 */
const AKTIVER_SCHLUESSEL = 'aktuell';

interface ZeugnisDBSchema extends DBSchema {
  [STORE]: {
    key: string;
    value: Klassendatensatz;
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
      },
    });
  }
  return dbPromise;
}

export async function ladeAktivenDatensatz(): Promise<Klassendatensatz | null> {
  const db = await getDb();
  const wert = await db.get(STORE, AKTIVER_SCHLUESSEL);
  return wert ?? null;
}

export async function speichereAktivenDatensatz(datensatz: Klassendatensatz): Promise<void> {
  const db = await getDb();
  await db.put(STORE, datensatz, AKTIVER_SCHLUESSEL);
}

export async function loescheAktivenDatensatz(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, AKTIVER_SCHLUESSEL);
}
