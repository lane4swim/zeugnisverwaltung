import type { KompetenzDatei } from '../types';
import type { Versionskonflikte } from '../services/versionskonflikt';
import { findeKompetenz } from '../utils/kompetenzstruktur';
import { escapeHtml } from './bestaetigungsDialog';

/**
 * Zeigt die in spezifikation.md 4.1 geforderte Warnung bei entfallenen
 * Kompetenz-IDs oder geänderter Stufenanzahl vor der Übernahme einer neu
 * geladenen Kompetenzdatei-Version an.
 */
export function konfliktDialogOeffnen(optionen: {
  alteDatei: KompetenzDatei | null;
  neueVersion: string;
  konflikte: Versionskonflikte;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'konflikt-titel');
    dialog.setAttribute('role', 'alertdialog');

    const entfalleneHtml = optionen.konflikte.entfalleneKompetenzen
      .map((e) => {
        const titel = optionen.alteDatei ? findeKompetenz(optionen.alteDatei, e.kompetenzId)?.kompetenz.titel : null;
        const namen = e.betroffeneSchueler.map((s) => `${s.vorname} ${s.nachname}`).join(', ');
        return `<li><strong>${escapeHtml(titel ?? e.kompetenzId)}</strong> gibt es in der neuen Version nicht mehr. Betroffen: ${escapeHtml(namen)}.</li>`;
      })
      .join('');

    const geaenderteHtml = optionen.konflikte.geaenderteStufenanzahl
      .map((g) => {
        const titel = findeKompetenz(
          // Titel existiert in beiden Versionen weiterhin, alte Datei reicht als Quelle
          optionen.alteDatei as KompetenzDatei,
          g.kompetenzId,
        )?.kompetenz.titel;
        const namen = g.betroffeneSchueler.map((b) => `${b.schueler.vorname} ${b.schueler.nachname} (bisher Stufe ${b.bisherigeStufe})`).join(', ');
        return `<li><strong>${escapeHtml(titel ?? g.kompetenzId)}</strong> hat jetzt nur noch ${g.neueStufenanzahl} Stufe(n). Betroffen: ${escapeHtml(namen)}.</li>`;
      })
      .join('');

    dialog.innerHTML = `
      <div class="dialog-inhalt">
        <h2 id="konflikt-titel">Versionskonflikt bei Kompetenzdatei-Update</h2>
        <p>
          Die neue Version „${escapeHtml(optionen.neueVersion)}" weicht so von der bisherigen ab, dass
          vorhandene Bewertungen betroffen sind. Diese Bewertungen bleiben im Datensatz erhalten und
          werden in der Bewertungsansicht als veraltet markiert, bis sie manuell geprüft werden.
        </p>
        ${entfalleneHtml ? `<h3>Entfallene Kompetenzen</h3><ul>${entfalleneHtml}</ul>` : ''}
        ${geaenderteHtml ? `<h3>Geänderte Stufenanzahl</h3><ul>${geaenderteHtml}</ul>` : ''}
        <div class="dialog-aktionen">
          <button type="button" class="sekundaer" data-aktion="abbrechen">Abbrechen (bisherige Version behalten)</button>
          <button type="button" data-aktion="uebernehmen">Trotzdem übernehmen</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    const schliessen = (ergebnis: boolean) => {
      dialog.close();
      dialog.remove();
      resolve(ergebnis);
    };
    dialog.querySelector('[data-aktion="abbrechen"]')?.addEventListener('click', () => schliessen(false));
    dialog.querySelector('[data-aktion="uebernehmen"]')?.addEventListener('click', () => schliessen(true));
    dialog.addEventListener('cancel', () => schliessen(false));

    dialog.showModal();
  });
}
