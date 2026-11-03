# GastroCash – Home-Bildschirm-Anleitung

**01.11.2026 · nur Designübergabe, kein App-Code**

In diesem Branch liegen **5 PNG (1080 × 1350)** und **5 editierbare SVG**, jeweils im selben Gestaltungsstil. Zusätzlich steht das komplette ZIP in der ChatGPT-Ausgabe bereit. **Die Browser-UI ist schematisch, nicht vom echten Gerät aufgenommen.**

## Quellen und Grenzen

Die Illustrationen zeigen schematische Browseroberflächen, **keine authentischen Geräte-Screenshots**. Bedienfolge und Texte wurden anhand von Apples und Googles Hilfe geprüft.

- Apple iOS 26: https://support.apple.com/de-de/guide/iphone/iphea86e5236/ios (abgerufen 01.11.2026). Je nach Safari-Tabs: „Mehr → Teilen“ oder direkt „Teilen“; danach „Zu Home-Bildschirm hinzufügen“, „Als Web-App öffnen“, „Hinzufügen“.
- Google Android/Chrome: https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=de-DE (abgerufen 01.11.2026). Drei-Punkte-Menü und Installationsoption; Bezeichnung kann variieren.
- WebKit, 24.03.2020: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ erklärt die Safari-7-Tage-Regel und Ausnahme für Home-Screen-Web-Apps. Das ersetzt keine Sicherungskopie.

## QA vor Zoros Integration

1. Alle fünf PNG und fünf SVG liegen vor; die SVG vor Merge mit den finalen PNG auf Darstellungsgleichheit prüfen (insbesondere Icons, Layout, Textumbruch).
2. Türkisch ist KI-Übersetzung und benötigt muttersprachliche Prüfung.
3. Die dargestellten Steuerelemente auf echten iOS-26-/Android-Geräten gegenprüfen, da Illustrationen keine echten Screenshots sind.
4. Bestehende App-Dateien nicht ändern, keine Merge-Freigabe ohne vollständige Prüfung.

## Korrektur vom 01.11.2026
Auf Bild 02 ist die markierte Safari-Menüzeile **„Zum Home-Bildschirm“** (nicht „Zu Home-Bildschirm“). Die PNG-Abbildung wird passend zur SVG korrigiert. Baris prüft auf seinem iPhone vor jeder Merge-Freigabe. PR bleibt Entwurf.
