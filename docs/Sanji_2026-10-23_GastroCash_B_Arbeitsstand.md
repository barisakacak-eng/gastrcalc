# GastroCash B – Arbeitsstand 23.10.2026

## Tatsächlich im Entwicklungsbranch umgesetzt

- **Marke:** GastroCash in HTML, Manifest, Teilen/Diagnose, Sicherungshinweisen und allen 18 Sprachdateien. Interne Speicherformate und alte technische Bezeichner bleiben unangetastet.
- **Navigation:** GastroCash sitzt direkt in der echten Navigationsfunktion. Keine nachträgliche DOM-Einfügung und kein doppeltes Logo.
- **Küchenhelfer:** lokales SVG mit fünf eindeutigen Emotionen: neutral, freundlich, nachdenklich, ernst, Erfolg. Alle Gesichter haben zwei offene Augen; kein automatisches Zwinkern.
- **Bewegung getrennt von Emotion:** idle, Daumen, Drehen und Feiern sind eigene Bewegungszustände. Blinzeln schließt beide Augen gleichzeitig. Alle Bewegungen stehen unter `prefers-reduced-motion`.
- **Echte Einsatzpunkte:** vorhandenes Hilfe-Blatt und echter Tagesabschluss. Beim Tagesabschluss entscheidet ausschließlich die bereits berechnete Lage: über null = Erfolg; unter null und weiter weg = ernst; unter null aber verbessert/unvollständig = nachdenklich. Keine neue Rechenregel.
- **PWA/Home-Screen:** icon-180, icon-192, icon-512 und maskable-512 wurden durch neutrale GastroCash-Küchenhelfer ersetzt. Das Maskable-Icon hat eigenen Sicherheitsrand.
- **Vektorassets:** `icons/logo.svg`, `icons/logo-zeichen.svg`, `assets/brand/gastrocash-logo.svg`, `assets/brand/mascot-classic.svg`.
- **Tests:** `tests/gastrocash-brand.test.mjs` prüft Gesichtszustände, zwei offene Augen, sichere Fallbacks, reduzierte Bewegung, die 18 Sprachdateien, Vektorassets, PWA-PNGs und die situationsgerechte Tagesabschluss-Reaktion.
- **Offline-Fassung:** Version `2026-10-23.1`; neue Markenassets stehen in der Service-Worker-Dateiliste. Der finale Inhalts-Fingerabdruck wird erst nach dem letzten Code-/Asset-Stand aktualisiert und anschließend im CI geprüft.

## Bewusst NICHT umgesetzt

- Kein Finanz-Chat. Das ist Variante C und bleibt eine spätere Ausbaustufe.
- Keine neuen Berechnungen, Nutzenbeträge oder Steuerbehauptungen.
- Keine Änderung der freigegebenen Premium-Food-Fotos.
- Keine Änderung von `main`, kein Live-Deploy und kein Merge.
- Technische Altbezeichner/Kompatibilitätsdaten werden nicht blind von GastroCalc auf GastroCash umbenannt; alte Sicherungen müssen weiter lesbar bleiben.

## Noch vor Merge zu erledigen

1. Finalen Service-Worker-Fingerabdruck für den unveränderten Endstand setzen.
2. Vollständige Node-Tests in UTC und Europe/Berlin grün.
3. Browser-Regelprüfung und Personal-Durchlauf grün.
4. Mobile Sichtprüfung 390×844 und 360×780: Kopfzeile, Hilfe, Tagesabschluss, lange Texte, PWA/Offline-Neustart.
5. Visuelle Abnahme der technisch vereinfachten SVG-Figur gegen die freigegebene Markenreferenz.
6. Markenrechtliche Verfügbarkeit von GastroCash vor öffentlicher Veröffentlichung separat prüfen.

## Branch / PR

- Branch: `sanji/gastrocash-brand-b-2026-10-23`
- Draft-PR #7 gegen `work/facelift-integration-2026-10-22`
- `main` und öffentliche App bleiben unverändert.
