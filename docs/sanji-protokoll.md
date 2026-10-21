# Sanji – Arbeitsprotokoll

## 21.10.2026

| Bildschirm | Fassung | Branch / PR | Stand |
| --- | --- | --- | --- |
| L2 Müll: Laden und Station | v2 | [sanji/L2-muell](https://github.com/barisakacak-eng/gastrcalc/tree/sanji/L2-muell) · [PR #2](https://github.com/barisakacak-eng/gastrcalc/pull/2) | Wartet auf Baris: Ja/Kritik offen. Technische Prüfung durch Zoro bestätigt. |
| L3 Kühlung | in Arbeit | sanji/L3-kuehlung | Code und Datenquellen werden gelesen. |

L2-Commit: `c5a0a6511e41ffbf6b5446036b1c9e14f6eaecb5`. Main unverändert: `ffc016018a10e3e7af831555d072e59c1289091a`.

### Prüfungen und offene Punkte

- L2: Node-Tests jeweils UTC/Berlin: 629 bestanden, 5 übersprungen, 2 bekannte Fehler (Fassungs-Wächter; Lieferanten-Test auch auf main rot).
- L2: GitHub-UI-Regelprüfung bei 360/390 px und Personal-Durchlauf bestanden. Einzelne offline Ansichtsdatei im Browser nicht geprüft.
- Service-Worker-Version erhöht Zoro beim Mergen; Sanji ändert sie nicht.
- Müll-Station: flüchtiger Modus; kein dauerhafter Kiosk, keine Waagen-Anbindung. Gewicht bleibt inaktiv.
- Neue Sprachschlüssel: Deutsch, Türkisch, Englisch geprüft; übrige 15 Sprachen: Muttersprachliche Prüfung offen.
- Tagesmappe enthält L2 und die bis zur Abendmeldung fertigen Bildschirme. Noch keine Freigabe von Baris.

### Arbeitsweise

Je Bildschirm eigener Branch von main und eigener PR; keine Merges durch Sanji. Vollständiger FÜR-ZORO-Block steht im jeweiligen PR. Kritik wird dort und hier nachgetragen. Keine Nachricht an Zoro je Schritt.
