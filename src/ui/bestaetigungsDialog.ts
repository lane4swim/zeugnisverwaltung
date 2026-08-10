/**
 * Wiederverwendbarer, per Tastatur bedienbarer Bestätigungsdialog auf Basis
 * des nativen <dialog>-Elements (Fokus-Handling/ESC werden vom Browser
 * bereitgestellt, siehe spezifikation.md 7 Barrierefreiheit).
 */
export function bestaetigen(optionen: {
  titel: string;
  beschreibung: string;
  bestaetigenText?: string;
  abbrechenText?: string;
  gefahr?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'bestaetigung-titel');
    dialog.innerHTML = `
      <div class="dialog-inhalt">
        <h2 id="bestaetigung-titel">${escapeHtml(optionen.titel)}</h2>
        <p>${escapeHtml(optionen.beschreibung)}</p>
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">${escapeHtml(optionen.abbrechenText ?? 'Abbrechen')}</button>
          <button type="button" class="${optionen.gefahr ? 'gefahr' : ''}" data-aktion="bestaetigen">${escapeHtml(optionen.bestaetigenText ?? 'Bestätigen')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    const schliessenMit = (ergebnis: boolean) => {
      dialog.close();
      dialog.remove();
      resolve(ergebnis);
    };

    dialog.querySelector('[data-aktion="abbrechen"]')?.addEventListener('click', () => schliessenMit(false));
    dialog.querySelector('[data-aktion="bestaetigen"]')?.addEventListener('click', () => schliessenMit(true));
    dialog.addEventListener('cancel', () => schliessenMit(false));

    dialog.showModal();
  });
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
