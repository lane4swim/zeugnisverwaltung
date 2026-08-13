import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { BEMERKUNGEN_ABSATZTRENNER } from './bemerkungen';

export class WordExportFehler extends Error {}

const DOCUMENT_XML_PFAD = 'word/document.xml';

/**
 * Wandelt Vorkommen von BEMERKUNGEN_ABSATZTRENNER innerhalb des gerenderten
 * `document.xml` in echte Word-Absätze um (spezifikation.md 5.3/5.6): Jeder
 * Bemerkungsbaustein soll im exportierten Zeugnis einen eigenen Absatz
 * bilden statt nur durch ein Leerzeichen von den übrigen getrennt zu sein.
 *
 * Docxtemplater ersetzt den Platzhalter `{{Bemerkungen}}` durch den
 * kompletten zusammengeführten Text als Inhalt eines einzelnen
 * `<w:t>`-Elements innerhalb eines `<w:r>` in genau einem `<w:p>`. Um daraus
 * mehrere Absätze zu machen, wird dieser eine Absatz an jedem Trennzeichen
 * aufgespalten: Die Absatzeigenschaften (`<w:pPr>`) sowie die
 * Formatierungseigenschaften des Laufs (`<w:rPr>`), in dem sich das
 * Trennzeichen befindet, werden für jeden neu entstehenden Absatz
 * übernommen, sodass Absatz-/Zeichenformatierung der Vorlage erhalten
 * bleiben. Läufe vor dem betroffenen Lauf verbleiben im ersten, Läufe danach
 * im letzten neuen Absatz (entspricht dem Verhalten eines manuellen
 * Zeilenumbruchs mit der Eingabetaste mitten in einem Absatz).
 *
 * Entspricht die Struktur des betroffenen Absatzes nicht exakt diesem
 * einfachen Schema (z. B. weil eine ungewöhnliche Vorlage den Platzhalter
 * auf mehrere Läufe verteilt), wird sicherheitshalber nicht aufgespalten,
 * sondern das Trennzeichen durch ein Leerzeichen ersetzt – so bleibt das
 * Dokument in jedem Fall gültiges OOXML, im ungünstigsten Fall lediglich
 * ohne Absatztrennung.
 */
function absatztrennerInWordAbsaetzeUmwandeln(dokumentXml: string): string {
  if (!dokumentXml.includes(BEMERKUNGEN_ABSATZTRENNER)) return dokumentXml;

  return dokumentXml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (absatz) => {
    if (!absatz.includes(BEMERKUNGEN_ABSATZTRENNER)) return absatz;

    const oeffnendesTagMatch = absatz.match(/^<w:p\b([^>]*)>/);
    if (!oeffnendesTagMatch) return absatz.split(BEMERKUNGEN_ABSATZTRENNER).join(' ');
    const pAttrs = oeffnendesTagMatch[1];
    let inhalt = absatz.slice(oeffnendesTagMatch[0].length, absatz.length - '</w:p>'.length);

    const pPrMatch = inhalt.match(/^<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';
    inhalt = inhalt.slice(pPr.length);

    // Alle Läufe des Absatzes einsammeln, um denjenigen mit dem
    // Trennzeichen sowie die Läufe davor/danach zu bestimmen.
    const laufRegex = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;
    let treffer: RegExpExecArray | null;
    let betroffenerLauf: { start: number; ende: number; text: string } | null = null;
    while ((treffer = laufRegex.exec(inhalt))) {
      if (treffer[0].includes(BEMERKUNGEN_ABSATZTRENNER)) {
        if (betroffenerLauf) {
          // Mehr als ein Lauf enthält das Trennzeichen – nicht sicher aufteilbar.
          betroffenerLauf = null;
          break;
        }
        betroffenerLauf = { start: treffer.index, ende: treffer.index + treffer[0].length, text: treffer[0] };
      }
    }
    if (!betroffenerLauf) return `<w:p${pAttrs}>${pPr}${inhalt}</w:p>`.split(BEMERKUNGEN_ABSATZTRENNER).join(' ');

    const laufOeffnendesTagMatch = betroffenerLauf.text.match(/^<w:r\b([^>]*)>/);
    if (!laufOeffnendesTagMatch) return absatz.split(BEMERKUNGEN_ABSATZTRENNER).join(' ');
    const rAttrs = laufOeffnendesTagMatch[1];
    let laufInhalt = betroffenerLauf.text.slice(laufOeffnendesTagMatch[0].length, betroffenerLauf.text.length - '</w:r>'.length);

    const rPrMatch = laufInhalt.match(/^<w:rPr>[\s\S]*?<\/w:rPr>/);
    const rPr = rPrMatch ? rPrMatch[0] : '';
    laufInhalt = laufInhalt.slice(rPr.length);

    const textMatch = laufInhalt.match(/^<w:t\b([^>]*)>([\s\S]*)<\/w:t>$/);
    if (!textMatch) return absatz.split(BEMERKUNGEN_ABSATZTRENNER).join(' ');
    const tAttrsRoh = textMatch[1];
    const tAttrs = /xml:space=/.test(tAttrsRoh) ? tAttrsRoh : `${tAttrsRoh} xml:space="preserve"`;
    const text = textMatch[2];

    const laeufeVor = inhalt.slice(0, betroffenerLauf.start);
    const laeufeNach = inhalt.slice(betroffenerLauf.ende);

    const stuecke = text.split(BEMERKUNGEN_ABSATZTRENNER);
    return stuecke
      .map((stueck, index) => {
        const lauf = `<w:r${rAttrs}>${rPr}<w:t${tAttrs}>${stueck}</w:t></w:r>`;
        let absatzInhalt = lauf;
        if (index === 0) absatzInhalt = laeufeVor + absatzInhalt;
        if (index === stuecke.length - 1) absatzInhalt = absatzInhalt + laeufeNach;
        return `<w:p${pAttrs}>${pPr}${absatzInhalt}</w:p>`;
      })
      .join('');
  });
}

function docxtemplaterFehlerBeschreiben(fehler: unknown): string[] {
  const basis = fehler instanceof Error ? fehler.message : String(fehler);
  const eigenschaften = (fehler as { properties?: { errors?: unknown[] } } | undefined)?.properties;
  if (eigenschaften?.errors && Array.isArray(eigenschaften.errors) && eigenschaften.errors.length > 0) {
    return eigenschaften.errors.map((einzelfehler) => {
      const e = einzelfehler as { message?: string; properties?: { explanation?: string } };
      return e.properties?.explanation ?? e.message ?? String(einzelfehler);
    });
  }
  return [basis];
}

/**
 * Rendert die Vorlage für einen einzelnen Schüler und liefert den rohen
 * `word/document.xml`-Inhalt des Ergebnisses (spezifikation.md 5.6).
 * Platzhalter in doppelten geschweiften Klammern ({{Vorname}} usw.), wie in
 * spezifikation.md 6.1 für die Word-Vorlage festgelegt. Unbekannte
 * Platzhalter im Template werden zu einem leeren String aufgelöst statt
 * einen Abbruch für die gesamte Klasse zu verursachen.
 */
function rendereEinzelDokumentXml(templateBuffer: ArrayBuffer, datenkontext: Record<string, string>): string {
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch {
    throw new WordExportFehler('Die ausgewählte Datei ist keine gültige .docx-Datei (kein lesbares ZIP-Archiv).');
  }

  let doc: Docxtemplater;
  try {
    doc = new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });
  } catch (fehler) {
    throw new WordExportFehler(
      'Die Word-Vorlage enthält ungültige Platzhalter:\n' + docxtemplaterFehlerBeschreiben(fehler).join('\n'),
    );
  }

  try {
    doc.render(datenkontext);
  } catch (fehler) {
    throw new WordExportFehler(
      'Die Word-Vorlage konnte nicht befüllt werden:\n' + docxtemplaterFehlerBeschreiben(fehler).join('\n'),
    );
  }

  const dokumentXml = doc.getZip().file(DOCUMENT_XML_PFAD)?.asText();
  if (!dokumentXml) throw new WordExportFehler('Gerendertes Dokument enthält kein word/document.xml.');
  return absatztrennerInWordAbsaetzeUmwandeln(dokumentXml);
}

/**
 * Trennt den Body-Inhalt vom abschließenden `<w:sectPr>` (Seiteneinrichtung,
 * inkl. Kopf-/Fußzeilen-Referenzen) und liefert zusätzlich das originale
 * `<w:document ...>`-Öffnungstag der Vorlage mit allen dort deklarierten
 * XML-Namespaces (z. B. `xmlns:w14` für die von Word automatisch vergebenen
 * `w14:paraId`/`w14:textId`-Absatzattribute). Das sectPr wird beim
 * Sammeldokument nur einmal am Ende benötigt (spezifikation.md 5.6); da wir
 * dieselbe Original-Vorlagen-Zip (inkl. word/_rels, Header-/Footer-Teilen)
 * weiterverwenden, bleiben referenzierte Kopf-/Fußzeilen gültig.
 */
function trenneKoerperUndSectPr(
  dokumentXml: string,
): { koerperOhneSectPr: string; sectPr: string | null; wurzelOeffnendesTag: string } {
  const wurzelMatch = dokumentXml.match(/<w:document\b[^>]*>/);
  if (!wurzelMatch) {
    throw new WordExportFehler('Kein <w:document>-Wurzelelement im gerenderten Dokument gefunden – ist die Datei eine gültige .docx-Vorlage?');
  }
  const bodyMatch = dokumentXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) {
    throw new WordExportFehler('Kein <w:body> im gerenderten Dokument gefunden – ist die Datei eine gültige .docx-Vorlage?');
  }
  const wurzelOeffnendesTag = wurzelMatch[0];
  const bodyInhalt = bodyMatch[1];
  const startIndex = bodyInhalt.lastIndexOf('<w:sectPr');
  if (startIndex === -1) {
    return { koerperOhneSectPr: bodyInhalt.trim(), sectPr: null, wurzelOeffnendesTag };
  }
  const endeMarker = '</w:sectPr>';
  const endeIndex = bodyInhalt.indexOf(endeMarker, startIndex);
  if (endeIndex === -1) {
    return { koerperOhneSectPr: bodyInhalt.slice(0, startIndex).trim(), sectPr: null, wurzelOeffnendesTag };
  }
  const sectPr = bodyInhalt.slice(startIndex, endeIndex + endeMarker.length);
  const koerperOhneSectPr = (bodyInhalt.slice(0, startIndex) + bodyInhalt.slice(endeIndex + endeMarker.length)).trim();
  return { koerperOhneSectPr, sectPr, wurzelOeffnendesTag };
}

/**
 * Erzeugt einen Absatz, der ausschließlich Abschnittseigenschaften (sectPr)
 * in seiner pPr trägt – die reguläre OOXML-Konstruktion für einen
 * Abschnittswechsel zwischen zwei Schülern (statt eines einfachen
 * Zeilenumbruchs mit `w:br`). Ohne explizites `<w:type>` innerhalb des
 * sectPr ist der Standardwert laut ECMA-376 §17.6.22 „nextPage", der
 * Abschnittswechsel erzwingt also implizit einen Seitenumbruch. Da für jede
 * Person dasselbe Vorlagen-sectPr verwendet wird, bleiben Seiteneinrichtung
 * sowie Kopf-/Fußzeilen-Referenzen für alle Abschnitte identisch.
 */
function erzeugeAbschnittswechsel(sectPr: string): string {
  return `<w:p><w:pPr>${sectPr}</w:pPr></w:p>`;
}

/**
 * Baut das Word-Sammeldokument gemäß spezifikation.md 5.6: Für jeden
 * übergebenen Datenkontext (eine Instanz pro Schüler:in, in der bereits
 * vorgesehenen Klassenreihenfolge) wird die Vorlage einmal gerendert; die
 * Ergebnisse werden per direkter OOXML-Manipulation zu einem gemeinsamen
 * `document.xml` verkettet, getrennt durch einen Abschnittswechsel mit
 * Seitenumbruch (siehe `erzeugeAbschnittswechsel`) zwischen den
 * Schüler:innen, und in eine Kopie der ursprünglichen Vorlagen-Zip
 * zurückgeschrieben, damit Styles, Kopf-/Fußzeilen und Medien der Vorlage
 * erhalten bleiben.
 */
export function baueSammeldokument(templateBuffer: ArrayBuffer, datenkontexte: Record<string, string>[]): Uint8Array {
  if (datenkontexte.length === 0) {
    throw new WordExportFehler('Die Klasse enthält keine Schüler:innen – es gibt nichts zu exportieren.');
  }

  const koerperTeile: string[] = [];
  let sectPr: string | null = null;
  let wurzelOeffnendesTag: string | null = null;

  datenkontexte.forEach((kontext, index) => {
    const dokumentXml = rendereEinzelDokumentXml(templateBuffer, kontext);
    const {
      koerperOhneSectPr,
      sectPr: gefundenesSectPr,
      wurzelOeffnendesTag: gefundenesWurzelTag,
    } = trenneKoerperUndSectPr(dokumentXml);
    koerperTeile.push(koerperOhneSectPr);
    if (index === 0) {
      sectPr = gefundenesSectPr;
      wurzelOeffnendesTag = gefundenesWurzelTag;
    }
  });

  if (!sectPr || !wurzelOeffnendesTag) {
    throw new WordExportFehler(
      'Die Vorlage enthält keine gültige Abschnitts-/Seiteneinrichtung (sectPr). Bitte eine reguläre, in Word gespeicherte .docx-Datei als Vorlage verwenden.',
    );
  }

  const zusammengefuegterKoerper = koerperTeile.join(`\n${erzeugeAbschnittswechsel(sectPr)}\n`);
  const sammelDokumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${wurzelOeffnendesTag}\n  <w:body>\n    ${zusammengefuegterKoerper}\n    ${sectPr}\n  </w:body>\n</w:document>`;

  let ausgabeZip: PizZip;
  try {
    ausgabeZip = new PizZip(templateBuffer);
  } catch {
    throw new WordExportFehler('Die ausgewählte Datei ist keine gültige .docx-Datei (kein lesbares ZIP-Archiv).');
  }
  ausgabeZip.file(DOCUMENT_XML_PFAD, sammelDokumentXml);
  return ausgabeZip.generate({ type: 'uint8array' });
}
