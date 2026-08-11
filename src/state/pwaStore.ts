interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Listener = () => void;

/**
 * Bündelt den PWA-Lebenszyklus (spezifikation.md 8 Phase 7:
 * Installierbarkeit, vollständiges Offline-Verhalten): Service-Worker-
 * Update-Erkennung, „App ist jetzt offline nutzbar"-Rückmeldung und ein
 * explizites Installations-Angebot statt sich nur auf den impliziten
 * Browser-Mechanismus zu verlassen.
 */
class PwaStore {
  updateVerfuegbar = false;
  offlineBereit = false;
  installierbar = false;

  private updateSwFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
  private installPromptEreignis: BeforeInstallPromptEvent | null = null;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  async init(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const { registerSW } = await import('virtual:pwa-register');
        this.updateSwFn = registerSW({
          immediate: true,
          onNeedRefresh: () => {
            this.updateVerfuegbar = true;
            this.notify();
          },
          onOfflineReady: () => {
            this.offlineBereit = true;
            this.notify();
          },
        });
      } catch {
        // PWA-Registrierung ist optional; App funktioniert auch ohne (z. B. reines `vite preview`).
      }
    }

    window.addEventListener('beforeinstallprompt', (ereignis) => {
      ereignis.preventDefault();
      this.installPromptEreignis = ereignis as BeforeInstallPromptEvent;
      this.installierbar = true;
      this.notify();
    });
    window.addEventListener('appinstalled', () => {
      this.installPromptEreignis = null;
      this.installierbar = false;
      this.notify();
    });
  }

  async jetztAktualisieren(): Promise<void> {
    if (this.updateSwFn) await this.updateSwFn(true);
  }

  async jetztInstallieren(): Promise<void> {
    if (!this.installPromptEreignis) return;
    await this.installPromptEreignis.prompt();
    await this.installPromptEreignis.userChoice;
    this.installPromptEreignis = null;
    this.installierbar = false;
    this.notify();
  }

  blendeOfflineHinweisAus(): void {
    this.offlineBereit = false;
    this.notify();
  }
}

export const pwaStore = new PwaStore();
