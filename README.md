# Zeugnisverwaltung

Lokale Zeugnisverwaltung für NRW-Grundschulen. Alle Details zu Anforderungen,
Datenmodell und Implementierungsplan stehen in [`spezifikation.md`](./spezifikation.md).

## Entwicklung

```bash
npm install
npm run dev       # Entwicklungsserver
npm run build     # Produktions-Build (dist/)
npm run preview   # Produktions-Build lokal ansehen
```

## Livetest im Browser (ohne Entwicklungsumgebung)

Der Ordner [`dist/`](./dist) enthält einen fertig gebauten, transpilierten
Stand der App (aktuell: Ende Phase 1) und ist bewusst mit ins Repository
eingecheckt, damit er sich ohne `npm install`/Build-Schritt testen lässt.

**Wichtig:** `dist/index.html` per Doppelklick öffnen (`file://…`)
funktioniert **nicht** – Browser blockieren ES-Module-Skripte unter dem
`file://`-Protokoll aus Sicherheitsgründen. Stattdessen `dist/` über einen
einfachen lokalen Server bereitstellen, z. B.:

```bash
npx serve dist
# oder
python3 -m http.server -d dist 8080
```

und die ausgegebene Adresse (z. B. http://localhost:3000) im Browser öffnen.

Der `dist/`-Ordner wird nicht automatisch aktuell gehalten – nach jeder
Code-Änderung vor dem Livetest `npm run build` erneut ausführen.

## Technik-Spike: Word-Sammeldokument-Merge

Siehe [`spike/word-merge/README.md`](./spike/word-merge/README.md).

```bash
npm run spike:word-merge
```
