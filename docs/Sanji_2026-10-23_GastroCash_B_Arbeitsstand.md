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
- **Offline-Fassung:** Version `2026-10-23.2`; neue Markenassets stehen in der Service-Worker-Dateiliste. Final mit `python3 tools/sw_liste.py` erzeugter Inhalts-Fingerabdruck: `37033063e82a`.

## Bewusst NICHT umgesetzt

- Kein Finanz-Chat. Das ist Variante C und bleibt eine spätere Ausbaustufe.
- Keine neuen Berechnungen, Nutzenbeträge oder Steuerbehauptungen.
- Keine Änderung der freigegebenen Premium-Food-Fotos.
- Keine Änderung von `main`, kein Live-Deploy und kein Merge.
- Technische Altbezeichner/Kompatibilitätsdaten werden nicht blind von GastroCalc auf GastroCash umbenannt; alte Sicherungen müssen weiter lesbar bleiben.

## Historisch offen vor dem Work-Abschluss (nachfolgend aktualisiert)

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


## Work-Abschluss – technischer Endstand

Integration im bestehenden PR #7, Arbeitsbranch `work/gastrocash-completion-2026-10-23`. Ausgangs-Head der Marke: `03d90e6e47151483f2e06f14e683ea1b479bc6b2`; sicherer Produkt-Sockel PR #6 `5de3a47`. Zuvor gelieferter L3-Work-Commit `2e31d9f` vollständig erhalten und mit der Marke verbunden. Keine PRs gemergt, main/Live unverändert.

**Repariert:**
- Veralteten Stylesheet-Link entfernt; endgültige Markenregeln in `css/optik.css`. Markentest prüft die tatsächliche Architektur.
- Unbenutzte Emotions-/Bewegungsklassen aus dem Markup entfernt. Emotion und Bewegung weiterhin unabhängig über `data-gc-state`/`data-gc-motion`; fünf Gesichter, beide Augen offen, unbekannte Werte sicher neutral/ohne Bewegung. Bestehende Animationen/Reduced Motion erhalten. Keine pauschale Ausnahme im Klassenwächter.
- Test für äußeren ZIP-Namen auf `gastrocash-…zip` aktualisiert. Interne Kennung und Format bleiben kompatibel.
- Alle vier historischen 404 mit dem unveränderten roten Head reproduziert: vier Aufrufe derselben fehlenden `/css/gastrocash-brand.css`, keine weiteren fehlenden Ressourcen im neuen Lauf. HTTP-Diagnose erfasst jetzt konkrete URLs.
- Markenordner `assets` in das spätere Pages-Paket aufgenommen; kein Deploy.
- L3: bestätigte Stationen sofort sichern, Abschlussereignis beim stillen Abschluss erhalten; Rückweg Nachkontrolle → Ware und leerer Personal-Einstieg korrigiert. Nicht-Messung als dokumentiert mit Grund/Datum.

**Prüfungen:**
- Node 22 UTC: **655 bestanden, 0 fehlgeschlagen, 5 übersprungen** (660 gesamt).
- Node 22 Europe/Berlin: **655 bestanden, 0 fehlgeschlagen, 5 übersprungen** (660 gesamt).
- Die fünf bestehenden Auslassungen benötigen externe/lokale Fixtures; keine fehlgeschlagene Prüfung übersprungen. Alle 18 Sprachdateien strukturell vollständig.
- Browser-Regeln 390×844 und 360×780 ohne Verstöße; bestehender Personal-Test unverändert bestanden.
- Beide vollständigen Pilot-Arbeitstage, echte L3-Schritte DE/TR/EN bei beiden Größen; bestehende 12er-Matrix erneut bestanden.
- Regulärer Versionswechsel von der PR-6-App zu GastroCash, danach vollständiger Offline-Browserneustart mit erhaltenen bestätigten Stationen.
- Echte alte GastroCalc-ZIP unter der alten App erzeugt, danach unter GastroCash importiert; neue GastroCash-ZIP samt eigenem Gerichtsfoto in frischem Kontext importiert und Fachdaten/Blob-SHA-256 verglichen; beschädigte ZIP abgewiesen, Bestand unverändert.
- Zusätzlicher Marken-Browserlauf für Heute, Müll, Karte, Kühlung, Abschluss, Büro/Hilfe und Personal: DE/TR/EN × 390/360; Wortmarke, zwei offene Augen, Reduced Motion, unverdeckte Zahl/Bedienung, Manifest und lokale Icons/SVGs. Chromium-Installierbarkeit geprüft; keine manuelle iPhone-Installation behauptet.
- Premium-Food-Fotos, Piktogramme, Bildmapping und lokale Schriften bytegleich zum grünen PR-6-Stand. Kein Rechenkern verändert.

Finale Commit-SHAs, Fassung/Fingerprint und grüner Actions-Lauf stehen im aktuellen PR #7. Die vollständige Work-Dateiliste, Integrationsherkunft, Rechtsquellen und Zoro-Abhängigkeiten stehen in [Produktreife](Sanji_2026-10-23_Produktreife.md). [Brücke](../bruecke/stand.md) ist aktualisiert; die vollständige Freitag-Masterübergabe ist unverändert erhalten und ergänzt.

**Tatsächlich offen vor öffentlicher Freigabe:** Kapitäns-Sichtabnahme der Figur und L3; Frankys Markenrechtsprüfung sowie betriebliche Hygiene-/Aufbewahrungs-/Datenschutzfragen. Zoros Nutzen-Messlogik und die getrennte Kernbewertung von Nicht-Messungen bleiben eigene Aufgaben. Finanz-Chat Variante C bleibt später. Kein Merge/Release ohne separates ausdrückliches Go.

Technischer Abschluss-Commit: [`e3fa3c5`](https://github.com/barisakacak-eng/gastrcalc/commit/e3fa3c5467fbf26a9177a77852e82a1dc9c91312). Die Dokumentationsfortsetzung ist ein separater nachfolgender Commit; endgültiger CI-/Head-Link im PR #7.
