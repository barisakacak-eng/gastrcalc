# Prüf- und Übergaberegeln Sanji ↔ Zoro und Auftrag D (27.10.2026)

## Ablauf (verbindlich, Baris 27.10.2026)
IST-STAND → BESTEHENDE VORLAGE → GEZIELTE ÄNDERUNG → QUALITÄTSPRÜFUNG → BARIS-FREIGABE → INTEGRATION

## Regeln, jede gegen einen dokumentierten Fehler
| Fehler, der passiert ist | Regel ab jetzt | Wer prüft, womit |
|---|---|---|
| Zeki falsch gezeichnet, neue Figur, 6 statt 5 Spalten, Rasterreste, Größen- und Fußpunktsprünge | Jeder Bogen durchläuft vor der Abgabe `tools/sprite_pruefung.py` (Sanji kann es lokal ausführen). Mit Befund wird nicht abgegeben. | Sanji vor der Abgabe, Zoro noch einmal beim Eingang |
| „Fertig“ verwechselt mit „hochgeladen“ | Vier Status: geliefert → technisch geprüft → von Baris freigegeben → integriert. Eine Stufe höher nur mit Nachweis (Prüfausgabe, Baris-Satz, Commit). | Zoro führt `docs/sanji/lieferstatus-*.md` |
| Zwei `auftreten.webp` mit gleichem Namen | Eine Datei pro Name. Neue Fassung heißt `<name>-v2.webp` und kommt in denselben Lieferordner. Zoro nennt bei der Integration Größe und SHA-256. | Zoro |
| Abgelehnte Entwürfe liegen zwischen Lieferungen | Abgelehntes kommt sofort nach `Sanji-Lieferungen/_archiv/`. Ein Lieferordner enthält nur bestellte Dateien und `bildherkunft.json`. | Sanji, Zoro prüft beim Eingang |
| Neuer Startbildschirm statt Arbeit am echten Cockpit | Jeder Entwurf entsteht **auf** einem Referenzbild aus `docs/sanji/referenz-*` (echte App). Freie Mockups gelten nicht als Lieferung. | Zoro vergleicht mit der Referenz |
| Zu viel Bewegung | Zeki bewegt sich nur, wenn er etwas meldet oder einen kurzen Einstieg macht. Keine Dauerschleife, keine Show beim Bildschirmwechsel. | Baris bei der Freigabe |
| Korrekturschleifen | Erst ein Muster, Baris' Ja, dann die Serie. Bei Nein wird nur dieses Stück korrigiert, mit genau dem genannten Mangel. | Sanji |
| Bestellung widersprach sich (mein Paket 15:30 bestellte ein 5-Szenen-Storyboard) | Zoro bestellt nur, was Baris entschieden hat. Abschnitt 5.3 des Pakets vom 27.10. ist ersetzt durch Auftrag D unten. | Zoro |

## Auftrag D an Sanji (genau abgegrenzt)
**Ziel:** Ein dezenter Zeki-Auftritt (Variante B) **im bestehenden Cockpit**, kein eigener Bildschirm.

**Vorlage:** `docs/sanji/referenz-2026-10-27/01-heute.png` (echtes Cockpit, 390 × 844). Nichts an Karte, Zahlen, Leiste, Farben oder Schrift ändern.

**Lieferung:** ein PNG `Sanji_2026-10-28_D-VarianteB-v1.png`, 3 Bilder nebeneinander (je 390 × 844), jeweils auf dem Referenzbild:
1. Zeki tritt oben rechts an seinen gewohnten Platz (Bewegung `auftreten`, rechts herein).
2. Zeki grüßt kurz (Bogen `hand`). Der Gruß steht als Text in seiner Kopfzeile, genau wie heute in der App: „Hallo, Chef!“ (Platzhalter, nicht ins Bild malen, nur als Hinweis markieren).
3. Ruhezustand. Das Cockpit ist sofort bedienbar, nichts deckt die Zahl oder die Kacheln ab.

**Grenzen:** höchstens 2,5 Sekunden, jederzeit wegtippbar, keine Karte, kein Overlay über dem Inhalt, keine neue Figur, keine neuen Grafiken. Nur die vorhandenen Bögen benutzen.

**Nicht Teil von D:** Facelift 2.0 (E) und die Frage, wie oft das Intro kommt.

**Abgabe:** in `Sanji-Lieferungen/2026-10-28-intro-d/` mit `bildherkunft.json` und einem Satz an Baris: „D-Entwurf liegt bereit.“

## Danach
C: Baris gibt `auftreten` (Kandidat 175.878 Bytes) und die 10 übrigen Bögen nach Zoros Maschinenprüfung und Kontaktblatt frei. Erst dann folgt die Integration.
E: Erst nach der Freigabe von D. Zuerst nur `ansicht-heute-v1.png` auf Basis von `01-heute.png`.
