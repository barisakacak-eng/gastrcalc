# Sanji – Arbeitsprotokoll

## 21.10.2026

| Bildschirm | Fassung | Branch / PR | Baris |
| --- | --- | --- | --- |
| L2 Müll: Laden und Station | v2 | [sanji/L2-muell](https://github.com/barisakacak-eng/gastrcalc/tree/sanji/L2-muell) · [PR #2](https://github.com/barisakacak-eng/gastrcalc/pull/2) | Ja/Kritik offen |
| L3 Kühlung | v2 | [sanji/L3-kuehlung](https://github.com/barisakacak-eng/gastrcalc/tree/sanji/L3-kuehlung) · [PR #4](https://github.com/barisakacak-eng/gastrcalc/pull/4) | Ja/Kritik offen |

- L2-Commit: `c5a0a6511e41ffbf6b5446036b1c9e14f6eaecb5`. Technische Prüfung durch Zoro bestätigt; keine Gestaltungsfreigabe vorweggenommen.
- L3-Commit: `ded7685a33f6aa10cc9603876a063d50677a9980`. Messung, Maßnahme, ggf. Ware und Nachkontrolle als kurze Schritte. Korrektur im offenen Rundgang und Fortsetzen bleiben möglich; Personal-Einstieg übernimmt die echte Schicht-Person.
- Main unverändert: `ffc016018a10e3e7af831555d072e59c1289091a`. Alle Bildschirm-Branches stammen von diesem main; kein Merge durch Sanji.
- Keine Nachricht an Zoro je Schritt. Der vollständige FÜR-ZORO-Block mit Quellen je Element steht in den Bildschirm-PRs.

### Prüfungen

- L2 damals: Node jeweils UTC/Berlin: 629 bestanden, 5 übersprungen, 2 bekannte Fehler. GitHub-UI-Regelprüfung bei 360/390 px und Personal-Durchlauf bestanden.
- L3 aktuell: `TZ=UTC node --test tests/*.mjs` und `TZ=Europe/Berlin node --test tests/*.mjs`: jeweils **636 Tests, 628 bestanden, 5 übersprungen, 3 fehlgeschlagen**. Keine zusätzlichen L3-Fehler im Node-Lauf.
- L3: 548 tatsächliche Render-Zustände in allen 18 Sprachen; bis 15 Wörter einschließlich sichtbarer Navigation, Namen und Platzhalter (Zahlen sind keine Wörter). Umfangreiche frei gewählte Namen können die Zahl erhöhen. Eigene Interaktionsprüfung: Eintragen, leere/abweichende Werte ohne Maßnahme sperren, Korrektur ohne Doppelung, Unterbrechen/Fortsetzen, Einzelmessung, Nachkontrolle, Müll erst bei Abschluss, fehlender Preis bleibt offen, Personal ohne Euro und mit richtiger Schicht-Person.
- `node tools/sprachpruefung.mjs`: alle 18 strukturell ok; `git diff --check`: ok.
- L3 v1: Browser-Regelprüfung 360/390 px und Personal-Durchlauf bestanden, [Lauf 39579461913](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39579461913).
- L3 endgültiger v2-Commit: [Lauf 39580453198](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39580453198), Browser-Ergebnis wird nach Abschluss ergänzt.
- Offline Ansichtsdatei und einzelne neue Mess-Unterseiten im Browser: **nicht geprüft**. Keine gemalten Mockups, keine neuen Bilder.

### FEHLT gesammelt

1. **Service-Worker-Version muss erhöht werden**: Zoro beim Mergen. Sanji ändert SW und Fassungsdatei nicht.
2. Bekannter Lieferanten-Test bleibt rot, laut Zoro bereits auf main; Bearbeitung bei Zoro.
3. **Zusätzlich heute rot auf unverändertem main:** `tests/aktion_plan.test.mjs:232`, „Aktionen & Haltbarkeit“. Ende im Test ist fest 2026-10-20, Vorschlag beginnt am tatsächlichen Tag 2026-10-21; `bis < von` wird abgewiesen. Im unveränderten Basis-Worktree bei ffc0160 reproduziert, betroffene Dateien sind unverändert. Nicht als L3-Fehler versteckt. Da Tests/Rechenwerk für Sanji gesperrt sind, hier nicht repariert.
4. Wegen Punkt 3 ist der Teststand insgesamt rot. Nach der Regel „jeder andere rote Test vor dem Weitergehen beheben“ beginnt L4 noch nicht. Keine stillschweigende zusätzliche Ausnahme angenommen.
5. L3: `kuehlStatus.heuteGemessen` zählt auch protokollierte Nicht-Messungen; bestehende Bezeichnung übernommen, Rechenwerk nicht verändert.
6. L3: vorhandene app.js-Meldung bei ungültiger Temperatur bleibt. Abschlussmeldung im Laden entfällt durch bestehenden allgemeinen Speichern-Pfad (900 ms, sofort beim Verlassen); damit entfällt dort auch das an den Abschluss-String gebundene Ereignis `rundgang-fertig`. Dieses Verhalten bei der Codeprüfung beachten.
7. L2 Müll-Station: nur flüchtiger Modus, kein dauerhafter Kiosk und keine Waagen-Anbindung. Gewicht bleibt inaktiv.
8. Neue Texte: DE/TR/EN geprüft; übrige 15 Sprachen: **Muttersprachliche Prüfung offen**.
9. Eigene CSS-Abschnitte pro Bildschirm und Sprachdateien können beim späteren Zusammenführen Anpassungen brauchen. Keine Sammeländerung auf main.

### Tagesmappe und nächste Arbeit

- Tagesmappe bei der Abendmeldung: L2 v2 (Laden + Station) und L3 v2. Nur derselbe Branch-Code mit eingebetteten Beispieldaten und Ressourcen, offline, je Bildschirm 390 px. Noch keine Tagesmappe ausgeliefert.
- Baris hat zu den Bildschirmfassungen noch kein Ja und keine Kritik gegeben. Technische Korrekturen vor der ersten Tagesmappe sind keine abgelehnten Entwürfe.
- Nach Auflösung des zusätzlichen Testhindernisses: L4 Putzen, L5 Karte, L6 Tag abschließen, P1 Personal-Start; danach ggf. B1 Büro-Start und B3 Listen.
- Für Freitag: PR-Liste mit Freigabe/Kritik/zurückgestellt sowie diese FEHLT-Liste und Risiken fortschreiben. Freigaben nur nach tatsächlichem Ja von Baris eintragen.

### IDEE – NICHT IM ENTWURF

Keine.


## 22.10.2026 – drei Nutzenversprechen und Freitag-Umsteuerung

- **Kapitän bestätigt neue Produktrichtung:** Geld pro Tag/Gericht, weniger Müll und gebundenes Lagergeld, Papierkram vorbereiten. **Döner- und Burgerläden zuerst**.
- **Priorität:** L1 → L2/Station → L5 → L6 → B1/Ordner/Inventur → L3 → L4 → P1.
- **NEU – Felder lt. Zoro 22.10.:** `nutzen` (nur gemessene, belegte Summen; sonst „Messung läuft seit …“) und `hinweis` (geprüfte Steueraussage, Fundstelle, 25 Wörter, Disclaimer). Keine eigenen Berechnungen oder Steuerbehauptungen durch Sanji.
- **PIN/Codes testweise aus** baut Zoro. **DATEV, Menütafel, Aktionen, Kasse, Getränke-Feinheiten, weitere Sprachen** bleiben geparkt.
- **Visual-Vertrag aktualisiert durch Kapitänsentscheidungen 21./22.10.:** aktuelle fünf Facelift-1.0-Referenzen und die drei Nutzenversprechen haben bei Widerspruch Vorrang vor altem Stand/Design B. Kein Merge ohne Go.
- **Bestehende Piktogramme wiederverwenden**, Burger-Rohwaren ergänzen; keine externen KI-Food-Fotos.
- **Keine Doppelrecherche**: Franky prüft Steuern, Zoro Rechenkern, Sanji UI.
- **Entscheidungsvorlage und Versprechen-Abgleich:** [docs/sanji-facelift-versprechen-2026-10-22.md](sanji-facelift-versprechen-2026-10-22.md). Enthält zwei umsetzbare Ansätze für L1 und B1, Zoro-Schnittstellen, Wortbudget-Konflikt und Freigabebedingungen.
- **PR #5** bleibt produktiver Facelift-Branch, dieser Protokoll-Branch archiviert nur Entscheidungen; keine App-Funktionsänderung vom 22.10. implementiert.


## 22.10.2026 – Facelift B/C freigegeben

- **Design 1.0 freigegeben:** B „Waste zu Gewinn“ als BILDSPRACHE UND BEDIENBASIS, C „Chef-Autopilot“ nur als Ordner-/Büro-/Einstellungs-Erweiterung. Maßstab ist die von Baris bestätigte Kombination aus B + C. Keine fiktiven Papier-Automationen, Steueransprüche oder Fantasie-Ersparnisse aus den KI-Konzeptbildern übernehmen.
- **Direkt implementiert:** `sanji/facelift-1-0-integration`, [PR #5](https://github.com/barisakacak-eng/gastrcalc/pull/5). In `css/facelift-v1.css`: L2 mit grünem Tageswert und 3 Premium-Fotospalten; Mengen in den echten Rohwaren-/Gerichtskacheln (früheres Paket 7); B1 mit 3 echten Ordner-Statuszeilen, vier bestehenden Funktionsbereichen und übersichtlicheren Einstellungs-/Inventur-Karten. Handlungen bleiben gleich. Die Marge in L5 ist ebenfalls bereits direkt aus dem Rechenkern sichtbar.
- **Werbepsychologie:** Das grüne Hero signalisiert Kontrolle, aber **niemals fiktive Einsparungen**. L2 vermittelt „Erfassen verhindert Blindflug“; L5 „was nach Kosten bleibt“; B1 „ich finde meine Unterlagen“. Zoros Nutzen-Schema und Frankys Steuerhinweise kommen später, nicht heute erfunden.
- **Praxischeck:** echte Playwright-Browseraufnahme aus GitHub Actions, Handy 390x844 und 360x780. Ein Screenshot für den Kapitän, kein ständiges ZIP. Foto- und Piktogramm-Dateien sind lokal, keine Online-Dienste. Schrift DM Serif bereits OFL-lokal.
- **Freitag:** Kein Direktauftrag an Zoro. PR-Files und dieser Protokollpunkt reichen als Sammelstand, nur finalen Teststatus/Fassung nach CI eintragen. Kein Merge auf `main` ohne Go.


## 22.10.2026 – Pilotgalerie: reale Bildzuordnung korrigiert

- **Direkte Umsetzung:** PR #5 im Branch `sanji/facelift-1-0-integration`. `js/data/fotos.js` aktiviert 5 vorhandene, visuell kontrollierte Pilotfotos: Burger-Bun, Vollkorn-Bun, Eisbergsalat, Salatgurke, Pide-Brot. Die 229 echten Bilder im Offlinekatalog sind nicht automatisch gleichbedeutend mit freigegebener Bildsprache; übrige Altbilder nicht blind freischalten.
- **Motiv-Schutz:** `js/bilder.js` vermeidet Wrap-Foto für „Döner Kebab“; Burgerbun bekommt das passende Foto; Cheddar, Burgersoße und Pickles bekommen erkennbare SVG statt falscher Pizzakäse-/Flaschen-Fotos. `bilder/r-pickles.svg` ergänzt. `css/facelift-v1.css` nutzt für den Heute-Hero ein Döner-im-Brot-Foto, nicht den irreführend beschrifteten Dürüm.
- **Tests:** `tests/pilotbilder.test.mjs` schützt Bildwahl und Existenz der lokalen Assets; der Offline-Fingerabdruck und Service Worker wurden angeglichen. **Keine Rechenlogik und keine neuen Kennzahlen.**
- **Noch OFFEN:** Die vom Kapitän zuletzt bestätigten korrigierten Foto-Originalmotive für Döner, Teller und die Smash-Burger-Produkte sind bisher nicht als eigenständige WebP im GitHub-Branch enthalten. Die aktuellen vorhandenen Familienfotos sind nur ein fachlich passender Zwischenstand, nicht als 1:1-Übernahme der Referenz ausgeben. Dafür Ziel-Dateien `foto/g-doener.webp`, `foto/g-doener-teller.webp`, `foto/g-smash-burger.webp`, `foto/r-fladenbrot.webp` aus freigegebenen Einzelmotiven ersetzen/ergänzen; danach Bilddateien und `js/data/fotos.js`/`sw.js` prüfen. Keine weiteren Konzepttafeln.
- **GitHub-Aufräumen:** `main` bleibt unverändert. Die neue Bild-UI wird nicht veröffentlicht, solange fachliche Tests rot sind; Zoro bekommt vor Freitag keinen Auftrag.


## 22.10.2026 – Freigegebene Premium-Pilotfotos direkt im App-Branch

- **Freigabequelle:** Baris' bestätigte korrigierte Bildtafel vom 22.10. (Dönerbrot statt Gyros/Pita, Dönerteller mit Fleisch statt Salat-Bowl). Die 12 Motive wurden **aus den tatsächlich freigegebenen Original-Galeriebildern** separat als 520×390 WebP exportiert, nicht neu per KI halluziniert.
- **Binärdateien in GitHub PR #5:** `foto/g-doener.webp`, `foto/g-doener-teller.webp`, `foto/g-burger.webp`, `foto/g-cheeseburger.webp`, `foto/g-double-smash-burger.webp`, `foto/g-burger-menue.webp`, `foto/r-fladenbrot.webp`, `foto/r-burger-bun.webp`, `foto/r-patty.webp`, `foto/r-cheddar.webp`, `foto/r-burgersauce.webp`, `foto/r-pickles.webp`. Bestehende 9 wurden ersetzt, neue 3 ergänzt.
- **Echte App-Verknüpfung:** `js/data/fotos.js` lässt neue Bilder zu. `js/bilder.js` ordnet Cheeseburger, Double/Doppel Smash, Burger-Menü, Burgersoße, Cheddar und Pickles ihren echten Bildern zu. `js/screens/home.js` wählt anhand vorhandener `stand.ladenArt` und `stand.betrieb.kuechen` zwischen `pilot-doener` und `pilot-burger`; `css/facelift-v1.css` zeigt den zutreffenden echten Hero.
- **Offline:** `sw.js` mit aktualisiertem Hash für alle zwölf WebP-Dateien; `tools/sw_liste.py` wurde so geschützt, dass bei künftigen Regenerationen die lokale DM-Serif-TTF nicht wieder aus der Offline-Dateiliste verschwindet.
- **Tests:** `tests/pilotbilder.test.mjs` sichert Zuordnungen, `tests/heute.test.mjs` sichert die Ladenart des Hero-Bilds. Der endgültige CI-Stand wird im PR dokumentiert, keine Tests der Rechenlogik abgeschwächt. `main`/Live unverändert, kein Go.
- **Effizienz:** Keine Zwischenkonzeptgrafik, keine neue Bildtafelfassung, nur direkt nutzbare Bilddateien im Branch. Zoro erhält bis Freitag keine Nachricht.


## 22.10.2026 – Paket 9: echte Müllstation + Premium-Karte

**Freigabegrundlage:** B = klare, warme Premium-Bildwelt für die Schicht; C = geordnete Büro-/Einstellungsebene. Nicht zurück zu alten Motiven.

**Direkt umgesetzt (PR #5, Branch `sanji/facelift-1-0-integration`):**
- L2 Müllstation als echte Vollbildansicht mit 5 häufigen Waren + Andere, dem vorhandenen Müll-Rechenkern, Tipp, Mengenblatt und Rückgängig. Kein Euro/keine Leiste, „— kg“ ist absichtlich nicht aktiv.
- In `js/screens/muell.js` und `css/facelift-v1.css` bestehende Premium-Fotoauswahl wiederverwendet. Station kein getrennter Datenbestand.
- L5 Karte: größere lokale Gerichts-Fotos, echte Marge/Restbetrag aus Rechenkern, keine neuen Kennzahlen.
- Nach echtem Browservergleich wurden doppelte Ellipsen auf dem Mengenknopf beseitigt. Screenshot im Sanji-Chat `Sanji_2026-10-22_Muellstation_Facelift_Live.png`, 390 × 844 Browsergröße (exportiert mit 2× Gerätedichte).
- Tests `tests/muellstation.test.mjs` und Browser-Prüflauf `tests/regeln.py` ergänzt. Fassung 2026-10-22.07, Offline-Dateifingerabdruck `ef01d59c0531`.
- 635 bestandene Node-Tests, drei alte fachliche Tests noch rot. **Nicht nach main mergen**, bis sie geklärt sind und der Kapitän ausdrücklich freigibt.

**Versprechen-Abgleich:** L2 Müllstation → weniger Lebensmittel wegwerfen: teilweise (Erfassung, keine belegte Ersparnis); L5 Karte → erkennen, welches Gericht Geld bringt: ja bei vollständig belegten Kalkulationswerten, sonst graue/ungefähre Anzeige. Keine Steuerintegration ohne Franky.

**Offen:** Mit Pilotdaten befüllte Premium-Gerichtskarten als realen Browser-Screenshot abnehmen; aktuelle Browser-Testkarte hat noch keine Gerichte. Zoro bekommt vor Freitag keine einzelne Nachricht.


## 22.10.2026 – Paket 10: befüllte Pilotkarten sichtbar und geprüft

**Kapitäns-Go: Döner und Smash Burger parallel priorisieren, bisherige Premium-Bildwelt 1:1 erhalten.**
- Echte Playwright-Screenshots mit 4 Dönergerichten + 4 Smash-Burger-Gerichten bei 390×844 und 360×780. Keine Entwurfsgrafiken: `Sanji_2026-10-22_Doppelpilloten_Karte_Echt.png` im Chat (zwei echte App-Aufnahmen nebeneinander, Hinweis BEISPIELDATEN separat davor). Browser-Quelle: [Actions-Lauf 39760842660](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39760842660), Archiv `facelift-browser-39760842660`, Bilder `pilot_karte_doener_390x844.png`, `pilot_karte_burger_390x844.png` und ihre 360er Varianten.
- Bemerkt und **direkt korrigiert**: Dönerteller zeigte im fertigen Karten-Raster den Brot-Döner, weil ohne `rezeptFamilie` die Name→Bild-Zuordnung nicht griff. Jetzt `js/bilder.js`: Dönerteller und Döner Box explizit zu ihren Premium-WebP. Regression in `tests/pilotbilder.test.mjs`.
- Karte zeigt echte engine-basierte Margen-Ampel, Preis und `≈`-Restbetrag, bei fehlenden echten Betriebskosten kein Anspruch auf reale Einsparung.
- Wiederverwendbare isolierte Browsertestdaten `tests/bilder/pilot/visuelle_testdaten_2026-10-22.json`, `tests/pilot_karten_browser.py`. Start nur bei `SANJI_PILOT_BILDER=1`, um normale CI schnell zu halten. Diese Beispiele niemals in einen Kundenbetrieb übernehmen.
- Fassung `2026-10-22.08`, Offline-Fingerabdruck `13e2a2d6adc5`. Keine Rechenlogik geändert, `main` und Live-App nicht verändert, alles liegt in PR #5 bis Freigabe.
- Versprechen-Abgleich: L5 Karte → 1 (welches Gericht Geld bringt): ja mit verlässlichen Eingaben, Testwerte ≈. L2 Müllstation → 2: Erfassung ja, belegte Ersparnis offen. B1 Büro → 3: geordnet, echte Automationsbelege offen.


## 22.10.2026 – Paket 11: L6 Tag abschließen

- Direkt umgesetzt im PR #5, Branch `sanji/facelift-1-0-integration`. `js/screens/abschluss.js`: Drei antippbare Statuskarten vor Abschluss, danach echter Zähler gestern/heute, vorhandene Bilanzwerte und korrekter Vergleich Umsatz mit dem selben Wochentag letzte Woche. Kein Gewinn behauptet. Drei Detailwerte (Fixkosten, Müll, Kühlung) sind unter dem vorhandenen Sprachschlüssel `start.mehr` als aufklappbare Details erhalten.
- `css/facelift-v1.css`: warme B-Premium-Bilanz (grüne Zielkarte, weiße Kurzbilanz, ruhige Vorwochenkarte, orangefarbene Rückkehraktion), je 390x844 / 360x780. Vor dem Abschluss ein Hauptknopf, kein neuer Büro-/Steuerprozess.
- Erster echter Browser-Lauf vor Einklappen zeigte, dass die Rückkehraktion unterhalb des Viewports lag. Deshalb das Detail-Einklappen und kompakteres Layout in der finalen Fassung implementiert. **Letzte visuelle Fassung noch nicht durch Browserlauf verifiziert**: GitHub Actions installierte Playwright/Chromium ungewöhnlich lange, Läufe bei weiteren Commits abgebrochen. Der Test ist vorbereitet in `tests/abschluss_browser.py` und optional über `SANJI_ABSCHLUSS_BILDER=1` in `tests/regeln.py` ausführbar. Keine falsche Abnahme melden.
- Fassung `2026-10-22.10`, Offline-Dateifingerabdruck `d13c2839c5bb` aus Node-Lauf, temporärer Test entfernt. 635 Node-Tests bestanden, drei alte Fachtests rot; zusätzlicher SW-Hash-Fehler der Zwischenfassung mit oben stehendem Hash behoben (Final-Head-Test muss noch laufen).
- Versprechen-Abgleich: L6 dient dem Versprechen (1) und zeigt die tägliche Zählerbewegung. **Teilweise**, weil Umsatzentwicklung/Schätzgrundlagen nicht mit sicherem Profit gleichgesetzt werden dürfen; Disclaimer auf dem Screen sichtbar.
- Keine neue ZIP, keine Meldung an Zoro vor Freitag, `main` unverändert, kein Merge ohne Go und grüne Checks.


## 22.10.2026 – L6: positiver Abstand bis null

- Keine Doppelarbeit: L6 Premium-Abschluss war bereits im Facelift-Branch fertig. Sanji hat die vorher nur optional gezeigte letzte Bilanzfassung direkt im echten Browser bei 390/360 überprüft.
- **Fachlich fair und psychologisch klar:** Der negative Monats-Zähler ist kein automatisch verdientes Minus. `js/screens/abschluss.js` zeigt nun bei negativem Stand `heute.bisNullFehlen` und den **Betrag ohne Minus**; über null `heute.ueberNull` mit Plus. `vor` und `nach` stammen unverändert aus `tagesBilanz()`, keine Rechenregel geändert. Kalkulatorisch-Disclaimer bleibt.
- `tests/abschluss_browser.py` prüft explizit das neue Label und dass „noch zu deckender Betrag“ nicht negativ als Hauptzahl erscheint. Der Screenshot erhält außerhalb der App ein klares Beispiel-Datenetikett; die Testwerte sind künstlich.
- **Stand vor Abschlussprüfung:** Fassung `2026-10-22.11`, laufender GitHub-Prüflauf [39778035649](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39778035649). Der einmalige L6-Test ist dafür aktiviert und muss nach der Abnahme wieder optional werden. Die Offline-Prüfsumme ist nach CSS/JS-Korrekturen anhand der tatsächlich gelisteten Dateien neu einzutragen.
- Versprechen 1: Abstand zur Kostendeckung auf einen Blick **ja**; echte Gewinnaussage **teilweise**, weil einige Kosten modelliert/geschätzt bleiben. Eine einzige Haupthandlung, weiterhin ohne Steuer-/Franky-Automatik. Kein Merge und keine zusätzliche ZIP.


### L6 Prüfabschluss, 22.10.2026
- Echte Browserprüfung **bestanden** im Lauf [39778827930](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39778827930), Test `SANJI_ABSCHLUSS_BILDER=1`. Screenshot als EIN Bild `Sanji_2026-10-22_L6_Tagabschluss_Live.png` am 22.10. von Sanji aus der GitHub-Browseraufnahme erstellt; 390×844, „BROWSERTEST · BEISPIELDATEN“ außerhalb der App deutlich markiert.
- Erkenntnis aus echter Aufnahme: `Zähler heute −98€` klingt nach Verlust, obwohl `98€` bis zur Kostendeckung fehlen; Label korrigiert auf **`Bis null fehlen 98€`**, ohne eine Berechnungsregel zu ändern. Vorher/nachher, Fortschritt und `kalkulatorisch, kein Kontostand` bleiben erhalten.
- Visueller Fehler des ersten Tests (technischer Schlüssel statt Label) ebenfalls behoben: `cockpit.bisNullFehlen` statt `heute.bisNullFehlen`; auch `cockpit.ueberNull`. Browser prüft Text.
- Finale Version `2026-10-22.11`, Service-Worker Fingerabdruck `3f2cee1d3f3e`, temporären Prüfer entfernt, aufwendiger L6-Browsertest danach wieder optional geschaltet. Node-Final-Head 635 Tests bestanden, 5 übersprungen und nur die **3 bekannten fachlichen Rotfälle** (Aktionen/Haltbarkeit, Zweitlieferant, Büro-Menütafel). `main` unverändert, **kein Merge** ohne Go.
- Versprechen-Abgleich L6: in einem Blick **ja** für Fortschritt zur Kostendeckung; **teilweise** für tatsächlich verdientes Geld, weil Schätzwerte möglich. Keine zusätzliche ZIP und kein eigener Auftrag an Zoro vor Freitag.

## 22.10.2026 – Work: geprüfte Integration auf eigenem Branch

**Dieser Abschnitt setzt den unveränderten Protokollstand `3e9dfe4a472b83ea8d75267224d1df7f9bdde353` im eigenen Work-Branch fort. Kein fremder Branch oder früherer Eintrag wurde überschrieben.**

- Ausgangspunkt `75760f22d6cab7de3dae36360f6a11a718d0c9de` aus PR #5; Arbeitsbranch [work/facelift-integration-2026-10-22](https://github.com/barisakacak-eng/gastrcalc/tree/work/facelift-integration-2026-10-22). B + C, beide Pilotarten und alle Premium-Assets unverändert verbindlich. L6 wurde benutzt und geprüft, nicht neu entwickelt.
- **Korrektur zum älteren Protokoll:** Die drei als „Fachtests rot“ bezeichneten Fälle sind auf main reproduzierbare, veraltete Datumsannahmen. Ausschließlich die jeweilige Testuhr ist jetzt auf den Tag der Beispieldaten begrenzt; Assertions und Rechenkern unverändert. [Test-Commit 00d58f7](https://github.com/barisakacak-eng/gastrcalc/commit/00d58f78aae346b72290447bd434102cd2212e68).
- **Fertig im App-Code:** L1 zeigt „Schätzung“ deutlich, lässt die doppelte „Jetzt dran“-Überzeile weg und behält eine priorisierte Hauptaktion. B1 erhält direkte Einstellungen-/Sicherungswege, Einstellungen den Büro-Rahmen und direkten Sprung zur Sicherung. Ordner erhalten ≥56px Export-/Zeitraum-/Vorschauknöpfe und „Drucken / PDF“ als ehrlichen Text für den bestehenden Druckweg. Keine automatische Sortierung oder Steuerkarte. [UI-/Prüf-Commit 214734a](https://github.com/barisakacak-eng/gastrcalc/commit/214734a7034d240d015dc9617490f5702304b460).
- **Grün lokal mit Node 22 (CI-Version):** je UTC und Berlin 644 Tests, 639 bestanden / 5 übersprungen / 0 Fehler. Sprachprüfung alle 18 vollständig; Browser-Regelprüfung 390/360 ohne Verstöße; Personal-Durchlauf bestanden.
- **Neue echte End-to-End-Abnahme:** 12/12 Kombinationen Döner/Smash × DE/TR/EN × 390×844/360×780, offline. Umsatz, Müll/Rückgängig, Inventur/Pause, L6, 3 Ordner, echte Vorschau/CSV, ZIP-Sicherung in frischem Kontext wiederherstellen, fehlerhaften Import abweisen und Zustand nach Offline-Neustart erhalten. Eigene Wirtsfotos durch zusätzlichen Regressionstest geschützt. Keine Kundendaten, keine hochgeladenen Testbilder in der App.
- **Gmail abgeschlossen:** 39 GitHub-Meldungen aus zehn Tagen gelesen und Actions-Jobs abgeglichen. Wiederholte Datumsfehler, behobene SW-/Layout-Zwischenstände und Artefakt-/Timeoutprobleme getrennt. Zwei alte Fehlermails gehören inzwischen zu erfolgreichen Wiederholungen. Keine Mail geändert oder als gelesen markiert.
- **Fassung/Offline:** `2026-10-22.14`, `d25c46e104b9`. Premium-Fotos, Piktogramme, Bildmapping und Schriftdateien bytegleich zu PR #5. PRs gegen den Entwicklungsbranch werden jetzt geprüft; Deploy zusätzlich strikt auf main begrenzt. Kein Merge, kein Release.
- **Offen für Zoro:** echtes `nutzen`-Schema/Messlogik und kontrollierter PIN-Testschalter. **Offen für Franky:** geprüfte Inhalte/Quellen für `hinweis`. Keine eigene Finanzrechnung und keine erfundenen Steuerersparnisse eingebaut. Menütafel/DATEV/Aktionen bleiben geparkt.
- Detailbefund, Dateiliste und Integrationsreihenfolge: [Work-Integration](Sanji_2026-10-22_Work_Integration.md). Diesen Work-PR zuerst in den Facelift-Branch prüfen; PR #2/#4 nicht blind zusätzlich übernehmen. Veröffentlichung erst nach eigenständigem Review, grünen Checks und ausdrücklichem Kapitäns-Go.

- Visuelle Schlusskorrektur in derselben Work-Lieferung: Einstellungen mit geschützten Karten-Innenabständen, ruhigen Zeilentrennern und umbrechenden Wertezeilen; erneut als echte Browseransicht geprüft. Die fünf schon vorhandenen Node-Auslassungen benötigen externe/lokale Testfixtures.
