import { ladeAktivenDatensatz, loescheAktivenDatensatz, speichereAktivenDatensatz } from '../db/database';
import type { BemerkungEintrag, Bewertung, Bewertungstext, Klassendatensatz, Schueler } from '../types';

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
  /**
   * Anzahl inhaltlicher Änderungen (Schüler:innen, Bewertungen, Texte,
   * Bemerkungen) seit dem letzten JSON-Export – Grundlage für die
   * Backup-Erinnerung (spezifikation.md 7 Robustheit).
   */
  private aenderungenSeitExport = 0;

  async init(): Promise<void> {
    if (this.geladen) return;
    this.aktuell = await ladeAktivenDatensatz();
    this.geladen = true;
    this.notify();
  }

  get(): Klassendatensatz | null {
    return this.aktuell;
  }

  anzahlAenderungenSeitExport(): number {
    return this.aenderungenSeitExport;
  }

  /** Vom Export-Flow aufzurufen, sobald ein JSON-Backup erfolgreich erstellt wurde. */
  vermerkeExport(): void {
    this.aenderungenSeitExport = 0;
    this.notify();
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

  /** Wie persist(), zusätzlich als „inhaltliche Änderung" für die Backup-Erinnerung gezählt. */
  private async persistMitAenderung(): Promise<void> {
    this.aenderungenSeitExport += 1;
    await this.persist();
  }

  async setzeDatensatz(datensatz: Klassendatensatz): Promise<void> {
    this.aktuell = datensatz;
    this.aenderungenSeitExport = 0;
    await this.persist();
  }

  async schliesseDatensatz(): Promise<void> {
    this.aktuell = null;
    this.aenderungenSeitExport = 0;
    await loescheAktivenDatensatz();
    this.notify();
  }

  async fuegeSchuelerHinzu(schueler: Schueler): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    this.aktuell = { ...this.aktuell, schueler: [...this.aktuell.schueler, schueler] };
    await this.persistMitAenderung();
  }

  async aktualisiereSchueler(schueler: Schueler): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    this.aktuell = {
      ...this.aktuell,
      schueler: this.aktuell.schueler.map((s) => (s.id === schueler.id ? schueler : s)),
    };
    await this.persistMitAenderung();
  }

  /** Setzt die Version der zuletzt geladenen Kompetenzdatei (spezifikation.md 3.7, 4). */
  async setzeKompetenzdateiVersion(version: string): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    if (this.aktuell.kompetenzdateiVersion === version) return;
    this.aktuell = { ...this.aktuell, kompetenzdateiVersion: version };
    await this.persist();
  }

  /**
   * Übernimmt eine Stufenauswahl (Erstauswahl oder „Neu würfeln") zusammen
   * mit dem dazu automatisch generierten Text als eine Aktualisierung
   * (spezifikation.md 3.4/3.5/5.4). Ein zuvor gesperrter Text wird dabei
   * bewusst nicht überschrieben – die aufrufende UI darf diese Methode für
   * eine gesperrte Kompetenz gar nicht erst aufrufen (Stufenauswahl ist dann
   * schreibgeschützt), diese Prüfung dient als zusätzliche Absicherung.
   */
  async setzeBewertungMitGeneriertemText(
    schuelerId: string,
    kompetenzId: string,
    stufe: number,
    gewaehlterBausteinIndex: number,
    generierterText: string,
  ): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    const bestehenderText = this.aktuell.bewertungstexte.find(
      (t) => t.schuelerId === schuelerId && t.kompetenzId === kompetenzId,
    );
    if (bestehenderText?.gesperrt) return;

    const neueBewertung: Bewertung = {
      schuelerId,
      kompetenzId,
      stufe,
      bewertetAm: new Date().toISOString(),
      gewaehlterBausteinIndex,
    };
    const neuerText: Bewertungstext = {
      schuelerId,
      kompetenzId,
      generierterText,
      manuellerText: null,
      gesperrt: false,
    };
    this.aktuell = {
      ...this.aktuell,
      bewertungen: [
        ...this.aktuell.bewertungen.filter((b) => !(b.schuelerId === schuelerId && b.kompetenzId === kompetenzId)),
        neueBewertung,
      ],
      bewertungstexte: [
        ...this.aktuell.bewertungstexte.filter((t) => !(t.schuelerId === schuelerId && t.kompetenzId === kompetenzId)),
        neuerText,
      ],
    };
    await this.persistMitAenderung();
  }

  /** Manuelle Textbearbeitung sperrt die Stufenauswahl (spezifikation.md 3.5). */
  async setzeManuellenText(schuelerId: string, kompetenzId: string, text: string): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    const bestehender = this.aktuell.bewertungstexte.find(
      (t) => t.schuelerId === schuelerId && t.kompetenzId === kompetenzId,
    );
    const neuerText: Bewertungstext = {
      schuelerId,
      kompetenzId,
      generierterText: bestehender?.generierterText ?? null,
      manuellerText: text,
      gesperrt: true,
    };
    this.aktuell = {
      ...this.aktuell,
      bewertungstexte: [
        ...this.aktuell.bewertungstexte.filter((t) => !(t.schuelerId === schuelerId && t.kompetenzId === kompetenzId)),
        neuerText,
      ],
    };
    await this.persistMitAenderung();
  }

  /** „Zurücksetzen": entsperrt und ersetzt den Text durch eine frische, automatische Generierung (3.5). */
  async setzeTextZurueck(schuelerId: string, kompetenzId: string, neuGenerierterText: string): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    const neuerText: Bewertungstext = {
      schuelerId,
      kompetenzId,
      generierterText: neuGenerierterText,
      manuellerText: null,
      gesperrt: false,
    };
    this.aktuell = {
      ...this.aktuell,
      bewertungstexte: [
        ...this.aktuell.bewertungstexte.filter((t) => !(t.schuelerId === schuelerId && t.kompetenzId === kompetenzId)),
        neuerText,
      ],
    };
    await this.persistMitAenderung();
  }

  /** Entfernt eine einzelne Bewertung samt zugehörigem Text, z. B. beim Bereinigen veralteter/ungültiger Einträge (4.1). */
  async entferneBewertung(schuelerId: string, kompetenzId: string): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    this.aktuell = {
      ...this.aktuell,
      bewertungen: this.aktuell.bewertungen.filter(
        (b) => !(b.schuelerId === schuelerId && b.kompetenzId === kompetenzId),
      ),
      bewertungstexte: this.aktuell.bewertungstexte.filter(
        (t) => !(t.schuelerId === schuelerId && t.kompetenzId === kompetenzId),
      ),
    };
    await this.persistMitAenderung();
  }

  /** Ersetzt die ausgewählten Bemerkungsbausteine eines Schülers (spezifikation.md 3.6/5.3). */
  async setzeBemerkungen(schuelerId: string, ausgewaehlteBemerkungen: string[]): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    const neuerEintrag: BemerkungEintrag = { schuelerId, ausgewaehlteBemerkungen };
    this.aktuell = {
      ...this.aktuell,
      bemerkungen: [...this.aktuell.bemerkungen.filter((b) => b.schuelerId !== schuelerId), neuerEintrag],
    };
    await this.persistMitAenderung();
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
    await this.persistMitAenderung();
  }
}

export const datensatzStore = new DatensatzStore();
