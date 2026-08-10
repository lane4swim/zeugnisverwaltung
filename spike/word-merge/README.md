# Technik-Spike: Word-Sammeldokument-Merge

Isolierter Prototyp (kein Browser, reines Node-Skript) für den in
`spezifikation.md` Abschnitt 5.6 beschriebenen Ansatz: mehrere mit
`docxtemplater` gerenderte Einzelzeugnisse werden per direkter
OOXML-Manipulation über `pizzip` zu **einem** Sammeldokument mit
Seitenumbrüchen verkettet.

Der Spike erzeugt sein Test-Template zur Laufzeit selbst (kein Binär-Template
im Repo nötig) und prüft:

- Anzahl der Seitenumbrüche (`n - 1` bei `n` Schüler:innen),
- genau ein abschließendes `sectPr` im Sammeldokument (nicht pro Schüler:in),
- korrekte Übernahme aller Platzhalter-Werte,
- korrektes XML-Escaping von Sonderzeichen/Umlauten,
- Wohlgeformtheit der erzeugten `.docx`, indem sie erneut über
  `Docxtemplater`/`pizzip` geladen wird.

## Ausführen

```bash
npm run spike:word-merge
```

Das Ergebnis wird nach `spike/word-merge/output/sammelzeugnis-spike.docx`
geschrieben (nicht versioniert, siehe `.gitignore`) und kann manuell in Word
geöffnet werden, um das Ergebnis visuell zu prüfen.

## Ergebnis

Der Ansatz aus spezifikation.md 5.6 ist technisch tragfähig; alle
Validierungskriterien werden erfüllt. Eine automatisierte Öffnungsprüfung mit
LibreOffice war in der Entwicklungs-Sandbox nicht möglich (headless `soffice`
scheitert dort bereits am Laden einer reinen Textdatei – eine
Umgebungseinschränkung, kein Befund zum erzeugten Dokument). Vor dem Bau des
vollständigen Word-Exports in Phase 6 empfiehlt sich daher ein manueller
Öffnungstest in echtem Word/LibreOffice auf einem Rechner ohne diese
Einschränkung.
