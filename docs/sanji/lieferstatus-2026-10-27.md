# Sanji-Lieferungen – Status (Zoro, 27.10.2026, 21:45)

Ein Status je Datei, fünf Stufen, nur mit Nachweis höher:
**geliefert** (liegt in Drive, Name und Größe geprüft) → **technisch geprüft** (Zoro: Format, Größe, Maschinenprüfung `tools/sprite_pruefung.py` bzw. Bildmaß) → **von Baris freigegeben** (ausdrückliches Ja) → **integriert** (im Repo, Commit genannt) · daneben **abgelehnt** (Archiv, nie integrieren).

Grundlage: Sanjis Gesamtübergabe vom 27.10.2026 (liegt nicht im öffentlichen Repo, sondern im privaten Projekt und in Drive), Drive-Dateilisten vom 27.10.2026 21:30, Repo-Stand `main` 4fdfec3.

## A · Kühlschrank (Lebensmittel)
| Datei | Bytes | Status |
|---|---:|---|
| `k-kuehlschrank-lebensmittel-foto.webp` | 38.170 | geliefert · Freigabe laut Sanji erteilt, von Baris an Zoro noch nicht bestätigt · nicht integriert |

## B · 13 Einzelmotive
| Datei | Bytes | Status |
|---|---:|---|
| `r-bacon.webp` | 39.900 | geliefert · nicht integriert |
| `g-classic-smash-burger.webp` | 32.954 | geliefert · nicht integriert (ersetzt das Bild mit Doppel-Patty) |
| `laden-burger.webp` | 24.026 | geliefert · nicht integriert |
| `r-pide-teig.webp` | 17.602 | geliefert · nicht integriert |
| `r-avocado.webp` | 32.548 | geliefert · nicht integriert |
| `r-pulled-pork.webp` | 38.798 | geliefert · nicht integriert |
| `r-spaetzle.webp` | 27.814 | geliefert · nicht integriert |
| `r-butter.webp` | 18.516 | geliefert · nicht integriert |
| `r-mischgemuese-tk.webp` | 38.052 | geliefert · nicht integriert |
| `r-weinessig.webp` | 19.458 | geliefert · nicht integriert |
| `v-burgerbox.webp` | 24.392 | geliefert · nicht integriert · Stilbruch möglich (anders erzeugt) |
| `v-beilagenschale.webp` | 20.538 | geliefert · nicht integriert · Stilbruch möglich |
| `v-trinkhalm.webp` | 25.274 | geliefert · nicht integriert · Stilbruch möglich |

Alle 14 Dateien liegen unter der Grenze von 40 KB. Bildmaß 520 × 390 und Motiv sind noch nicht von Zoro geprüft.

## C · Zeki-Bewegungen
| Datei | Bytes | Status |
|---|---:|---|
| `zeigen-unten.webp` | 158.634 | geliefert · nicht maschinell geprüft · nicht freigegeben |
| `zeigen-links.webp` | 175.890 | geliefert · offen wie oben |
| `zeigen-rechts.webp` | 179.878 | geliefert · offen wie oben |
| `zeigen-oben.webp` | 176.296 | geliefert · offen wie oben |
| `kopf-drehen.webp` | 178.352 | geliefert · offen wie oben |
| `warten.webp` | 179.674 | geliefert · offen wie oben |
| `abgehen.webp` | 177.872 | geliefert · offen wie oben |
| `schuerze.webp` | 179.468 | geliefert · offen wie oben |
| `daumen.webp` | 177.168 | geliefert · offen wie oben |
| `nachdenken.webp` | 178.272 | geliefert · offen wie oben |
| `auftreten.webp` (Hauptordner, 19:34) | 142.968 | **ältere Fassung – nicht verwenden** |
| `auftreten.webp` (Korrekturordner, 19:52, SHA-256 `a3a7721d…7302a4`) | 175.878 | **Kandidat** · Freigabe durch Baris fehlt |
| `zeki-schatten.svg` | 303 | geliefert · nicht integriert |

Alle Bögen liegen unter 180 KB. Vor jeder Freigabe läuft `python3 tools/sprite_pruefung.py <bogen.webp> --referenz assets/brand/zeki/hand.webp --blatt kontaktblatt.png`. Das prüft 1280 × 1590, RGBA, 25 Felder, Rasterlinien, Fußpunkt ±6 px, Größe ±8 %, abrupte Übergänge und Farbabweichung zur Referenz. Erst danach sieht Baris das Kontaktblatt. Gegenprobe: Die 7 integrierten Bögen bestehen die Prüfung, ein absichtlich kaputter Bogen fällt durch.

## D · Intro
| Datei | Status |
|---|---|
| `Sanji_2026-10-27_Intro-Storyboard.png` (liegt fälschlich im C-Ordner) | **abgelehnt** – nie integrieren |
| `Sanji_2026-10-27_Intro-Variante-B.png` | **abgelehnt** – nie integrieren |
| Entscheidung | Variante B als Richtung: kurzer, dezenter Zeki-Auftritt im bestehenden Cockpit, kein eigener Startbildschirm. Wie oft das Intro kommt, ist offen. |

## E · Facelift 2.0
Offen. Erst nach der Freigabe von D. Grundlage ist das bestehende Facelift (`css/facelift-v1.css`) und die echte App, keine freien Mockups.

## Referenzbilder der echten App (Stand `main` 4fdfec3, Beispiel-Laden, 390 × 844)
`docs/sanji/referenz-2026-10-27/01-heute.png` … `07-buero.png`. Sie sind die verbindliche Vorlage für D und E.
