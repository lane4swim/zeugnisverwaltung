import { ladeAktivenDatensatz, loescheAktivenDatensatz, speichereAktivenDatensatz } from '../db/database';
import type { Klassendatensatz, Schueler } from '../types';

type Listener = (datensatz: Klassendatensatz | null) => void;

/**
 * Hält den einen aktiven Klassendatensatz im Speicher und spiegelt jede
 * Änderung sofort in IndexedDB (Robustheit: kein Datenverlust bei
 * Browser-Neustart, siehe spezifikation.md 7).
 */
class DatensatzStore {
  private aktuell: Klassendatensatz | null = null;
  private listeners = new Set<Listener>();
  private geladen = false;

  async init(): Promise<void> {
    if (this.geladen) return;
    this.aktuell = await ladeAktivenDatensatz();
    this.geladen = true;
    this.notify();
  }

  get(): Klassendatensatz | null {
    return this.aktuell;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.aktuell);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.aktuell);
  }

  private async persist(): Promise<void> {
    if (this.aktuell) {
      await speichereAktivenDatensatz(this.aktuell);
    }
    this.notify();
  }

  async setzeDatensatz(datensatz: Klassendatensatz): Promise<void> {
    this.aktuell = datensatz;
    await this.persist();
  }

  async schliesseDatensatz(): Promise<void> {
    this.aktuell = null;
    await loescheAktivenDatensatz();
    this.notify();
  }

  async fuegeSchuelerHinzu(schueler: Schueler): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    this.aktuell = { ...this.aktuell, schueler: [...this.aktuell.schueler, schueler] };
    await this.persist();
  }

  async aktualisiereSchueler(schueler: Schueler): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    this.aktuell = {
      ...this.aktuell,
      schueler: this.aktuell.schueler.map((s) => (s.id === schueler.id ? schueler : s)),
    };
    await this.persist();
  }

  async entferneSchueler(schuelerId: string): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    this.aktuell = {
      ...this.aktuell,
      schueler: this.aktuell.schueler.filter((s) => s.id !== schuelerId),
      // Zugehörige Bewertungen/Texte/Bemerkungen entfernen, da sonst verwaiste
      // Einträge mit ungültiger schuelerId im Datensatz verbleiben.
      bewertungen: this.aktuell.bewertungen.filter((b) => b.schuelerId !== schuelerId),
      bewertungstexte: this.aktuell.bewertungstexte.filter((b) => b.schuelerId !== schuelerId),
      bemerkungen: this.aktuell.bemerkungen.filter((b) => b.schuelerId !== schuelerId),
    };
    await this.persist();
  }
}

export const datensatzStore = new DatensatzStore();
