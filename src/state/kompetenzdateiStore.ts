import { holeKompetenzdatei, ladeKompetenzdateiVomServer, speichereKompetenzdateiImCache } from '../services/kompetenzdatei';
import type { Halbjahr, KompetenzDatei } from '../types';

export type KompetenzdateiStatus = 'leer' | 'laedt' | 'geladen' | 'fehler';

export interface KompetenzdateiZustand {
  status: KompetenzdateiStatus;
  halbjahr: Halbjahr | null;
  datei: KompetenzDatei | null;
  quelle: 'netzwerk' | 'cache' | null;
  fehler: string | null;
}

type Listener = (zustand: KompetenzdateiZustand) => void;

/**
 * Hält die für das aktive Halbjahr geladene Kompetenzdatei (spezifikation.md
 * 4). Getrennt vom Klassendatensatz-Store, da die Datei nicht
 * personenbezogen ist und unabhängig aktualisiert werden kann.
 */
class KompetenzdateiStore {
  private zustand: KompetenzdateiZustand = { status: 'leer', halbjahr: null, datei: null, quelle: null, fehler: null };
  private listeners = new Set<Listener>();
  private ladeVorgang = 0;

  get(): KompetenzdateiZustand {
    return this.zustand;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.zustand);
    return () => this.listeners.delete(listener);
  }

  private setzeZustand(teil: Partial<KompetenzdateiZustand>): void {
    this.zustand = { ...this.zustand, ...teil };
    for (const listener of this.listeners) listener(this.zustand);
  }

  /** Lädt die Datei für ein Halbjahr, sofern nicht bereits für dieses Halbjahr geladen. */
  async stelleSicher(halbjahr: Halbjahr): Promise<void> {
    if (this.zustand.halbjahr === halbjahr && (this.zustand.status === 'geladen' || this.zustand.status === 'laedt')) {
      return;
    }
    await this.ladeNeu(halbjahr);
  }

  async ladeNeu(halbjahr: Halbjahr): Promise<void> {
    const eigeneNummer = ++this.ladeVorgang;
    this.setzeZustand({ status: 'laedt', halbjahr, fehler: null });
    try {
      const { datei, quelle } = await holeKompetenzdatei(halbjahr);
      if (eigeneNummer !== this.ladeVorgang) return; // zwischenzeitlich überholt
      this.setzeZustand({ status: 'geladen', halbjahr, datei, quelle, fehler: null });
    } catch (fehler) {
      if (eigeneNummer !== this.ladeVorgang) return;
      const meldung = fehler instanceof Error ? fehler.message : String(fehler);
      this.setzeZustand({ status: 'fehler', halbjahr, datei: null, quelle: null, fehler: meldung });
    }
  }

  /**
   * Manuelles „Aktualisieren" (spezifikation.md 4/4.1): lädt zwangsweise vom
   * Server, OHNE den aktuellen Zustand sofort zu ersetzen – der Aufrufer
   * entscheidet nach Prüfung auf Versionskonflikte, ob übernommen wird.
   */
  async pruefeAktualisierung(halbjahr: Halbjahr): Promise<{ neueDatei: KompetenzDatei; unveraendert: boolean }> {
    const neueDatei = await ladeKompetenzdateiVomServer(halbjahr, true);
    const unveraendert = this.zustand.datei?.version === neueDatei.version;
    return { neueDatei, unveraendert };
  }

  async uebernehmeNeueDatei(neueDatei: KompetenzDatei): Promise<void> {
    await speichereKompetenzdateiImCache(neueDatei.halbjahr, neueDatei);
    this.setzeZustand({ status: 'geladen', halbjahr: neueDatei.halbjahr, datei: neueDatei, quelle: 'netzwerk', fehler: null });
  }

  zuruecksetzen(): void {
    this.ladeVorgang++;
    this.setzeZustand({ status: 'leer', halbjahr: null, datei: null, quelle: null, fehler: null });
  }
}

export const kompetenzdateiStore = new KompetenzdateiStore();
