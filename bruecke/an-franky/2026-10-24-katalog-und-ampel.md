# FÜR FRANKY: Katalog der Pilotläden und Margen-Ampel (Zoro, 24.10.2026, 01:45)

Baris, 24.10.: „Wir dürfen am ersten Pilottag nicht erst das Bild von irgendeinem Produkt suchen. Beim Dönerladen bekomme ich nur sechs Rezepte vorgeschlagen.“ Deine Arbeit muss in der App ankommen, nicht nur in Dokumenten.

Auftrag 1 – Dokument „GastroCash Katalog Döner und Smashburger 24.10.2026“ (Deep Research, Pro): Die vollständige Karte eines typischen deutschen Dönerladens (≈ 30–45 Positionen: Döner, Dürüm, Lahmacun, Pide, Teller, Box, Falafel, Pommes, Salate, Beilagen, Soßen, Getränke) und eines Smashburger-Ladens (≈ 20–30: Burger-Varianten, Fries, Dips, Shakes, Getränke). Je Position: Name wie auf der Karte, typischer Verkaufspreis 2025/2026 mit Quelle und Datum (Speisekarten großer Städte, Lieferplattformen), Rezeptur mit Mengen je Portion (g/ml/Stück) mit Quelle, Zutatenliste mit Einkaufs-Richtpreis 2025/2026 (Großmarkt/Metro-Niveau, Quelle + Datum). Ausgabe zusätzlich als CSV-Block, damit Zoro es in `js/data/katalog.js` übernehmen kann: `laden;gericht;preis_brutto;zutat;menge;einheit;ek_richtpreis;quelle;datum`. Schätzungen mit ≈. Keine Zahl ohne Quelle.

Auftrag 2 – Margen-Ampel prüfen (kein Deep Research): Die App färbt nach `AMPEL_GRENZEN = { rot: 0.10, gruen: 0.19 }` auf Basis Gewinn nach allen Kosten je Gericht (Baris 19.10.). Baris sieht 51 % Gewinnspanne rot. Prüfe anhand der BMF-Richtsatzsammlung 2025 (Imbiss/Gaststätten: Rohgewinn I, Reingewinn) ob die Grenzen 10/19 % sinnvoll sind und erkläre in einfacher Sprache, wie Rohgewinn (Preis minus Ware) und Reingewinn (nach Miete, Personal, Strom, Steuer) zusammenhängen – damit der Wirt versteht, warum 51 % Rohgewinn trotzdem rot sein kann. Link zur Richtsatzsammlung pflicht.

Auftrag 3 – Name für den KI-Bot: fünf Vorschläge, kurz, in Deutsch/Türkisch/Englisch gleich aussprechbar, nicht markenrechtlich offensichtlich belegt (kurze Websuche je Name), mit einem Satz Begründung. Baris entscheidet.

Antwort beginnt mit „FÜR ZORO:“. Eine Zeile ins Arbeitsprotokoll.
