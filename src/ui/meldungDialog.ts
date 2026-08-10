import { escapeHtml } from './bestaetigungsDialog';

export function meldungAnzeigen(titel: string, punkte: string[]): Promise<void> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'meldung-titel');
    dialog.setAttribute('role', 'alertdialog');
    dialog.innerHTML = `
      <div class="dialog-inhalt">
        <h2 id="meldung-titel">${escapeHtml(titel)}</h2>
        <ul>${punkte.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        <div class="dialog-aktionen">
          <button type="button" data-aktion="ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    const schliessen = () => {
      dialog.close();
      dialog.remove();
      resolve();
    };
    dialog.querySelector('[data-aktion="ok"]')?.addEventListener('click', schliessen);
    dialog.addEventListener('cancel', schliessen);
    dialog.showModal();
  });
}
