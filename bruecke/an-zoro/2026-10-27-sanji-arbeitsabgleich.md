# Sanji – einmaliger Arbeitsabgleich und 3-Tage-Aufteilung
Stand: 27.10.2026. Ziel: offener visueller Arbeitsblock bis 30.10.2026 ohne Doppelarbeit schließen.
Prüfbasis: `main` bei a0c1b91b16ce34b19034c710b213a23bf2f6b1fa.
**WICHTIG:** Dies ist nur eine technische/gestalterische Übergabe, KEINE neue Gestaltung, KEINE App-Änderung, KEINE Freigabe zur Veröffentlichung. Der Kapitän hat die zuletzt von Sanji erzeugten fremden Ladenwahl-Mockups ausdrücklich verworfen. Nicht verwenden.

## 1. Nachgeprüft: bereits vorhanden – nicht neu produzieren
- Original-Zeki liegt als Vektor in `assets/brand/zeki.svg`, echtes gesichertes 3D-Quellmodell in `design/zeki-3d/Zeki_3D.glb`; PR #16 ist inhaltlich in main übernommen. Sieben bisherige Bewegungsfolgen, keine komplette abgenommene Intro-Bewegung.
- Grundschablone und Zeki-Führung: `css/zeki.css`, `js/screens/zeki_takt.js`, `js/screens/onboarding.js`; laufende Zoro-Arbeit ist auf main. Nicht auf dem alten Branch `zoro/schablone-2026-10-27` weiterbauen (liegt 26 Commits hinter main).
- 41 Produktvisualisierungen von Sanji/PR #17 sind durch einen **separaten Integrationscommit auf main** gekommen (991650637). PR-Status „nicht gemerged“ bedeutet **nicht**, dass die Assets fehlen. Nicht doppelt herstellen.
- Acht Original-Ladenbilder `foto/laden-{doener,imbiss,pizza,asia,foodtruck,baeckerei,kiosk,cafe}.webp` auf main nachgewiesen; 9. Variante `laden-anders.webp` laut Bildliste noch fehlend.
- Alle 18 Sprachmodule und bestehende Einrichtungs-/Ladenwege sind vorhanden; zuletzt Zoros Text- und Rechtschreibkorrekturen bis a0c1b91.

## 2. Lücken exakt gegen aktuellen main geprüft
Quelle Nachtauftrag `Sanji_Nachtauftrag_2026-10-27_Uebergabe.md` (27 WebP + sechs SVG). Bei individueller Existenzprüfung in main:
- **26 von 27 neuen WebP-Zielpfaden fehlen**, vorhanden: `foto/g-seele.webp` (Motiv-Inhalt gesondert gegen den Nachtauftrag „Seele mit Schinken/Käse“ prüfen; nicht überschreiben).
- 1 Kühlschrank: `foto/k-kuehlschrank-lebensmittel-foto.webp` fehlt.
- 8 zusätzliche Gerichte (ohne `g-seele`): `g-haehnchendoener`, `g-halloumi-im-brot`, `g-maccaroni-ueberbacken`, `g-sigara-boeregi`, `g-koefte-teller`, `g-baklava`, `g-kuenefe`, `g-kumpir`.
- 10 Reinigungsmotive: `p-arbeitsflaechen`, `p-boden-ablauf`, `p-handwaschbecken`, `p-grill`, `p-doenergrill`, `p-fritteuse`, `p-kuehlschrank-innen`, `p-dunstabzug`, `p-spuele`, `p-muelltonnen`.
- 7 Übrig-Motive: `u-spiess-rest`, `u-pommes`, `u-reis`, `u-salat-theke`, `u-sossen`, `u-teig`, `l-anderes-foto`.
- **Alle sechs** `bilder/b-{personalessen,geschenkt,chef-einladung,mhd,geraet-kaputt,bruch}.svg` fehlen unter den exakt beauftragten Pfaden.
- Die im Nachtauftrag vorgesehenen produktiven Zweige `sanji/fotos-2026-10-27` und `sanji/zeki-bewegung-2026-10-27` waren beim Branch-Abgleich noch nicht vorhanden. Ergebnis gilt für GitHub-main, nicht für mögliche unübergebene Work-Dateien.
- `bruecke/an-sanji/BILDLISTE.md` ist Stand 26.10. und nennt 708 Bilder / 496 fehlend, **nicht** als heutige vollständige Bilanz ausgeben. Neuere Vorgabe bei diesen 27 Motiven: 800×800 WebP <120 KB und „ki-visualisierung“ in bildherkunft.json statt alter generischer 520×390-Anleitung.

## 3. Ladenwahl: erweitern, nicht redesignen
Aktueller Code `js/screens/onboarding.js`:
- `LADEN_ARTEN`: genau neun Optionen; jede verknüpft `format` und `kuechen`.
- `ladenSchnell.view`: bestehendes Foto-Kachelraster, Name über `stand.betrieb.name`, Auswahl über `stand.ladenArt` und `ladenArtSetzen(stand, a)`. Derzeit **Einfachauswahl**.
- **ACHTUNG: 3×3 ist schon erledigt!** In `css/schnell.css` steht `.s2arten { grid-template-columns: repeat(3, 1fr); gap: 8px; }`. Auch der Ladenname (`.s2name`, `stand.betrieb.name`) und die acht Originalbilder sind bereits eingebaut. Kein CSS-/UI-Neubau erforderlich.
- Auftrag Kapitän: bestehenden Bildschirm **optisch unverändert** lassen; **bis zu zwei Kategorien kombinierbar** (Beispiele Foodtruck + Burger und Döner + Pizza); **bei dritter Auswahl** Zeki fragt im Folgeschritt präziser nach. Nicht plötzlich den dritten Tipp verwerfen. Figur nicht ersetzen.
- **Auftrag Zoro / Datenvertrag:** Neue Auswahl darf `format` und `kuechen` nicht blind überschreiben: Foodtruck beschreibt Betriebsformat, Burger das Angebot; Döner + Pizza sind zwei Angebote im selben Format. Prüfen, ob `ladenArt`, `betrieb.format`, `betrieb.kuechen`, Mehr-Laden-Verwaltung, Sicherung/Import und startseitige Vorlagen kompatibel geändert werden. Kein zweiter echter Filialdatensatz durch eine Kombinationsauswahl. Erst Zoros Feldvertrag, dann bestehende Bildschirmansicht minimal erweitern.
- Sanji liefert **kein** neues eigenständiges App-Design, keinen selbstgebauten Zeki, keine Overlay-Ersatzfigur; Abnahme nur mit Screenshot aus echter App.

## 4. Zeki: bestehende Quelle statt neue Figur
- Zekis visuelle Identität, Proportionen und Materialien bleiben unverändert.
- Verbindliche spätere Kapitäns-Korrektur des alten Zielbilds: Zeki **wirft keine Karte**. Er läuft mit 4–5 glaubwürdigen Schritten von rechts ein, dreht vollständig, holt **mit linker Hand sein kleines Kellner-Notizbuch aus der eigenen Schürzentasche** und hält es; später schreibt er mit der rechten Hand. Kein Pop-in/Größensprung; keine WhatsApp-Sprechblase.
- Bewegungspaket offen: zeigen links/rechts/oben/unten, Kopf drehen, warten, auftreten/abgehen, Schürze/Notizbuch (statt Wurf), Daumen, nachdenken, weicher Bodenschatten. Kein fröhliches Leerlaufzwinkern. Alte 5×5-Spritevorgabe ist das Assetformat; für eine lückenlose längere Intro-Szene reicht diese nicht automatisch als vollständiger Bewegungsnachweis.
- Work-Entwürfe separat gegen GitHub-Original vergleichen, bevor Zoro irgendetwas übernimmt. Nur abgenommene Animationen integrieren.

## 5. Arbeitsaufteilung und harte Reihenfolge bis 30.10.
**Block A – sofort in diesem Chat (Sanji):** Repository-Wahrheit/fehlende Pfade prüfen; bestehende Designvorgaben und Bildherkunft abgleichen; Zoros konkreten Datenvertragsbedarf dokumentieren. Kein neues Mockup.
**Block B – nach Work-Verfügbarkeit parallel:** Sanji/Work prüft vorhandene 3D-Motions-Quellen und bearbeitet eine echte, zusammenhängende Intro-Bewegung als visuelle Abnahme (Originalmodell, Notizbuch); **nicht** App-Baustein simulieren. Zoro parallel: Entscheid zur Speicherung kombinierter Ladenarten sowie Anbindung an vorhandene neun Kacheln, ohne Facelift-Abweichung.
**Block C – Bildproduktion:** Freigabemotiv Kühlschrank gemäß Nachtauftrag mit Original-PR-#17-Look; nach Kapitäns-Ja die noch offenen Zielpfade in wenigen zusammenhängenden Chargen, nicht einzelne Chats/Dateien für jede Kleinigkeit; zuerst sichtbare Pilotlücken, Putzbilder und Müll/Übrig-Motive. Den vorhandenen `g-seele.webp` nicht ersetzen, ohne Bildinhalt zu prüfen. Herkunft/Größe/Transparenz prüfen.
**Block D – Abschlussprüfung bis 30.10.:** Erst nach abgenommenen Visuals Einbau durch Zoro; echter 390×844- und 360×800-Browsertest DE/TR/EN + RTL-Beispiel, Klicks, Speicherung, import/export, Offline, Reduced Motion, keine verdeckten Tasten, keine veränderten Berechnungen. Screenshots müssen **aus der App** stammen. Erledigt erst nach Echttest und Kapitäns-Abnahme.

## 6. Nicht parallel erneut anfangen
- Keine neue Stilfindung, kein „Ladenwahl-von-null“-HTML, kein Zeki-Redesign, keine erneute 41er-Bildserie.
- Kein Rechenkern und keine Übersetzungspakete durch Sanji übernehmen – Zoro führt.
- Nicht 496 historische Bildlücken als Drei-Tage-Pflicht ausgeben; fest beauftragter Nachtumfang und sichtbare Pilotstrecke haben Vorrang.
- Kein Commit in main, kein Merge, kein Live-Gang durch Sanji.

## 7. Freigabe- und Prüfstatus
- Dieser Übergabebranch verändert **nur dieses Markdown**, keine App-Dateien.
- GitHub-Dateiexistenz und Commit-Verlauf geprüft. Kein UI-/Node-/Service-Worker-Testlauf für diese Dokumentation ausgeführt. Keine visuelle Abnahme oder Produktionsfreigabe behauptet.
- Eigentümer: Sanji = visuelle Qualität/Assets, Zoro = Datenvertrag/Code/Tests, Kapitän = endgültige visuelle Freigabe.
