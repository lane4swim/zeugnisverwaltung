// Technik-Spike für den Word-Sammeldokument-Merge (spezifikation.md 5.6, 8 Phase 1).
//
// Zweck: Frühzeitig (parallel zu Phase 1/2) nachweisen, dass sich mehrere
// mit docxtemplater gerenderte Einzelzeugnisse per direkter OOXML-Manipulation
// über pizzip zu EINEM Sammeldokument mit Seitenumbrüchen verketten lassen –
// bevor der volle Word-Export in Phase 6 gebaut wird. Läuft isoliert von der
// eigentlichen App (kein Browser, reines Node-Skript) und erzeugt ein
// Test-Template zur Laufzeit, damit kein Binär-Template im Repo liegen muss.
//
// Aufruf: npm run spike:word-merge

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const AUSGABE_ORDNER = path.join(HIER, 'output');

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`;

const CORE_PROPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Zeugnis-Sammeldokument (Technik-Spike)</dc:title>
</cp:coreProperties>`;

const APP_PROPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Zeugnisverwaltung Technik-Spike</Application>
</Properties>`;

// Platzhalter in doppelten geschweiften Klammern gemäß spezifikation.md 6.1.
// sectPr am Ende des body definiert die Seiteneigenschaften des (einzigen)
// Abschnitts und wird beim Merge nur einmal am Ende des Gesamtdokuments benötigt.
const SECT_PR = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';

function erzeugeTemplateDocumentXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>Zeugnis für {{Vorname}} {{Nachname}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Geburtsdatum: {{Geburtsdatum}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Bereich Lesen: {{Bereich_lesen}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Bemerkungen: {{Bemerkungen}}</w:t></w:r></w:p>
    ${SECT_PR}
  </w:body>
</w:document>`;
}

function erzeugeTemplateZip() {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('_rels/.rels', RELS);
  zip.file('docProps/core.xml', CORE_PROPS);
  zip.file('docProps/app.xml', APP_PROPS);
  zip.file('word/_rels/document.xml.rels', DOCUMENT_RELS);
  zip.file('word/styles.xml', STYLES);
  zip.file('word/document.xml', erzeugeTemplateDocumentXml());
  return zip;
}

function rendereEinzeldokument(daten) {
  const zip = erzeugeTemplateZip();
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(daten);
  return doc.getZip().file('word/document.xml').asText();
}

/** Extrahiert den Inhalt von <w:body>…</w:body> ohne das abschließende <w:sectPr>. */
function koerperOhneSectPr(documentXml) {
  const bodyMatch = documentXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) throw new Error('Kein <w:body> im gerenderten Dokument gefunden.');
  return bodyMatch[1].replace(/<w:sectPr>[\s\S]*?<\/w:sectPr>/, '').trim();
}

const SEITENUMBRUCH = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

/**
 * Verkettet mehrere gerenderte Einzeldokumente zu einem Sammeldokument,
 * getrennt durch Seitenumbrüche, mit genau einem abschließenden sectPr
 * (spezifikation.md 5.6).
 */
function verketteZuSammeldokument(dokumentXmlListe) {
  const koerperTeile = dokumentXmlListe.map(koerperOhneSectPr);
  const zusammengefuegterKoerper = koerperTeile.join(`\n${SEITENUMBRUCH}\n`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${zusammengefuegterKoerper}
    ${SECT_PR}
  </w:body>
</w:document>`;
}

function baueSammelDocx(sammelDocumentXml) {
  const zip = erzeugeTemplateZip();
  zip.file('word/document.xml', sammelDocumentXml);
  return zip.generate({ type: 'nodebuffer' });
}

/** Lädt das erzeugte .docx erneut über docxtemplater, um Wohlgeformtheit zu prüfen. */
function pruefeWohlgeformtheit(buffer) {
  const zip = new PizZip(buffer);
  // Wirft bei ungültigem XML/Template eine Docxtemplater-Fehlermeldung.
  new Docxtemplater(zip, { delimiters: { start: '{{', end: '}}' } });
}

async function main() {
  const testSchueler = [
    { Vorname: 'Anna', Nachname: 'Müster', Geburtsdatum: '14.03.2017', Bereich_lesen: 'Anna entnimmt altersgemäßen Texten die wesentlichen Informationen.', Bemerkungen: 'Anna zeigt sich hilfsbereit.' },
    { Vorname: 'Ben', Nachname: 'Özlü', Geburtsdatum: '01.06.2017', Bereich_lesen: 'Ben entnimmt einfachen Texten erste Informationen.', Bemerkungen: 'Ben arbeitet konzentriert.' },
    { Vorname: 'Çağla', Nachname: 'Weiß', Geburtsdatum: '22.11.2016', Bereich_lesen: 'Çağla liest sehr sicher & flüssig – auch "schwierige" Wörter.', Bemerkungen: '' },
  ];

  console.log(`Rendere ${testSchueler.length} Testvorlagen-Instanzen…`);
  const gerenderteDokumente = testSchueler.map(rendereEinzeldokument);

  console.log('Verkette Einzeldokumente zu einem Sammeldokument mit Seitenumbrüchen…');
  const sammelXml = verketteZuSammeldokument(gerenderteDokumente);
  const sammelBuffer = baueSammelDocx(sammelXml);

  console.log('Prüfe Wohlgeformtheit des erzeugten .docx über einen erneuten Docxtemplater-Ladevorgang…');
  pruefeWohlgeformtheit(sammelBuffer);

  const seitenumbrueche = (sammelXml.match(/<w:br w:type="page"\/>/g) ?? []).length;
  const sectPrAnzahl = (sammelXml.match(/<w:sectPr>/g) ?? []).length;
  const namenGefunden = testSchueler.every((s) => sammelXml.includes(`${s.Vorname} ${s.Nachname}`));
  const sonderzeichenErhalten = sammelXml.includes('Çağla') && sammelXml.includes('&amp;') && sammelXml.includes('&quot;schwierige&quot;');

  console.log('--- Validierungsergebnis (spezifikation.md 8, Phase 1) ---');
  console.log(`Anzahl Testdokumente: ${testSchueler.length}`);
  console.log(`Seitenumbrüche gefunden: ${seitenumbrueche} (erwartet: ${testSchueler.length - 1})`);
  console.log(`Genau ein sectPr am Dokumentende: ${sectPrAnzahl === 1}`);
  console.log(`Alle Schülernamen im Sammeldokument vorhanden: ${namenGefunden}`);
  console.log(`Sonderzeichen/Umlaute/XML-Escaping korrekt erhalten: ${sonderzeichenErhalten}`);
  console.log('.docx erneut ladbar ohne Docxtemplater-Fehler: true');

  const erfolgreich =
    seitenumbrueche === testSchueler.length - 1 && sectPrAnzahl === 1 && namenGefunden && sonderzeichenErhalten;

  await mkdir(AUSGABE_ORDNER, { recursive: true });
  const ausgabePfad = path.join(AUSGABE_ORDNER, 'sammelzeugnis-spike.docx');
  await writeFile(ausgabePfad, sammelBuffer);
  console.log(`Sammeldokument geschrieben nach: ${ausgabePfad}`);

  if (!erfolgreich) {
    console.error('SPIKE FEHLGESCHLAGEN: Validierungskriterien nicht erfüllt.');
    process.exitCode = 1;
    return;
  }
  console.log('SPIKE ERFOLGREICH: Ansatz aus spezifikation.md 5.6 ist technisch tragfähig.');
}

main().catch((fehler) => {
  console.error('SPIKE FEHLGESCHLAGEN mit Fehler:', fehler);
  process.exitCode = 1;
});
