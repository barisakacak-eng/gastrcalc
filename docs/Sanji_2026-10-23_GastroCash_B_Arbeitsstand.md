# GastroCash B – Arbeitsstand 23.10.2026

## Verifiziert im Entwicklungsbranch
- Markenname in index.html und manifest.webmanifest aktualisiert.
- Der Markenbaustein wird in js/screens/nav.js direkt gerendert; keine doppelte nachträgliche DOM-Injektion.
- Lokaler SVG-Küchenhelfer in assets/brand/mascot-classic.svg.
- Fünf getrennte Gesichter in js/gastrocash-brand.js: neutral, freundlich, nachdenklich, ernst, erfolg. Jeweils zwei offene Augen; kein automatisches Zwinkern.
- Kurze Daumen- und Münzbewegungen, nur wenn reduzierte Bewegung nicht angefordert wurde.
- Neue gezielte Tests in tests/gastrocash-brand.test.mjs.

## Noch nicht freigegeben / technische Pflichtpunkte
1. **Offline-Gate rot bis Service-Worker-Neugenerierung:** sw.js enthält eine vollständige Dateiliste und einen SHA1-Fingerabdruck. Neue CSS/JS/SVG-Dateien fehlen dort. Nach Integration zwingend `python3 tools/sw_liste.py` auf diesem Branch ausführen, danach `node --test tests/fassung.test.mjs tests/gastrocash-brand.test.mjs` und vollständige Tests. Versionierung des SW in Absprache mit Zoro, keine manuelle Hash-Manipulation.
2. **App-Icon:** Vorhandene PNG-Icons und Icons für iOS sind noch alt. Neue Binärdateien nicht über den Text-Datei-Connector fälschen. PNG aus dem freigegebenen Vektor nach grafischer Abnahme lokal erzeugen und Icons/Manifest zusammen aktualisieren.
3. **Markenreferenz:** Das SVG ist eine vereinfachte technische Umsetzung, nicht pixelidentisch mit dem freigegebenen Entwurf. Vor Merge Abnahme des tatsächlichen Looks erforderlich.
4. **Mobile Browserprüfung:** 390×844 und 360×780 mit echtem Browser durchführen. Kopfzeile, alle Modi, lange Sprachen und Offline-Neustart prüfen.
5. **Name in App-Inhalten:** Weitere sichtbare GastroCalc-Nennungen nur nach gezielter Sichtprüfung ändern. Keine Speicher-Schlüssel, Ereignisse oder Dateiformate blind umbenennen.
6. **Markenrecht:** GastroCash vor öffentlichem Einsatz prüfen. Kein Chat in B; C ist spätere Ausbaustufe.

## Integrationsregel
PR #7 ist Draft gegen `work/facelift-integration-2026-10-22`, nicht gegen main. Kein Merge ohne Freigabe des Kapitäns.
