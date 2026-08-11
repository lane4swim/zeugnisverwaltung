import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export class WordExportFehler extends Error {}

const SEITENUMBRUCH = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
const DOCUMENT_XML_PFAD = 'word/document.xml';

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
  return dokumentXml;
}

/**
 * Trennt den Body-Inhalt vom abschließenden `<w:sectPr>` (Seiteneinrichtung,
 * inkl. Kopf-/Fußzeilen-Referenzen). Das sectPr wird beim Sammeldokument nur
 * einmal am Ende benötigt (spezifikation.md 5.6); da wir dieselbe
 * Original-Vorlagen-Zip (inkl. word/_rels, Header-/Footer-Teilen)
 * weiterverwenden, bleiben referenzierte Kopf-/Fußzeilen gültig.
 */
function trenneKoerperUndSectPr(dokumentXml: string): { koerperOhneSectPr: string; sectPr: string | null } {
  const bodyMatch = dokumentXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) {
    throw new WordExportFehler('Kein <w:body> im gerenderten Dokument gefunden – ist die Datei eine gültige .docx-Vorlage?');
  }
  const bodyInhalt = bodyMatch[1];
  const startIndex = bodyInhalt.lastIndexOf('<w:sectPr');
  if (startIndex === -1) {
    return { koerperOhneSectPr: bodyInhalt.trim(), sectPr: null };
  }
  const endeMarker = '</w:sectPr>';
  const endeIndex = bodyInhalt.indexOf(endeMarker, startIndex);
  if (endeIndex === -1) {
    return { koerperOhneSectPr: bodyInhalt.slice(0, startIndex).trim(), sectPr: null };
  }
  const sectPr = bodyInhalt.slice(startIndex, endeIndex + endeMarker.length);
  const koerperOhneSectPr = (bodyInhalt.slice(0, startIndex) + bodyInhalt.slice(endeIndex + endeMarker.length)).trim();
  return { koerperOhneSectPr, sectPr };
}

/**
 * Baut das Word-Sammeldokument gemäß spezifikation.md 5.6: Für jeden
 * übergebenen Datenkontext (eine Instanz pro Schüler:in, in der bereits
 * vorgesehenen Klassenreihenfolge) wird die Vorlage einmal gerendert; die
 * Ergebnisse werden per direkter OOXML-Manipulation zu einem gemeinsamen
 * `document.xml` mit Seitenumbrüchen zwischen den Schüler:innen verkettet
 * und in eine Kopie der ursprünglichen Vorlagen-Zip zurückgeschrieben, damit
 * Styles, Kopf-/Fußzeilen und Medien der Vorlage erhalten bleiben.
 */
export function baueSammeldokument(templateBuffer: ArrayBuffer, datenkontexte: Record<string, string>[]): Uint8Array {
  if (datenkontexte.length === 0) {
    throw new WordExportFehler('Die Klasse enthält keine Schüler:innen – es gibt nichts zu exportieren.');
  }

  const koerperTeile: string[] = [];
  let sectPr: string | null = null;

  datenkontexte.forEach((kontext, index) => {
    const dokumentXml = rendereEinzelDokumentXml(templateBuffer, kontext);
    const { koerperOhneSectPr, sectPr: gefundenesSectPr } = trenneKoerperUndSectPr(dokumentXml);
    koerperTeile.push(koerperOhneSectPr);
    if (index === 0) sectPr = gefundenesSectPr;
  });

  if (!sectPr) {
    throw new WordExportFehler(
      'Die Vorlage enthält keine gültige Abschnitts-/Seiteneinrichtung (sectPr). Bitte eine reguläre, in Word gespeicherte .docx-Datei als Vorlage verwenden.',
    );
  }

  const zusammengefuegterKoerper = koerperTeile.join(`\n${SEITENUMBRUCH}\n`);
  const sammelDokumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n  <w:body>\n    ${zusammengefuegterKoerper}\n    ${sectPr}\n  </w:body>\n</w:document>`;

  let ausgabeZip: PizZip;
  try {
    ausgabeZip = new PizZip(templateBuffer);
  } catch {
    throw new WordExportFehler('Die ausgewählte Datei ist keine gültige .docx-Datei (kein lesbares ZIP-Archiv).');
  }
  ausgabeZip.file(DOCUMENT_XML_PFAD, sammelDokumentXml);
  return ausgabeZip.generate({ type: 'uint8array' });
}
