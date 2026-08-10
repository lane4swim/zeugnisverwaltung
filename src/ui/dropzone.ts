/**
 * Import-Zone gemäß spezifikation.md 5.5 (Drag & Drop). Zusätzlich ein
 * klassischer Datei-Auswahl-Button, da Drag & Drop allein nicht
 * tastaturbedienbar ist (Barrierefreiheit, siehe spezifikation.md 7/8).
 */
export function erstelleDropzone(optionen: { beschriftung: string; onDatei: (datei: File) => void }): HTMLElement {
  const wurzel = document.createElement('div');
  wurzel.className = 'dropzone';
  wurzel.innerHTML = `
    <p>${optionen.beschriftung}</p>
    <p>Datei per Drag &amp; Drop hier ablegen oder</p>
    <button type="button" data-aktion="datei-waehlen">Datei auswählen…</button>
    <input type="file" accept="application/json,.json" class="sr-only" tabindex="-1" aria-hidden="true" />
  `;

  const dateiEingabe = wurzel.querySelector('input[type="file"]') as HTMLInputElement;

  wurzel.querySelector('[data-aktion="datei-waehlen"]')?.addEventListener('click', () => dateiEingabe.click());
  dateiEingabe.addEventListener('change', () => {
    const datei = dateiEingabe.files?.[0];
    if (datei) optionen.onDatei(datei);
    dateiEingabe.value = '';
  });

  let dragZaehler = 0;
  wurzel.addEventListener('dragenter', (ereignis) => {
    ereignis.preventDefault();
    dragZaehler += 1;
    wurzel.classList.add('aktiv');
  });
  wurzel.addEventListener('dragover', (ereignis) => {
    ereignis.preventDefault();
  });
  wurzel.addEventListener('dragleave', () => {
    dragZaehler = Math.max(0, dragZaehler - 1);
    if (dragZaehler === 0) wurzel.classList.remove('aktiv');
  });
  wurzel.addEventListener('drop', (ereignis) => {
    ereignis.preventDefault();
    dragZaehler = 0;
    wurzel.classList.remove('aktiv');
    const datei = ereignis.dataTransfer?.files?.[0];
    if (datei) optionen.onDatei(datei);
  });

  return wurzel;
}
