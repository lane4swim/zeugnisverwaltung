import { ladeAktivenDatensatz, loescheAktivenDatensatz, speichereAktivenDatensatz } from '../db/database';
import { fachNichtRelevantBemerkungsId } from '../services/bemerkungen';
import type {
  BemerkungEintrag,
  Bewertung,
  Bewertungstext,
  Klassendatensatz,
  NichtRelevanterAbschnittEintrag,
  Schueler,
} from '../types';

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

  /** Fügt mehrere Schüler:innen in einem Zug hinzu, z. B. beim CSV-Import (spezifikation.md 5.1). */
  async fuegeSchuelerListeHinzu(neueSchueler: Schueler[]): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    if (neueSchueler.length === 0) return;
    this.aktuell = { ...this.aktuell, schueler: [...this.aktuell.schueler, ...neueSchueler] };
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

  /**
   * Ersetzt die ausgewählten Bemerkungsbausteine eines Schülers
   * (spezifikation.md 3.6/5.3). Bereits getroffene Ausprägungs-Auswahlen
   * (z. B. „Silber" statt „Bronze") bleiben dabei erhalten, auch wenn der
   * betreffende Baustein kurzzeitig ab-/wieder angewählt wird.
   */
  async setzeBemerkungen(schuelerId: string, ausgewaehlteBemerkungen: string[]): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    const bisherigeAuspraegungen = this.aktuell.bemerkungen.find((b) => b.schuelerId === schuelerId)?.auspraegungen ?? {};
    const neuerEintrag: BemerkungEintrag = { schuelerId, ausgewaehlteBemerkungen, auspraegungen: bisherigeAuspraegungen };
    this.aktuell = {
      ...this.aktuell,
      bemerkungen: [...this.aktuell.bemerkungen.filter((b) => b.schuelerId !== schuelerId), neuerEintrag],
    };
    await this.persistMitAenderung();
  }

  /**
   * Setzt die gewählte Ausprägung (Options-Index) einer Auswahlgruppe
   * innerhalb eines Bemerkungsbausteins, z. B. „Gold" statt „Bronze" bei
   * `{Bronze|Silber|Gold}` (spezifikation.md 3.6/5.3).
   */
  async setzeBemerkungAuspraegung(
    schuelerId: string,
    bausteinId: string,
    gruppenIndex: number,
    optionsIndex: number,
  ): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    const bestehenderEintrag = this.aktuell.bemerkungen.find((b) => b.schuelerId === schuelerId);
    const ausgewaehlteBemerkungen = bestehenderEintrag?.ausgewaehlteBemerkungen ?? [];
    const bisherigeAuspraegungen = bestehenderEintrag?.auspraegungen ?? {};
    const neueIndizes = [...(bisherigeAuspraegungen[bausteinId] ?? [])];
    neueIndizes[gruppenIndex] = optionsIndex;
    const neuerEintrag: BemerkungEintrag = {
      schuelerId,
      ausgewaehlteBemerkungen,
      auspraegungen: { ...bisherigeAuspraegungen, [bausteinId]: neueIndizes },
    };
    this.aktuell = {
      ...this.aktuell,
      bemerkungen: [...this.aktuell.bemerkungen.filter((b) => b.schuelerId !== schuelerId), neuerEintrag],
    };
    await this.persistMitAenderung();
  }

  /**
   * Markiert ein als `optional` gekennzeichnetes Fach für eine Person als
   * (nicht) relevant. Für als nicht relevant markierte Fächer ist keine
   * Bewertung möglich und sie fließen nicht in die Vollständigkeitsprüfung
   * ein (spezifikation.md 3.3, 5.1, 5.2). Bestehende Bewertungen in diesem
   * Fach werden bewusst nicht gelöscht (falls die Markierung versehentlich
   * gesetzt wurde, bleiben sie beim Zurücknehmen erhalten), sondern nur in
   * der Bewertungsansicht ausgeblendet und bei Status/Export ignoriert.
   *
   * Ist für das Fach eine `nichtRelevantBemerkung` hinterlegt
   * (`hatAutomatischeBemerkung`), wird die daraus abgeleitete Bemerkung
   * beim Markieren automatisch in die Bemerkungen (3.6) übernommen und
   * beim Zurücknehmen wieder entfernt (3.7).
   */
  async setzeAbschnittNichtRelevant(
    schuelerId: string,
    abschnittId: string,
    nichtRelevant: boolean,
    hatAutomatischeBemerkung: boolean,
  ): Promise<void> {
    if (!this.aktuell) throw new Error('Kein aktiver Datensatz');
    const bisherigeIds =
      this.aktuell.nichtRelevanteAbschnitte.find((e) => e.schuelerId === schuelerId)?.abschnittIds ?? [];
    const neueIds = nichtRelevant
      ? bisherigeIds.includes(abschnittId)
        ? bisherigeIds
        : [...bisherigeIds, abschnittId]
      : bisherigeIds.filter((id) => id !== abschnittId);
    const neuerEintrag: NichtRelevanterAbschnittEintrag = { schuelerId, abschnittIds: neueIds };

    let bemerkungen = this.aktuell.bemerkungen;
    if (hatAutomatischeBemerkung) {
      const syntheseId = fachNichtRelevantBemerkungsId(abschnittId);
      const bestehenderEintrag = bemerkungen.find((b) => b.schuelerId === schuelerId);
      const bisherigeBemerkungen = bestehenderEintrag?.ausgewaehlteBemerkungen ?? [];
      const bisherigeAuspraegungen = bestehenderEintrag?.auspraegungen ?? {};
      const neueBemerkungen = nichtRelevant
        ? bisherigeBemerkungen.includes(syntheseId)
          ? bisherigeBemerkungen
          : [...bisherigeBemerkungen, syntheseId]
        : bisherigeBemerkungen.filter((id) => id !== syntheseId);
      bemerkungen = [
        ...bemerkungen.filter((b) => b.schuelerId !== schuelerId),
        { schuelerId, ausgewaehlteBemerkungen: neueBemerkungen, auspraegungen: bisherigeAuspraegungen },
      ];
    }

    this.aktuell = {
      ...this.aktuell,
      nichtRelevanteAbschnitte: [
        ...this.aktuell.nichtRelevanteAbschnitte.filter((e) => e.schuelerId !== schuelerId),
        neuerEintrag,
      ],
      bemerkungen,
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
      nichtRelevanteAbschnitte: this.aktuell.nichtRelevanteAbschnitte.filter((e) => e.schuelerId !== schuelerId),
    };
    await this.persistMitAenderung();
  }
}

export const datensatzStore = new DatensatzStore();
