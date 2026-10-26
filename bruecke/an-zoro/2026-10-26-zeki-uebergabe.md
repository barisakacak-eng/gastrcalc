FÜR ZORO: Zeki – Abschluss und Übergabe · 26.10.2026

## Verbindlicher Stand

PR #16: Branch sanji/zeki-animation-2026-10-28. Sichtbare Quellsicherung a63ed8e; Implementierung e97b7f0. Kein Merge. Der verlorene lokale Arbeitsordner wurde aus der gespeicherten, freigegebenen 3D-Quelle vom 24.10. wiederhergestellt. Kein neues Design und keine eigene Modellvariante.

Die älteren Aussagen über die nicht abgeschlossene Umsetzung vom 24.10. sind keine Lieferung. Maßgeblich sind jetzt die tatsächlichen Commits und die Prüfungen unten. Die Schablonen-Korrekturen liegen separat in PR #15.

## Aufbau

Die ruhende Figur ist echter SVG-Vektor mit nativen Pfaden, kein ausgeschnittenes JPEG. Fester viewBox 0 0 237 328. IDs: zeki, koerper, kopf, auge-l, auge-r, braue-l, braue-r, lid-l, lid-r, mund-neutral, mund-grinsen, mund-o, arm-l, arm-r, hand-r, muenze. Inline werden diese IDs zu data-zeki-teil; Clip-IDs haben pro Figur einen eigenen Präfix.

Das echte räumliche Modell liegt als GLB plus Generator und Meshdaten unter design/zeki-3d. Helm, Hals, Körper, Arme und Füße haben Tiefe. Augen, beide Brauen und Münder gehören zum Modell. Seiten und Rücken sind aus der Frontreferenz ergänzt. Die Frontfarbe stammt aus nativen Vektorpfaden; die GLB enthält eine daraus erstellte eingebettete Textur.

Bewegung: sieben vorbereitete transparente WebP-Folgen aus dem echten Modell, 25 Bilder je Folge, je 154–165 KB. Darstellung in der App ausschließlich als SVG/CSS mit transform/opacity, keine Bibliothek und kein Canvas/WebGL. Nur der Entwicklungsviewer verwendet WebGL. Alle App-Dateien sind in der Offline-Liste. Modellquellen unter design werden nicht auf jedes Handy geladen.

## Animationen

| Name | Bewegung | Dauer |
|---|---|---|
| zwinkern | Rechtes Auge schließt und öffnet | 720 ms |
| grinsen / laecheln | Zwinkern mit Lächeln | 720 ms |
| hand | Arm hebt an der Schulter und winkt zweimal | 1200 ms |
| nicken | Kopf am Hals nach vorne/unten und zurück, starre Form | 1200 ms |
| kopfschuetteln | Kopf am Hals links/rechts, keine seitliche Kippung | 1200 ms |
| pruefen | Konzentrierter Prüfblick | 1200 ms |
| preis | Eigener abwägender Blick für Preisvergleich | 1200 ms |

Atmen/idle startet keine Endlosschleife. prefers-reduced-motion verhindert Bewegung und erhält die statische Mimik. Kein echter iPhone-Test bestätigt.

## Schnittstelle für Zoro

```
import {mascotMarkup, zekiMimik, zekiSpielen} from './gastrocash-brand.js';
container.innerHTML = mascotMarkup('hilfe');
zekiMimik(container, 'hilfe');
zekiSpielen(container, 'hand');
// Nach dem vorhandenen Import-Prüfergebnis:
zekiMimik(container, 'import');
zekiSpielen(container, 'pruefen');
// Stoppen:
zekiSpielen(container, 'none');
```

Parameter element: SVG selbst oder eine Hülle mit .zeki. Rückgabe true/false. Start neu, Abbruch und Aufräumen nach animationend; Zeitlimit als Rückfall. Vor dem Laden bleibt die SVG-Front sichtbar. mascotMarkup ist synchron und kompatibel mit den bestehenden Aufrufern; eine dort angeforderte Bewegung startet beim Einfügen in den DOM. 'keine' aus der Satzdatei bei der Übergabe an diese API als 'none' abbilden.

Elf Mimiken: neutral, freude, frage, import, preis, hilfe, warnung, bestaetigt, aufmerksam, erleichtert, fehler. Bestehende Namen freundlich/erfolg→freude, ernst→warnung, nachdenklich→import bleiben erhalten. Import und Preis haben unterschiedliche Augen/Brauen/Münder; Hilfe lächelt mit beiden Brauen.

Bestehende Einbauorte bleiben Kopfzeile, Hilfe und Abschluss; CSS bestimmt die Größe. Basis-Kopfzeichen 30 × 34 px (kleine Geräte 25 × 29 oder 22 × 25). Für größere Vorschauen das SVG proportional skalieren (237:328). mascotResultState ist unverändert.

WICHTIG: Dieser PR enthält nur Aussehen, Darstellungs-API und Bewegungen. Keine neue fachliche Ereigniszuordnung, keine Sätze, keine Änderungen an js/zeki.js oder js/data/zeki_saetze.js. Hilfe: 68 × 76 px; Abschluss: 58 × 66 px (klein 50 × 57). Die aktuelle Zeki-Logik aus main bleibt Zoros Quelle. Der PR basiert auf dem alten Branchstand; neue main-Logik nicht durch alte Dateien ersetzen. Die API mit dem bestehenden Moment/Bewegungswert verbinden, Warnungen nicht durch positive Gesten überdecken.

## Freigabe und Grenzen

24.10.: Im vorausgehenden Gespräch wurden die einzelnen 3D-Mimikdateien und der weitere Implementierungsauftrag bestätigt. 26.10.: expliziter Auftrag, den alten Lauf zu beenden und PR/Übergabe abzuschließen. Physisches iPhone, Seiten-/Rückansicht in der App und Gesamtintegration mit der neuen main-Zeki-Logik sind nicht als abgenommen behauptet.

Die SVG-Front bleibt skalierbar. Bewegungsbilder haben 256 × 318 Bildpunkte pro Frame: über etwa 256 CSS-px Breite sichtbar weich; auf einem Display mit Gerätefaktor 3 bereits oberhalb etwa 85 CSS-px keine volle Retina-Auflösung. Daher kleine App-Figur geeignet, große Nahaufnahme der Animation begrenzt. GIFs sind aus den Modellfolgen erzeugte Abnahmedateien und kein iPhone-Mitschnitt. Keine pixelgenaue Übereinstimmung der ergänzten Rückseite mit einer nicht vorhandenen Referenz behauptet.

## Prüfung am 26.10.

- python3 tools/sw_liste.py: ausgeführt, Offline-Liste erzeugt.
- TZ=UTC node --test tests/*.mjs: 693 bestanden, 5 bestehende optionale Tests ausgelassen, 0 Fehler.
- TZ=Europe/Berlin node --test tests/*.mjs: zunächst zwei, bei Einzelwiederholung ein Zeitgrenzenfehler im unveränderten Speichertest; keine Fachdatei geändert. Wiederholung mit --test-concurrency=2: 692 bestanden, 5 ausgelassen, derselbe Safari-Rückfall-Speichertest weiterhin rot. Dieser Fehler bleibt offen; keine grüne Gesamtprüfung behauptet. Zoro muss ihn vor Übernahme prüfen.
- node tools/sprachpruefung.mjs: alle 18 Sprachtabellen grün.
- python3 tests/regeln.py: 0 Verstöße in beiden Bildschirmgrößen.
- python3 tests/zeki_browser.py: alle sechs Bewegungen, Ende und reduzierte Bewegung in Chromium 390 × 844, Gerätefaktor 3 bestanden.
- Zieltests für SVG, sichere Parameter und Markenpaket: 12/12 bestanden.
- python3 tests/durchlauf_personal.py: bestanden.

## Einzelne Abnahme-GIFs in Drive

- [zwinkern](https://drive.google.com/file/d/1bvZAPtEkCbGS4STEMr4MDQKl9JTqN7R6/view?usp=drivesdk)
- [grinsen](https://drive.google.com/file/d/1fW8EkcVIMQM50_glej-QIqxoqqFGgHVp/view?usp=drivesdk)
- [hand](https://drive.google.com/file/d/17EW7FF7bWXjSaywXOVIVH57VBWjKun04/view?usp=drivesdk)
- [nicken](https://drive.google.com/file/d/1Hmhxy0c7dUXCyJ4MJvNAdpouJu7uRtLG/view?usp=drivesdk)
- [kopfschuetteln](https://drive.google.com/file/d/10zZBOV41gQy8634QaLazN_JD_x0bI8vR/view?usp=drivesdk)
- [pruefen](https://drive.google.com/file/d/1984krD3DG3i0JTHkQ64h983Hqd-qXU9k/view?usp=drivesdk)

## Dateiliste (gegen den ursprünglichen PR-Stand 20da98f)

- `assets/brand/gastrocash-logo.svg` (M): Native Vektordarstellung bzw. Vektorgrundlage für Zeki und Marke.
- `assets/brand/mascot-classic.svg` (M): Native Vektordarstellung bzw. Vektorgrundlage für Zeki und Marke.
- `assets/brand/zeki-referenz.jpeg` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `assets/brand/zeki.svg` (M): Native Vektordarstellung bzw. Vektorgrundlage für Zeki und Marke.
- `assets/brand/zeki/grinsen.webp` (A): Lokale Modellfarbe oder vorbereitete räumliche Bewegungsfolge, unter 300 KB.
- `assets/brand/zeki/hand.webp` (A): Lokale Modellfarbe oder vorbereitete räumliche Bewegungsfolge, unter 300 KB.
- `assets/brand/zeki/kopfschuetteln.webp` (A): Lokale Modellfarbe oder vorbereitete räumliche Bewegungsfolge, unter 300 KB.
- `assets/brand/zeki/nicken.webp` (A): Lokale Modellfarbe oder vorbereitete räumliche Bewegungsfolge, unter 300 KB.
- `assets/brand/zeki/preis.webp` (A): Lokale Modellfarbe oder vorbereitete räumliche Bewegungsfolge, unter 300 KB.
- `assets/brand/zeki/pruefen.webp` (A): Lokale Modellfarbe oder vorbereitete räumliche Bewegungsfolge, unter 300 KB.
- `assets/brand/zeki/zwinkern.webp` (A): Lokale Modellfarbe oder vorbereitete räumliche Bewegungsfolge, unter 300 KB.
- `css/tokens.css` (M): Farbtokens und Darstellungs-/Bewegungsregeln.
- `css/zeki.css` (M): Farbtokens und Darstellungs-/Bewegungsregeln.
- `design/schablone-texte.js` (A): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `design/zeki-3d/Inter-LICENSE.txt` (A): Lizenz oder Entwicklungsabhängigkeiten.
- `design/zeki-3d/README.md` (A): Dokumentation des gesicherten Arbeitsstands.
- `design/zeki-3d/Zeki_3D.glb` (A): Bearbeitbares echtes räumliches Modell mit Gelenken.
- `design/zeki-3d/atlas.svg` (A): Native Vektordarstellung bzw. Vektorgrundlage für Zeki und Marke.
- `design/zeki-3d/atlas.webp` (A): Lokale Modellfarbe oder vorbereitete räumliche Bewegungsfolge, unter 300 KB.
- `design/zeki-3d/index.html` (A): Lokale Modell- oder Mimik-Abnahmeseite.
- `design/zeki-3d/modell.json` (A): Meshdaten beziehungsweise gemessener Regelprüfstand.
- `design/zeki-3d/modell.py` (A): Reproduzierbarer Generator, Renderer oder Browser-Prüfung.
- `design/zeki-3d/renderer.js` (A): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `design/zeki-3d/requirements.txt` (A): Lizenz oder Entwicklungsabhängigkeiten.
- `design/zeki-3d/tokens.css` (A): Farbtokens und Darstellungs-/Bewegungsregeln.
- `design/zeki-3d/traced-high.svg` (A): Native Vektordarstellung bzw. Vektorgrundlage für Zeki und Marke.
- `design/zeki-3d/traced-low.svg` (A): Native Vektordarstellung bzw. Vektorgrundlage für Zeki und Marke.
- `design/zeki-abnahme.html` (M): Lokale Modell- oder Mimik-Abnahmeseite.
- `design/zeki-abnahme.png` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `design/zeki-animationen/atmen.gif` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `design/zeki-animationen/grinsen.gif` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `design/zeki-animationen/hand.gif` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `design/zeki-animationen/kopfschuetteln.gif` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `design/zeki-animationen/nicken.gif` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `design/zeki-animationen/zwinkern.gif` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `design/zeki-app-heute.png` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `design/zeki-app-start.png` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `design/zeki-vergleich.png` (D): Entfernt; alte JPEG-Fototeile beziehungsweise alte Abnahme-PNG/GIFs gehören nicht zur neuen Lieferung.
- `icons/logo-zeichen.svg` (M): Native Vektordarstellung bzw. Vektorgrundlage für Zeki und Marke.
- `icons/logo.svg` (M): Native Vektordarstellung bzw. Vektorgrundlage für Zeki und Marke.
- `js/fassung.js` (M): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `js/gastrocash-brand.js` (M): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `js/lang/de.js` (M): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `js/lang/en.js` (M): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `js/lang/tr.js` (M): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `js/zeki-bilder.js` (A): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `js/zeki-svg.js` (M): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `sw.js` (M): Darstellungsquelle, lokale Bildzuordnung oder getrennte Vorschautexte.
- `tests/gastrocash-brand.test.mjs` (M): Prüfung der aktuellen Vektor-/Marken-Schnittstelle.
- `tests/regeln_stand.json` (M): Meshdaten beziehungsweise gemessener Regelprüfstand.
- `tests/zeki.test.mjs` (M): Prüfung der aktuellen Vektor-/Marken-Schnittstelle.
- `tests/zeki_browser.py` (M): Reproduzierbarer Generator, Renderer oder Browser-Prüfung.
- `tools/zeki_bauen.py` (M): Reproduzierbarer Generator, Renderer oder Browser-Prüfung.
- `tools/zeki_front_3d.py` (A): Reproduzierbarer Generator, Renderer oder Browser-Prüfung.
- `tools/zeki_rendern.py` (A): Reproduzierbarer Generator, Renderer oder Browser-Prüfung.
- `bruecke/an-zoro/2026-10-26-zeki-uebergabe.md` (A): Verbindliche Schnittstelle, Dateiliste, Freigabe, Grenzen und Prüfstand dieser Lieferung.

- `tools/zeki_marke.py` (A): Erzeugt die statischen Marken-SVGs und gemeinsamen Zustand-Klassen nach dem Rendern.

## Aktueller GitHub-Status nach Abschluss

GitHub meldet PR #16 als nicht direkt zusammenführbar (mergeable=false). Die sichtbaren Darstellungs-Commits sind gesichert, aber Konfliktauflösung mit der neueren main-Fassung und der rote Berlin-Speichertest bleiben vor einer Übernahme offen. Daher keine unmittelbare Merge-Freigabe. Geschützte Zeki-Sätze und Rechenlogik nicht durch den älteren Branchstand ersetzen.
