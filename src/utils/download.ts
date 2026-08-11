/** Löst einen Browser-Download für beliebigen Inhalt aus (kein Serverkontakt, siehe spezifikation.md 1.2). */
export function loeseDateiDownloadAus(inhalt: BlobPart | Uint8Array<ArrayBufferLike>, dateiname: string, mimeType: string): void {
  // Uint8Array<ArrayBufferLike> (z. B. von PizZip.generate) ist zur Laufzeit
  // ein gültiger Blob-Baustein; nur die DOM-Typdefinitionen sind hier strenger.
  const blob = new Blob([inhalt as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = dateiname;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
