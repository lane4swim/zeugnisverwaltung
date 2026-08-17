# Zeugnisverwaltungsapp – Spezifikation & Implementierungsplan

**Zielgruppe:** Grundschulen in Nordrhein-Westfalen
**Architektur:** Progressive Web App (PWA), Single Page Application (SPA)
**Kernprinzip:** Schülerbezogene Daten verlassen niemals den lokalen Rechner

---

## 1. Ziele und Rahmenbedingungen

### 1.1 Zweck
Lehrkräfte an NRW-Grundschulen bewerten Schüler:innen je definierter Kompetenz auf einer variablen Stufenskala. Aus diesen Bewertungen generiert die App automatisch Zeugnistexte auf Basis vordefinierter Satzbausteine und fügt diese in eine vom Nutzer bereitgestellte Word-Vorlage ein.

### 1.2 Zentrale Rahmenbedingung: Datenschutz
- **Keine Verarbeitung oder Speicherung von Schülerdaten auf einem Server.** Alle personenbezogenen Daten (Klassenliste, Bewertungen, generierte Texte, Bemerkungen) verbleiben ausschließlich im Browser des Anwenders (lokaler Speicher / Dateisystem über explizite Nutzeraktion).
- Die App darf **keine Netzwerkaufrufe mit Schüler- oder Bewertungsdaten** durchführen. Es dürfen keine Analytics-, Tracking- oder Fehlerberichts-Dienste eingebunden werden, die Nutzdaten übertragen.
- Einzige zulässige Server-Kommunikation: der **initiale/aktualisierte Download der Kompetenz- und Bausteindatei** je Halbjahr (siehe 4) – diese enthält keine personenbezogenen Daten, sondern nur Vorlagen/Konfiguration.
- Die App muss auch **vollständig offline** nutzbar sein, nachdem sie einmal geladen und die passende Kompetenzdatei bezogen wurde (PWA-Anforderung, Service Worker Caching).
- Das Word-Template wird **nicht** von der App vorgehalten, sondern vom Nutzer unmittelbar vor dem Export lokal ausgewählt (siehe 5.6) – auch hier findet kein Serverkontakt statt.
- Bezug zu NRW: Kompetenzraster orientieren sich an den Kernlehrplänen NRW für die Grundschule (Fächer, Kompetenzbereiche); die Zuordnung ist über die austauschbare, halbjahresspezifische Kompetenzdatei konfigurierbar und nicht hart codiert.

### 1.3 Nicht-Ziele (explizit ausgeschlossen)
- Keine Mehrbenutzer-/Cloud-Synchronisation.
- Keine serverseitige Nutzerkontenverwaltung.
- Keine automatische Notenberechnung im Sinne von Ziffernnoten (Fokus: Kompetenzraster/Berichtszeugnis, wie in NRW-Grundschulen üblich).
- Keine Berücksichtigung der Geschlechtsangabe „divers" bei der Pronomenwahl (siehe 3.1, 6.2).
- Keine dauerhafte Verwaltung mehrerer Word-Vorlagen innerhalb der App.

---

## 2. Architekturüberblick

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│                                                           │
│  ┌───────────────┐   ┌────────────────┐   ┌───────────┐ │
│  │   SPA UI       │   │  App-Zustand    │   │ Service   │ │
│  │ (Views/Router) │◄─►│ (State Store)   │   │ Worker    │ │
│  └───────────────┘   └────────────────┘   │ (Offline- │ │
│         │                     │            │  Cache)   │ │
│         ▼                     ▼            └───────────┘ │
│  ┌───────────────┐   ┌────────────────┐                 │
│  │ Textgenerator- │   │  Persistenz-    │                 │
│  │ Engine         │   │  schicht        │                 │
│  │ (Platzhalter-  │   │  (IndexedDB,    │                 │
│  │  Ersetzung)    │   │  1 Klasse/HJ)   │                 │
│  └───────────────┘   └────────────────┘                 │
│         │                     │                          │
│         ▼                     ▼                          │
│  ┌───────────────┐   ┌────────────────┐                 │
│  │ Word-Merge-    │   │ JSON Import/   │                 │
│  │ Modul (docx,   │   │ Export (Drag & │                 │
│  │ Template erst  │   │ Drop)          │                 │
│  │ bei Export     │   └────────────────┘                 │
│  │ ausgewählt)    │                                       │
│  └───────────────┘                                       │
└─────────────────────────────────────────────────────────┘
                        │ nur beim Erststart /
                        │ manuellem Update, je Halbjahr
                        ▼
          ┌─────────────────────────────┐
          │ Server: statische Dateien    │
          │ je Halbjahr (1.1, 1.2, 2.1,  │
          │ 2.2, 3.1, 3.2, 4.1, 4.2):    │
          │ Kompetenzen, Stufen,         │
          │ Satzbausteine, Bemerkungen   │
          │  – KEINE Schülerdaten        │
          └─────────────────────────────┘
```

### 2.1 Tech-Stack-Vorschlag
| Bereich | Empfehlung | Begründung |
|---|---|---|
| UI-Framework | Vanilla JS + Web Components, alternativ leichtgewichtig Svelte oder Preact | Kleine Bundle-Größe, gut PWA-tauglich, kein schwerer Server-Build nötig |
| Persistenz | IndexedDB (über Wrapper wie `idb`) | localStorage zu klein/synchron für ggf. große Klassendatensätze inkl. generierter Texte |
| PWA | Web App Manifest + Service Worker (Cache-first für App-Shell, Stale-while-revalidate für Kompetenzdatei) | Offlinefähigkeit, Installierbarkeit |
| Word-Verarbeitung | `docxtemplater` + `pizzip` (rein clientseitig, kein Upload) | Etablierte Bibliotheken zur Platzhalter-Ersetzung und zum programmatischen Zusammenbau von .docx-Dateien, laufen vollständig im Browser |
| JSON Import/Export | native File API + Drag&Drop-Events | Kein Server-Roundtrip nötig |
| Build | Vite (nur als Entwicklungswerkzeug, Ergebnis ist statisches Bundle) | Keine Laufzeitabhängigkeit von einem Server |

---

## 3. Datenmodell

### 3.1 Schüler (lokal, Klassenliste)
```json
{
  "id": "uuid",
  "nachname": "Muster",
  "vorname": "Anna",
  "geburtsdatum": "2017-03-14",
  "geschlecht": "w"   // "w" | "m" – steuert Pronomenwahl; "divers" wird nicht unterstützt
}
```

### 3.2 Klassen-/Halbjahresdatensatz
Ein Datensatz repräsentiert **genau eine Klasse in genau einem Halbjahr** (z. B. „4.1", „1.2"). Für ein neues Halbjahr oder eine neue Klasse wird ein neuer, eigenständiger Datensatz angelegt. Ein Wechsel zwischen Halbjahren erfolgt über getrenntes Öffnen/Importieren der jeweiligen JSON-Datei (siehe 3.6) – es gibt **keine** parallele Verwaltung mehrerer Klassen/Halbjahre innerhalb eines Datensatzes.

Für den Übergang von einem Halbjahr zum nächsten kann optional eine „Übernehmen"-Funktion angeboten werden, die die Klassenliste (Schülerstammdaten) in einen neuen, leeren Datensatz des Folgehalbjahres kopiert, jedoch **nicht** die Bewertungen, Texte oder Bemerkungen (diese sind halbjahresspezifisch, da sich auch die Kompetenzdatei ändert).

### 3.3 Kompetenzstruktur (serverseitige, nicht-personenbezogene Datei, je Halbjahr)
Für jedes Halbjahr (1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2) existiert eine **eigene** Kompetenzdatei, da sich Kompetenzen, Stufenbeschreibungen und Bausteine zwischen den Halbjahren unterscheiden.

Hierarchie: **Abschnitt → Bereich → Kompetenz → Stufe → Satzbausteine**

```json
{
  "halbjahr": "4.1",
  "version": "2026-1",
  "abschnitte": [
    {
      "id": "deutsch",
      "titel": "Deutsch",
      "bereiche": [
        {
          "id": "lesen",
          "titel": "Lesen",
          "kompetenzen": [
            {
              "id": "lesen_sinnentnehmend",
              "titel": "Sinnentnehmendes Lesen",
              "stufen": [
                {
                  "stufe": 1,
                  "bezeichnung": "beginnend",
                  "satzbausteine": [
                    "{Vorname} entnimmt einfachen Texten erste Informationen."
                  ]
                },
                {
                  "stufe": 2,
                  "bezeichnung": "grundlegend",
                  "satzbausteine": [
                    "{Vorname} entnimmt altersgemäßen Texten die wesentlichen Informationen."
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "religion",
      "titel": "Religion",
      "optional": true,
      "nichtRelevantBemerkung": "{Vorname} nahm nicht am Religionsunterricht teil.",
      "bereiche": [ /* wie oben, Struktur Bereich → Kompetenz → Stufe */ ]
    }
  ],
  "bemerkungsbausteine": [
    { "id": "bem_hilfsbereit", "text": "{Vorname} zeigt sich {Pronomen_Poss_en} Mitschüler:innen gegenüber hilfsbereit." }
  ]
}
```

Hinweise:
- Ein **Abschnitt entspricht einem Schulfach** (z. B. „Deutsch", „Mathematik", „Religion"). Ein Abschnitt kann optional als `"optional": true` markiert werden, wenn das Fach nicht für jede Person zutrifft (z. B. Religion, falls konfessionell gebunden angeboten). Fehlt das Feld, gilt das Fach als für alle Schüler:innen verpflichtend. Die Markierung erfolgt auf Fachebene in der (nicht-personenbezogenen) Kompetenzdatei; welche Person das Fach konkret nicht besucht, wird getrennt davon je Schüler:in im Klassendatensatz vermerkt (siehe 3.7, 5.1, 5.2).
- Nur bei `optional: true` wirksam: `nichtRelevantBemerkung` hinterlegt eine **benutzerdefinierte Bemerkungsvorlage** (gleiche Platzhaltersyntax wie Bemerkungsbausteine, z. B. `"{Vorname} nahm nicht am Religionsunterricht teil."`), die automatisch in die Bemerkungen (3.6) einer Person übernommen wird, sobald dieses Fach für sie als „nicht relevant" markiert wird, und beim Zurücknehmen der Markierung wieder daraus entfernt wird (siehe 3.7). Ist das Feld nicht gesetzt, wird beim Markieren keine Bemerkung ergänzt.
- Die **Anzahl der Stufen ist pro Kompetenz variabel** (kein festes Enum, sondern Array beliebiger Länge).
- Pro Stufe können **mehrere alternative Satzbausteine** hinterlegt sein (zur sprachlichen Variation, damit nicht alle Zeugnisse einer Klasse identisch klingen). Bei Erstgenerierung wählt die App automatisch **zufällig** einen Baustein aus den verfügbaren Alternativen der aktuellen Stufe. Der Anwender kann diese Auswahl über eine „Würfeln"/„Alternative anzeigen"-Steuerung (z. B. Icon-Button neben dem generierten Text) erneut zufällig neu ziehen lassen, solange der Text nicht manuell gesperrt ist (siehe 3.5); der zuletzt gewählte Index wird in `gewaehlterBausteinIndex` (3.4) persistiert, damit derselbe Baustein bei erneutem Öffnen erhalten bleibt.
- Das Feld `halbjahr` dient der Konsistenzprüfung: Die App lädt beim Öffnen eines Klassendatensatzes automatisch die zum hinterlegten Halbjahr passende Kompetenzdatei.
- Platzhaltersyntax siehe Abschnitt 6.

### 3.4 Bewertung je Schüler je Kompetenz (lokal)
```json
{
  "schuelerId": "uuid",
  "kompetenzId": "lesen_sinnentnehmend",
  "stufe": 2,
  "bewertetAm": "2026-06-10T10:00:00",
  "gewaehlterBausteinIndex": 0,
  "auspraegungen": [2]
}
```
- `auspraegungen`: Enthält der Text des per `gewaehlterBausteinIndex` referenzierten Satzbausteins Auswahlgruppen (siehe 6.3, z. B. `"{Vorname} erfasst den Inhalt altersgemäßer Texte {weitgehend sicher|sicher|sehr sicher}."`), die je Auswahlgruppe gewählten Options-Indizes, in der Reihenfolge der Auswahlgruppen im Text (im Beispiel: Index 2 → „sehr sicher"). Fehlt ein Index für eine Gruppe, gilt automatisch deren erste Option. Satzbausteine ohne Auswahlgruppen benötigen ein leeres Array. Da sich `gewaehlterBausteinIndex` bei „Neu würfeln" oder einer neuen Stufenauswahl ändert, wird `auspraegungen` in diesen Fällen zurückgesetzt (siehe 6.3).

### 3.5 Bewertungstext je Schüler je Kompetenz/Bereich (lokal)
```json
{
  "schuelerId": "uuid",
  "kompetenzId": "lesen_sinnentnehmend",
  "generierterText": "Anna entnimmt altersgemäßen Texten die wesentlichen Informationen.",
  "manuellerText": null,
  "gesperrt": false
}
```
- Solange `manuellerText == null` ⇒ `gesperrt = false`, Bewertung kann geändert werden, Text wird bei jeder Stufenänderung neu generiert.
- Sobald der Anwender den Text manuell editiert ⇒ `manuellerText` wird gesetzt, `gesperrt = true`. Die Bewertungs-UI für diese Kompetenz wird schreibgeschützt (read-only, visuell hervorgehoben, z. B. Schloss-Icon).
- Ein expliziter „Zurücksetzen"-Button setzt `manuellerText = null`, `gesperrt = false` und generiert den Text neu aus der aktuellen Stufe.

### 3.6 Bemerkungen je Schüler (lokal)
```json
{
  "schuelerId": "uuid",
  "ausgewaehlteBemerkungen": ["bem_hilfsbereit", "bem_konzentriert"],
  "auspraegungen": { "bem_schwimmabzeichen": [0, 2] }
}
```
- `auspraegungen`: Für Bemerkungsbausteine, deren Text Auswahlgruppen enthält (siehe 6.3, z. B. `"{Vorname} erwarb {schulisch|außerschulisch} das Schwimmabzeichen in {Bronze|Silber|Gold}."`), je Baustein-ID die gewählten Options-Indizes, in der Reihenfolge der Auswahlgruppen im Text (im Beispiel: Index 0 → „schulisch", Index 2 → „Gold"). Fehlt ein Eintrag oder ein Index für eine Gruppe, gilt automatisch deren erste Option. Bausteine ohne Auswahlgruppen benötigen keinen Eintrag.

### 3.7 Nicht relevante Fächer je Schüler (lokal)
Vermerkt je Schüler:in, welche als `optional` markierten Fächer (siehe 3.3) für diese Person nicht zutreffen (z. B. Religion):
```json
{
  "schuelerId": "uuid",
  "abschnittIds": ["religion"]
}
```
- Nur für Fächer relevant, die in der Kompetenzdatei als `optional: true` markiert sind; verpflichtende Fächer können nicht als nicht relevant markiert werden.
- Für als nicht relevant markierte Fächer ist **keine Bewertung möglich** (die Bewertungsansicht blendet die Kompetenzen dieses Fachs für die betroffene Person aus) und sie werden bei der Vollständigkeitsprüfung (5.1, 5.2) **nicht mitgezählt** – weder als offen noch als erledigt.
- Bereits vorhandene Bewertungen in diesem Fach werden beim Markieren nicht gelöscht, sondern nur ausgeblendet und ignoriert; wird die Markierung zurückgenommen, sind sie wieder sichtbar und nutzbar. So bleibt eine versehentliche Markierung folgenlos rückgängig zu machen.
- **Automatische Bemerkung:** Ist für das Fach eine `nichtRelevantBemerkung` hinterlegt (siehe 3.3), wird beim Setzen der Markierung automatisch ein entsprechender Eintrag in die Bemerkungen (3.6) der Person übernommen, und beim Zurücknehmen der Markierung wieder daraus entfernt. Dieser Eintrag wird in der Bemerkungenansicht schreibgeschützt dargestellt (kein eigenes Ankreuzfeld) – gesteuert wird er ausschließlich über die Nicht-relevant-Markierung in der Bewertungsansicht (5.2, 5.3).

### 3.8 Gesamtes lokales Datenmodell (Export-/Import-Format)
Ein Export entspricht **genau einer Klasse in einem Halbjahr**:

```json
{
  "formatVersion": 1,
  "erstelltAm": "2026-08-10T09:00:00",
  "halbjahr": "4.1",
  "kompetenzdateiVersion": "2026-1",
  "klasse": { "name": "4b", "schuljahr": "2025/2026" },
  "schueler": [ /* siehe 3.1 */ ],
  "bewertungen": [ /* siehe 3.4 */ ],
  "bewertungstexte": [ /* siehe 3.5 */ ],
  "bemerkungen": [ /* siehe 3.6 */ ],
  "nichtRelevanteAbschnitte": [ /* siehe 3.7 */ ]
}
```
Rückwärtskompatibilität: Datensätze, die vor Einführung dieses Felds exportiert wurden, enthalten `nichtRelevanteAbschnitte` nicht. Beim Import/Laden wird das Feld automatisch mit einem leeren Array ergänzt, ältere Backups bleiben also nutzbar.

---

## 4. Kompetenz- und Bausteindatei (serverseitig, nicht-personenbezogen, je Halbjahr)

- Für jedes der acht Halbjahre (1.1 bis 4.2) existiert eine **eigenständige, statische JSON-Datei**, vom Anbieter gepflegt (z. B. Fachberater:innen, orientiert an NRW-Kernlehrplänen).
- Beim Anlegen bzw. Öffnen eines Klassendatensatzes wählt der Anwender das zutreffende Halbjahr; die App lädt daraufhin die passende Datei und legt sie im Service-Worker-Cache/IndexedDB lokal ab → funktioniert danach offline.
- App bietet einen manuellen „Aktualisieren"-Button je Halbjahresdatei, der diese erneut vom Server lädt (kein automatischer Hintergrund-Sync, um Transparenz zu wahren).
- **Wichtig:** Diese Dateien enthalten niemals Schülerdaten, daher ist der Serverzugriff unkritisch bzgl. Datenschutz.
- Versionierung (`version`-Feld je Halbjahresdatei) ermöglicht Kompatibilitätsprüfung mit bereits gespeicherten Bewertungen (z. B. Warnung bei Versionswechsel, wenn Kompetenz-IDs sich geändert haben).

### 4.1 Verhalten bei Versionskonflikt nach „Aktualisieren"
Da bestehende Bewertungen (3.4) per `kompetenzId` auf die zuvor geladene Kompetenzdatei verweisen, muss die App nach einem manuellen „Aktualisieren" folgendes prüfen und dem Anwender anzeigen, **bevor** die neue Version aktiv gesetzt wird:
- **Unveränderte/neue Kompetenz-IDs:** Kein Konflikt, stillschweigende Übernahme der neuen `version`.
- **Entfallene Kompetenz-IDs** (in der neuen Datei nicht mehr vorhanden, aber mit bestehender Bewertung im Datensatz): Deutliche Warnung mit Auflistung der betroffenen Kompetenzen und Schüler:innen; betroffene Bewertungen bleiben im Datensatz erhalten (nicht automatisch gelöscht), werden aber in der Bewertungsansicht als „veraltet/nicht mehr in aktueller Kompetenzdatei" markiert, bis der Anwender sie manuell bereinigt.
- **Geänderte Stufenanzahl einer weiterhin existierenden Kompetenz-ID:** Warnung, falls eine gespeicherte `stufe` außerhalb der neuen Stufenanzahl liegt; betroffene Bewertung wird zur erneuten Prüfung markiert, Text wird nicht automatisch neu generiert.
- Der Anwender kann die neue Version trotz Warnung übernehmen oder das „Aktualisieren" abbrechen und mit der zuletzt lokal zwischengespeicherten Version weiterarbeiten.

---

## 5. Funktionale Anforderungen im Detail

### 5.1 Klassenverwaltung
- Ein Datensatz = eine Klasse in einem Halbjahr. Beim Neuanlegen wird das Halbjahr (1.1–4.2) festgelegt; dies bestimmt die zu ladende Kompetenzdatei und ist nachträglich nicht änderbar (stattdessen: neuer Datensatz).
- Anlegen/Bearbeiten/Löschen von Schüler:innen (Name, Vorname, Geburtsdatum, Geschlecht: „w"/„m").
- **CSV-Import der Klassenliste:** alternativ zur manuellen Einzelerfassung kann eine CSV-Datei mit benannten Spalten „Name" (Nachname), „Vorname", „Geburtsdatum", „Geschlecht" importiert werden (Spaltenreihenfolge beliebig, Groß-/Kleinschreibung der Kopfzeile egal; Trennzeichen Semikolon, Komma oder Tabulator werden automatisch erkannt). Das Geburtsdatum wird als „TT.MM.JJJJ" oder „JJJJ-MM-TT" akzeptiert. Das Geschlecht kann abgekürzt („m"/„M"/„w"/„W") oder ausgeschrieben („männlich"/„weiblich") angegeben werden; Zeilen mit „d"/„D"/„divers" werden **abgelehnt** (mit Fehlermeldung, Zeilennummer und Verweis auf die manuelle Korrektur), da die Pronomen-Logik der App bewusst ausschließlich „w"/„m" unterstützt (siehe 5.4) und das Datenmodell keinen dritten Wert kennt. Die Datei wird vollständig validiert, bevor irgendetwas übernommen wird (alles oder nichts, analog zum JSON-Import in 5.5): enthält auch nur eine Zeile einen Fehler (fehlender Name/Vorname, ungültiges Datum, ungültiges oder nicht unterstütztes Geschlecht), wird nichts importiert und alle Fehler werden gesammelt angezeigt. Bei Erfolg werden die eingelesenen Schüler:innen der aktuellen Klassenliste hinzugefügt (nach Bestätigung durch die Lehrkraft), nicht ersetzt.
- Sortierbare/filterbare Klassenliste.
- **Bewertungsstatus-Ampel je Schüler:in** in der Klassenliste: 🟢 vollständig (alle Kompetenzen der aktuellen Kompetenzdatei gültig bewertet), 🟡 teilweise (mindestens eine, aber nicht alle Kompetenzen bewertet), 🔴 nicht begonnen (keine gültige Bewertung vorhanden). Der Status wird aus den vorhandenen Bewertungen abgeleitet und nicht separat gespeichert; nach 4.1 ungültig gewordene Bewertungen (Stufe außerhalb der aktuellen Stufenzahl) zählen dabei nicht als bewertet, ebenso wenig als für diese Person „nicht relevant" markierte optionale Fächer (siehe 3.3, 3.7, 5.2). Da der Status ausschließlich der Übersicht dient, ist er kein Blocker für Bearbeitung oder JSON-Export – lediglich der Word-Sammeldokument-Export warnt bei Unvollständigkeit (siehe 5.6).
- Optionaler „Halbjahreswechsel"-Assistent: übernimmt die Schülerstammdaten in einen neuen Datensatz des Folgehalbjahres (siehe 3.2), ohne Bewertungsdaten zu übertragen.
- Da jeweils nur ein Datensatz (eine Klasse/ein Halbjahr) aktiv bearbeitet wird, erfolgt das Wechseln zwischen mehreren Klassen/Halbjahren über Export des aktuellen und Import des gewünschten Datensatzes (Drag & Drop, siehe 5.5).

### 5.2 Bewertungsansicht
- Navigierbar über Abschnitt → Bereich → Kompetenz (gemäß der zum Halbjahr gehörenden Kompetenzdatei).
- Je Kompetenz: Stufenauswahl (z. B. Radio-Buttons/Slider, abhängig von Anzahl der Stufen dieser Kompetenz).
- **Optionale Fächer:** Ist ein Abschnitt (Fach) in der Kompetenzdatei als `optional` markiert (siehe 3.3, z. B. Religion), zeigt die Bewertungsansicht auf Fachebene eine Markierung „Nicht relevant für diese Person" an. Ist sie gesetzt, werden die Kompetenzen dieses Fachs für die betroffene Person nicht zur Bewertung angeboten (siehe 3.7) und fließen nicht in die Vollständigkeitsprüfung (5.1) ein. Verpflichtende Fächer bieten diese Markierung nicht an. Ist zusätzlich eine `nichtRelevantBemerkung` hinterlegt, zeigt die Bewertungsansicht eine Vorschau der dadurch automatisch ergänzten Bemerkung an (siehe 3.3, 3.7, 5.3).
- **Vergleichsfunktion:**
  - Einblendbare Bewertung eines frei wählbaren anderen Schülers (zum direkten Abgleich).
  - Einblendbarer **Klassenmedian** und **Klassendurchschnitt** je Kompetenz (numerisch über die Stufennummern berechnet; Durchschnitt ggf. gerundet/mit Dezimalstelle, Median als tatsächlich vorkommende oder mittlere Stufe ausgewiesen).
  - Darstellung z. B. als kleine Balken-/Skalenanzeige neben der eigenen Bewertung.
- Anzeige des generierten Bewertungstexts in Echtzeit bei Stufenauswahl.
- **Auswahlgruppen (unterschiedliche Ausprägungen):** Enthält der aktuell gewählte Satzbaustein einer Kompetenz Auswahlgruppen (Syntax `{Option A|Option B|…}`, siehe 6.3), z. B. `"{Vorname} erfasst den Inhalt altersgemäßer Texte {weitgehend sicher|sicher|sehr sicher}."`, blendet die Bewertungsansicht unterhalb des generierten Textes zusätzlich je Auswahlgruppe ein einfaches Auswahlfeld (Dropdown) mit den definierten Optionen ein. Die getroffene Auswahl wirkt sich sofort auf den angezeigten Text sowie den späteren Word-Export aus (siehe 3.4). Da ein anderer Baustein (z. B. durch „Neu würfeln" oder eine neue Stufenauswahl) andere oder keine Auswahlgruppen enthalten kann, werden getroffene Ausprägungen dabei verworfen; „Zurücksetzen" ändert den gewählten Baustein hingegen nicht und erhält sie deshalb. Solange der Text manuell gesperrt ist (siehe unten), werden keine Auswahlfelder angeboten.
- **Gesamttextvorschau je Fach:** Je Abschnitt (Fach) lässt sich eine Vorschau des zusammengeführten Gesamttextes ein-/ausblenden (standardmäßig eingeklappt), der sich aus allen Bereichstexten dieses Fachs in Definitionsreihenfolge zusammensetzt – identisch zu dem Text, der entstünde, würden in der Word-Vorlage alle `{{Bereich_*}}`-Platzhalter dieses Fachs hintereinander verwendet (siehe 6.1). So lässt sich der spätere Zeugnistext eines Fachs bereits vor dem Word-Export im Zusammenhang lesen und prüfen, ohne die Einzeltexte je Kompetenz mental zusammensetzen zu müssen. Für als „nicht relevant" markierte optionale Fächer (siehe 3.7) entfällt die Vorschau, da dort keine Bewertung erfolgt.
- Sperr-/Entsperrmechanismus gemäß 3.5.

### 5.3 Bemerkungen
- Je Schüler: Liste aller Bemerkungsbausteine aus der (halbjahresspezifischen) Kompetenzdatei als Checkboxen.
- Mehrfachauswahl möglich; ausgewählte Bausteine werden in der finalen Textzusammenstellung berücksichtigt (Reihenfolge editierbar oder fest nach Definitionsreihenfolge).
- **Jeder Bemerkungsbaustein bildet einen eigenen Absatz:** In der Vorschau sowie im späteren Word-Export (siehe 5.6) werden die ausgewählten Bausteine nicht als ein fortlaufender, nur durch Leerzeichen getrennter Text zusammengefügt, sondern jeder Baustein erscheint als eigener Absatz.
- **Automatische Fach-Bemerkungen** (siehe 3.3, 3.7) erscheinen zusätzlich, aber schreibgeschützt (kein eigenes Ankreuzfeld) und deutlich als automatisch gekennzeichnet; sie fließen in dieser Form in die Textzusammenstellung mit ein. Ihre einzige Steuerung ist die Nicht-relevant-Markierung des zugehörigen Fachs in der Bewertungsansicht (5.2).
- **Auswahlgruppen (unterschiedliche Ausprägungen):** Enthält der Text eines Bemerkungsbausteins Auswahlgruppen (Syntax `{Option A|Option B|…}`, siehe 6.3), z. B. `"{Vorname} erwarb {schulisch|außerschulisch} das Schwimmabzeichen in {Bronze|Silber|Gold}."`, blendet die Bemerkungenansicht bei angewähltem Baustein zusätzlich je Auswahlgruppe ein einfaches Auswahlfeld (Dropdown) mit den definierten Optionen ein. Die getroffene Auswahl wird sofort in der Vorschau sowie im späteren Word-Export berücksichtigt (siehe 3.6) und bleibt auch bei kurzzeitigem Ab-/Wiederanwählen des Bausteins erhalten. Ohne bewusste Auswahl gilt automatisch die jeweils erste Option, sodass der Text stets vollständig und ohne sichtbare Platzhalter bleibt.

### 5.4 Textgenerierungs-Engine
- Ersetzt Platzhalter in Satzbausteinen anhand der Schülerdaten (siehe 6).
- Pronomenlogik anhand `geschlecht` (ausschließlich „w"/„m") mit fest definierten Ersetzungstabellen (Nominativ, Akkusativ, Dativ, Possessiv). Eine dritte Option „divers" wird bewusst **nicht** angeboten.
- Bei mehreren alternativen Satzbausteinen je Stufe: automatische zufällige Erstauswahl, vom Anwender jederzeit über eine explizite „Neu würfeln"-Aktion überschreibbar (siehe 3.3); nicht verfügbar, sobald der Text manuell gesperrt ist (3.5).

### 5.5 JSON-Import/Export
- Export des gesamten lokalen Datensatzes (3.8) einer Klasse/eines Halbjahres als Datei-Download.
- Import per **Drag & Drop** einer JSON-Datei in den Browser; Validierung gegen Schema, Prüfung von `halbjahr` und `kompetenzdateiVersion`, Konfliktbehandlung (z. B. „aktuellen Datensatz ersetzen" – da immer nur eine Klasse/ein Halbjahr aktiv ist, ist ein „Zusammenführen" hier nicht vorgesehen).

### 5.6 Word-Vorlagen-Merge (Sammeldokument)
- Das Word-Template wird **nicht dauerhaft in der App hinterlegt**, sondern vom Anwender unmittelbar **vor jedem Export** über eine lokale Dateiauswahl bereitgestellt (kein Serverkontakt, kein Zwischenspeichern über die Sitzung hinaus).
- Die Vorlage enthält definierte Platzhalter (siehe 6), u. a. für Schülerstammdaten, Bewertungstexte je Bereich/Kompetenz und Bemerkungen.
- Für **jeden Schüler der Klasse** wird der Platzhalter-Ersetzungsvorgang auf Basis derselben Vorlage durchgeführt.
- **Alle erzeugten Einzelzeugnisse werden zu einer einzigen Word-Datei zusammengeführt** (ein Dokument mit einem eigenen Abschnitt je Schüler:in, jeweils durch einen Abschnittswechsel mit Seitenumbruch getrennt), anstatt einzelner Dateien oder eines ZIP-Archivs.
- **Absatztrennung bei `{{Bemerkungen}}`:** Da jeder ausgewählte Bemerkungsbaustein einen eigenen Absatz bildet (siehe 5.3), wird an der Einfügestelle des `{{Bemerkungen}}`-Platzhalters für jeden Baustein ein eigener Word-Absatz erzeugt (nicht nur ein Zeilenumbruch). Dabei werden Absatz- und Zeichenformatierung der Vorlage an dieser Stelle übernommen; enthält der Absatz um `{{Bemerkungen}}` herum weiteren Text, verbleibt dieser im ersten bzw. letzten der neu entstehenden Absätze. Ist nur ein einziger Bemerkungsbaustein ausgewählt (oder keiner), bleibt der Absatz unverändert wie zuvor.
- Technische Umsetzung: Da `docxtemplater` primär einzelne Dokumente aus einer Vorlage befüllt, erfolgt der Zusammenbau der Sammeldatei durch Erzeugen der Einzeldokumente im Speicher und anschließendes programmatisches Verketten der jeweiligen Inhalte (Body-Elemente, ggf. inkl. Kopf-/Fußzeilen-Handling) in ein gemeinsames `.docx`-Gesamtdokument mittels direkter OOXML-Manipulation über `pizzip`. Die Trennung zwischen zwei Schüler:innen erfolgt dabei nicht über einen einfachen Zeilenumbruch (`w:br` mit `type="page"`), sondern über einen echten **Abschnittswechsel** (ein eigener Absatz, der ausschließlich die Abschnittseigenschaften `sectPr` der Vorlage in seiner `pPr` trägt) – die reguläre OOXML-Konstruktion, die Word beim manuellen Einfügen eines „Abschnittswechsel (nächste Seite)" erzeugt und die implizit einen Seitenumbruch auslöst. Jeder Schüler bzw. jede Schülerin steht damit in einem eigenen Word-Abschnitt mit identischer, von der Vorlage übernommener Seiteneinrichtung und identischen Kopf-/Fußzeilen-Referenzen.
- Ergebnis: **ein einziger Download** der vollständigen Sammel-Word-Datei für die gesamte Klasse.
- Kein Zwischenspeichern der erzeugten personenbezogenen Dateien auf einem Server; die Verarbeitung inkl. Zusammenführung erfolgt vollständig im Browser.
- **Vollständigkeitswarnung vor dem Export:** Unmittelbar bevor die Vorlage befüllt wird, prüft die App den Bewertungsstatus (siehe 5.1) aller Schüler:innen der Klasse. Ist mindestens eine Person nicht vollständig bewertet, erscheint ein Hinweisdialog mit der Liste der betroffenen Schüler:innen samt Status (teilweise/nicht begonnen); der Anwender kann den Export trotzdem fortsetzen (dann bleiben die entsprechenden `{{Kompetenz_*}}`/`{{Bereich_*}}`-Platzhalter im Ergebnis leer) oder abbrechen. Diese Warnung gilt **ausschließlich für den Word-Export** – der JSON-Export (5.5) als reines Backup des Arbeitsstands bleibt jederzeit ohne Rückfrage möglich, auch bei unvollständigen Bewertungen.

### 5.7 Statische Anleitung
Ergänzend zur App selbst liegt im selben Serververzeichnis wie `index.html` eine statische, mehrseitige HTML-Anleitung (`anleitung.html` als Einstieg, verlinkt von der Kopfzeile der App aus) für alle Anwendungsfälle: Klassenverwaltung (inkl. CSV-Import), Bewerten, Bemerkungen, Word-Export, Datensicherung/Offline-Nutzung/Installation sowie – als eigene Referenzseiten – die Dateiformate der Word-Vorlage (Platzhaltersyntax, siehe 6) und der Bewertungstextdatei (siehe 4). Die Seiten sind eigenständig (kein Build-Schritt, kein JavaScript-Router) und daher unabhängig von der App auch offline/ausgedruckt nutzbar.

Zusätzlich steht dort (`bewertungstextdatei-editor.html`) ein interaktives Werkzeug zum komfortablen Bearbeiten und Ergänzen von Bewertungstextdateien zur Verfügung, gedacht für Fachberater:innen/Administration (nicht für den Alltagsgebrauch durch Lehrkräfte). Es bietet Formulare für Fächer/Bereiche/Kompetenzen/Stufen/Satzbausteine/Bemerkungsbausteine samt Verschieben, Hinzufügen, Entfernen und laufender Prüfung (u. a. Eindeutigkeit von IDs, Pflichtfelder), lässt sich mit einer vorhandenen Datei per Upload oder direkt vom Server (`kompetenzdaten/<halbjahr>.json`) befüllen und läuft – analog zur restlichen App – vollständig im Browser ohne Serverkontakt. Da es sich um ein rein clientseitiges, statisches Werkzeug ohne eigene Persistenz handelt, erfolgt die „Speicherung" ausschließlich als JSON-Download; die erzeugte Datei muss die Lehrkraft/Administration anschließend manuell auf dem Server ablegen (siehe 4).

---

## 6. Platzhaltersyntax (Vorschlag, konsistent für Satzbausteine & Word-Vorlage)

### 6.1 Übersicht
| Platzhalter | Bedeutung |
|---|---|
| `{Vorname}` / `{Nachname}` | Schülername |
| `{Pronomen_Nom}` | er / sie |
| `{Pronomen_Akk}` | ihn / sie |
| `{Pronomen_Dat}` | ihm / ihr |
| `{Pronomen_Poss}` | sein / ihr (endungslos, siehe 6.2) |
| `{Pronomen_Poss_e}` | seine / ihre (siehe 6.2) |
| `{Pronomen_Poss_en}` | seinen / ihren (siehe 6.2) |
| `{Pronomen_Poss_em}` | seinem / ihrem (siehe 6.2) |
| `{Pronomen_Poss_es}` | seines / ihres (siehe 6.2) |
| `{Pronomen_Poss_er}` | seiner / ihrer (siehe 6.2) |
| `{Geburtsdatum}` | formatiert TT.MM.JJJJ |
| `{Bereich:lesen}` | eingefügter Bewertungstext des Bereichs „Lesen" |
| `{Kompetenz:lesen_sinnentnehmend}` | Text der einzelnen Kompetenz |
| `{Bemerkungen}` | zusammengeführter Text aller ausgewählten Bemerkungsbausteine |

In der Word-Datei werden dieselben Bezeichner in doppelten geschweiften Klammern verwendet (docxtemplater-Konvention), z. B. `{{Vorname}}`, `{{Bereich_lesen}}`.

### 6.2 Hinweis zur Pronomenlogik
Da „Geschlecht divers" gemäß Vorgabe nicht berücksichtigt wird, basiert die Pronomenersetzung ausschließlich auf einer binären Zuordnung (`w`/`m`). Eine Erweiterung ist architektonisch möglich (zusätzliche Spalte in der Ersetzungstabelle, zusätzlicher Wert im `geschlecht`-Feld), ist aber **nicht** Teil des aktuellen Funktionsumfangs.

**Deklination des Possessivpronomens:** Anders als die Personalpronomen (`{Pronomen_Nom}`/`{Pronomen_Akk}`/`{Pronomen_Dat}`, die als eigenständiges Wort stehen und daher pro Geschlecht eine einzige feste Form haben) *begleitet* das Possessivpronomen ein Nomen und muss sich in Kasus, Numerus und Genus **nach diesem Nomen** richten – nicht nur nach dem Geschlecht der bewerteten Person. „sein"/„ihr" ist dabei nur die endungslose Form (korrekt z. B. bei „sein Arbeitsmaterial", Neutrum Singular), für andere Fälle braucht es eine andere Endung, z. B. „seine Arbeitsmaterialien" (Plural) oder „seinen Mitschüler:innen" (Dativ Plural). Da Possessivpronomen wie „ein"-Wörter vollständig regelmäßig durch Anhängen einer Endung an den Stamm dekliniert werden, stellt die App sechs Varianten bereit – die endungslose Form sowie je eine Form für die Endungen `-e`, `-en`, `-em`, `-es`, `-er` (siehe 6.1). Beim Verfassen eines Satz- oder Bemerkungsbausteins ist daher die zum jeweiligen Nomen passende Variante zu wählen:

| Verwendung | Platzhalter | Beispiel |
|---|---|---|
| Maskulinum/Neutrum Nominativ Singular; Neutrum Akkusativ Singular | `{Pronomen_Poss}` | „sein Arbeitsmaterial" |
| Femininum Nominativ/Akkusativ Singular; Plural Nominativ/Akkusativ | `{Pronomen_Poss_e}` | „seine Arbeitsmaterialien" |
| Maskulinum Akkusativ Singular; Plural Dativ | `{Pronomen_Poss_en}` | „seinen Mitschüler:innen" |
| Maskulinum/Neutrum Dativ Singular | `{Pronomen_Poss_em}` | „seinem Heft" |
| Maskulinum/Neutrum Genitiv Singular | `{Pronomen_Poss_es}` | „seines Hefts" |
| Femininum Dativ/Genitiv Singular; Plural Genitiv | `{Pronomen_Poss_er}` | „seiner Mappe" |

Eine automatische Erkennung des richtigen Falls ist nicht möglich, da die App das auf den Platzhalter folgende Nomen inhaltlich nicht kennt (reine Textersetzung ohne Sprachverständnis) – die Wahl der passenden Variante obliegt beim Verfassen eines Bausteins bewusst der Autorin/dem Autor.

### 6.3 Auswahlgruppen in Bemerkungs- und Satzbausteinen
Zusätzlich zu den benannten Platzhaltern aus 6.1 kann der Text eines **Bemerkungsbausteins** (3.3) oder eines **Satzbausteins** einer Kompetenzstufe (3.3) sogenannte Auswahlgruppen enthalten, mit denen eine Lehrkraft zwischen mehreren Textvarianten wählt:

```
{Option A|Option B|Option C}
```

Beispiel Bemerkungsbaustein: `"{Vorname} erwarb {schulisch|außerschulisch} das Schwimmabzeichen in {Bronze|Silber|Gold}."`
Beispiel Satzbaustein: `"{Vorname} erfasst den Inhalt altersgemäßer Texte {weitgehend sicher|sicher|sehr sicher}."`

- **Erkennung:** Eine `{…}`-Gruppe gilt als Auswahlgruppe, sobald ihr Inhalt mindestens ein `|`-Zeichen enthält; ansonsten wird sie wie ein regulärer Platzhalter aus 6.1 behandelt. Beide Syntaxen können im selben Bausteintext gemischt vorkommen, wie im ersten Beispiel oben (`{Vorname}` als Platzhalter, `{schulisch|außerschulisch}` und `{Bronze|Silber|Gold}` als Auswahlgruppen).
- **Reihenfolge:** Auswahlgruppen werden zuerst aufgelöst (reine Textersetzung anhand ihrer Position im Baustein), erst danach werden die verbleibenden benannten Platzhalter ersetzt.
- **Bedienung bei Bemerkungsbausteinen:** Wird ein Bemerkungsbaustein mit Auswahlgruppen in der Bemerkungenansicht angewählt, erscheint je Auswahlgruppe ein Dropdown mit den definierten Optionen (siehe 5.3). Die Auswahl wird je Schüler:in und Baustein gespeichert (siehe 3.6) und in Vorschau sowie Word-Export berücksichtigt.
- **Bedienung bei Satzbausteinen:** Enthält der aktuell gewählte Satzbaustein einer Kompetenzstufe Auswahlgruppen, erscheint in der Bewertungsansicht unterhalb des generierten Textes je Auswahlgruppe ein Dropdown (siehe 5.2/5.4). Die Auswahl wird je Schüler:in und Kompetenz gespeichert (siehe 3.4) und wirkt sich sofort auf den angezeigten sowie später exportierten Text aus. Da sich ein Satzbaustein bei „Neu würfeln" oder einer neuen Stufenauswahl ändern kann, beziehen sich gespeicherte Ausprägungen stets auf den aktuell gewählten Baustein und werden bei dessen Wechsel verworfen; „Zurücksetzen" (3.5) hingegen ändert den gewählten Baustein nicht und erhält daher bereits getroffene Ausprägungen. Ist der Text manuell bearbeitet und damit gesperrt (3.5), werden keine Auswahlfelder mehr angeboten, da der Text dann nicht mehr aus dem Baustein hergeleitet wird.
- **Standardverhalten:** Ohne bewusste Auswahl – oder bei fehlerhaftem/veraltetem gespeicherten Index – gilt automatisch die erste Option der jeweiligen Gruppe, sodass der erzeugte Text stets vollständig ist und niemals unaufgelöste `{…|…}`-Syntax sichtbar wird.

---

## 7. Nicht-funktionale Anforderungen

- **Datenschutz/DSGVO:** Verarbeitung ausschließlich lokal; keine Drittanbieter-Skripte mit Datenzugriff; klare Datenschutzhinweise in der App.
- **Offlinefähigkeit:** Nach Erstladen und Bezug der passenden Halbjahres-Kompetenzdatei voll funktionsfähig ohne Internetverbindung.
- **Browser-Kompatibilität:** Aktuelle Versionen von Chrome, Edge, Firefox (Schul-PCs oft mit eingeschränkten Browserversionen – Zielkompatibilität explizit festlegen und testen).
- **Bedienbarkeit:** Für Lehrkräfte ohne IT-Hintergrund, klare Führung durch den Workflow (Halbjahr wählen → Klasse anlegen → Bewerten → Bemerkungen → Word-Vorlage auswählen → Sammeldokument exportieren).
- **Robustheit:** Kein Datenverlust bei Browser-Neustart (persistente IndexedDB), regelmäßige Erinnerung an manuellen JSON-Export als „Backup".
- **Barrierefreiheit:** Tastaturbedienbarkeit, ausreichende Kontraste, sinnvolle ARIA-Labels; wird bereits bei der Implementierung jeder UI-Komponente berücksichtigt und nicht erst nachträglich geprüft (siehe Prinzipien zu Beginn von Abschnitt 8).

---

## 8. Implementierungsplan (Phasen)

**Durchgängige Prinzipien (gelten für jede Phase, nicht erst am Ende):** Barrierefreiheit (Tastaturbedienbarkeit, ausreichende Kontraste, ARIA-Labels) wird bei jeder neu gebauten UI-Komponente direkt mitgebaut, nicht erst nachträglich in Phase 7 geprüft — Phase 7 führt lediglich die abschließende, umfassende Prüfung/den Feinschliff durch. Ebenso wird das technisch risikoreichste Merkmal, der Word-Sammeldokument-Merge (5.6), nicht erst in Phase 6 erstmals angefasst: Parallel zu Phase 1–2 wird ein kleiner, isolierter **Technik-Spike** durchgeführt (Prototyp außerhalb der eigentlichen App), der die programmatische OOXML-Verkettung mehrerer `docxtemplater`-Ergebnisse über `pizzip` zu einem Sammeldokument mit Seitenumbrüchen sowie Kopf-/Fußzeilen-Handling grundsätzlich nachweist. Erst nach positivem Spike-Ergebnis gilt der in 5.6 beschriebene Ansatz als abgesichert; andernfalls wird rechtzeitig auf eine Alternative (z. B. Erzeugung eines ZIP-Archivs mit Einzeldokumenten samt manuellem Zusammenführen durch den Anwender in Word) ausgewichen, siehe 1.3.

### Phase 1 – Grundgerüst & Datenmodell
- Projekt-Setup (Build-Tooling, PWA-Manifest, Service-Worker-Grundgerüst).
- IndexedDB-Schicht für einen Klassendatensatz (Halbjahr, Schüler, Bewertungen, Bewertungstexte, Bemerkungen).
- Klassenverwaltung (Halbjahr festlegen, CRUD für Schüler:innen, **sortierbare/filterbare Klassenliste** gemäß 5.1).
- JSON-Export/-Import inkl. Drag & Drop; Halbjahreswechsel-Assistent (Übernahme der Stammdaten).
- Parallel: Technik-Spike Word-Sammeldokument-Merge (siehe Prinzipien oben).
- **Validierung:** Datensatz lässt sich anlegen, exportieren, in neuem Browserprofil importieren und ist identisch; Halbjahreswechsel übernimmt korrekt nur die Stammdaten; Klassenliste lässt sich nach Name/Vorname sortieren und filtern; Spike-Prototyp erzeugt ein gültiges Mehrseiten-`.docx` aus mind. zwei Testvorlagen-Instanzen.

### Phase 2 – Kompetenzdatei & Bewertungs-UI
- Laden/Cachen der halbjahresspezifischen Kompetenzdatei, Versions- und Konsistenzprüfung (`halbjahr`-Abgleich).
- Manueller „Aktualisieren"-Button je Halbjahresdatei (4) inkl. Versionskonflikt-Behandlung gemäß 4.1 (Warnung bei entfallenen Kompetenz-IDs oder geänderter Stufenanzahl, Markierung betroffener Bewertungen, Möglichkeit zum Abbrechen).
- Navigierbare Ansicht Abschnitt → Bereich → Kompetenz.
- Stufenauswahl-UI mit variabler Stufenzahl je Kompetenz.
- **Validierung:** Für mehrere Testkompetenzen mit unterschiedlicher Stufenzahl aus verschiedenen Halbjahresdateien funktioniert die Bewertung korrekt; falsches/fehlendes Halbjahr wird erkannt; „Aktualisieren" mit geänderter Testdatei löst korrekt Warnung/Markierung gemäß 4.1 aus und ein Abbruch behält die vorherige Version bei.

### Phase 3 – Textgenerierungs-Engine
- Platzhalter-/Pronomenersetzung (binär w/m).
- Automatische Textgenerierung bei Stufenauswahl inkl. zufälliger Erstauswahl bei mehreren alternativen Satzbausteinen.
- „Neu würfeln"-Steuerung zur erneuten zufälligen Baustein-Auswahl (3.3, 5.4), inkl. Persistenz von `gewaehlterBausteinIndex`.
- Manuelle Textbearbeitung inkl. Sperr-/Zurücksetzen-Mechanismus.
- **Validierung:** Testfälle für beide Geschlechtsausprägungen, Sperrverhalten, Reset-Funktion; „Neu würfeln" liefert bei ≥2 Alternativen einen anderen/zulässigen Baustein und ist bei gesperrtem Text deaktiviert; gewählter Index bleibt nach Neuladen erhalten.

### Phase 4 – Vergleichsansichten
- Auswahl eines Vergleichsschülers.
- Berechnung von Klassenmedian und -durchschnitt je Kompetenz.
- Visuelle Integration in die Bewertungsansicht.
- **Validierung:** Korrekte Median-/Durchschnittsberechnung bei geraden/ungeraden Klassengrößen, fehlenden Bewertungen.

### Phase 5 – Bemerkungen
- Checkbox-UI für Bemerkungsbausteine je Schüler (aus der halbjahresspezifischen Datei).
- Einbindung in Textzusammenstellung.
- **Validierung:** Mehrfachauswahl, Persistenz, korrekte Textzusammenführung.

### Phase 6 – Word-Vorlagen-Merge als Sammeldokument
- Lokale Auswahl der `.docx`-Vorlage unmittelbar vor Export (kein dauerhaftes Speichern der Vorlage).
- Platzhalter-Mapping-Konfiguration.
- Generierung je Schüler und programmatisches Zusammenführen aller Einzelzeugnisse zu **einer** Sammel-Word-Datei (Seitenumbrüche zwischen Schüler:innen).
- **Validierung:** Testvorlage mit allen Platzhaltertypen, Rundlauf für vollständige Testklasse, Prüfung auf korrekte Reihenfolge, Seitenumbrüche, Sonderzeichen/Umlaute und Layout-Konsistenz über alle Einzelabschnitte hinweg.

### Phase 7 – PWA-Feinschliff & Härtung
- Vollständiges Offline-Verhalten (App-Shell + Fallback auf zuletzt geladene Halbjahres-Kompetenzdatei).
- Installierbarkeit (Manifest, Icons).
- Backup-Erinnerungen, Fehlerbehandlung bei Import (korruptes JSON, Versions-/Halbjahreskonflikte).
- Abschließende, umfassende Barrierefreiheits- und Browser-Kompatibilitätstests auf typischer Schul-Hardware (ergänzend zur durchgängigen Berücksichtigung in Phase 1–6, siehe Prinzipien zu Beginn von Abschnitt 8); Behebung hier noch offener Einzelbefunde.

---

*Dieses Dokument dient als lebendige Spezifikation und sollte parallel zur Implementierung aktualisiert werden, sobald einzelne Phasen validiert sind oder von der ursprünglichen Planung abweichen.*
