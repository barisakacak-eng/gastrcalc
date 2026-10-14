# Kundendaten – Recherchebericht für Zoro
Stand 14.10.2026; Quelle: öffentliche offizielle Statistiken und eigene Speisekarten von Geschäften. Keine Veröffentlichung von Betriebslisten.

## 1. Was sicher vorliegt
- Deutschland: **35.728 umsatzsteuerpflichtige Imbissstuben (2023)**, **33.651 (2021)**, **37.056 (2019)**. DEHOGA-Zahlenspiegel IV/2025, Seite 13, Quelle Destatis: https://www.dehoga-bundesverband.de/fileadmin/Startseite/04_Zahlen___Fakten/DEHOGA-Zahlenspiegel_4._Quartal_2025.pdf.
- Österreich: **30.057 Unternehmen im Fachverband Gastronomie (2023)** und **1.157 Neugründungen 2024** (WKO Schwerpunktzuordnung, letztere vorläufig). Quelle https://www.wko.at/oe/tourismus-freizeitwirtschaft/gastronomie/gastronomie-branchendaten-februar-2025.pdf, Seite 8/12.
- Schweiz: **32.000 Betriebe** und **265.000 Beschäftigte** im gesamten Gastgewerbe laut GastroSuisse; **nicht** gleich Unternehmen und **nicht** nur kleine Imbisse. Quelle https://gastrosuisse.ch/de/verband/medien/faq-medien.
- Deutsche Gastgewerbe-**Betriebsneugründungen 33.553** und **vollständige Betriebsaufgaben 33.916**, Jan–Nov 2025; Hotelbereich enthalten, kein Nischenwert. Quelle https://www.dehoga-bundesverband.de/fileadmin/Startseite/04_Zahlen___Fakten/DEHOGA-Zahlenspiegel_4._Quartal_2025.pdf.
- **Nischenscharfe Betriebszahlen, Umsatzspanne je kleinem Laden und Mitarbeiterverteilung speziell für Döner/Asia/Foodtruck**: nicht gefunden. 1–15 Mitarbeiter, Filialenanzahl, mitarbeitender Chef lassen sich aus Branchenstatistik nicht einzeln filtern.

## 2. Rhein-Neckar – Stichprobe und Grenzen
- **54 Prüfkandidaten** aus öffentlichen Geschäftsverzeichnissen/eigenen Websites, überwiegend Heidelberg. **0 davon vollständig als passend zum engen Raster belegt**, da Inhaber-Mitarbeit, 1–15 Angestellte und Filialanzahl öffentlich nicht verlässlich belegt sind. Diese sind **keine 54 bestätigten Kunden**. Privatdatei: `betriebe.csv`.
- **108 Kartenpositionen aus 3 eigenen Websites**; die 30 geforderten unterschiedlichen Betriebskarten wurden nicht erreicht. Preis- und Artikelangaben sind Momentaufnahmen, keine dauerhaften Referenzwerte. Quellen: https://xn--bulls-dner-kcb.de/ , https://kaya-doener-und-pizzahaus.de/ , https://franklins-mannheim.de/speisekarte .
- **24 Zutatenzeilen aus 6 Rezeptvorlagen**; 40 häufigste Gerichte nicht belegbar, solange es keine 30+ Karten gibt. Rezeptbeispiele sind **unvollständige Zutatenauszüge** aus Haushaltsrezepten (auf Portionen heruntergerechnet), **keine bestätigten Gastro-Portionen**. Die CSV darf deshalb **nicht als vollständige Kalkulationsgrundlage importiert** werden.
- Lieferanten in `lieferanten.csv` sind ausdrücklich `rolle=lieferant`, keine Kunden.

## 3. Die wichtigsten Lücken / Ausbau
- Für 100–200 **verifizierte** Kunden: zuerst mehr lokale Kandidaten aus Mannheim/Weinheim/Schwetzingen/Sinsheim, dann Geschäftsmodell, Filialanzahl und Teamgröße **mit Einwilligung im Pilot vor Ort** bestätigen. Keine Kalt-E-Mails, keine automatisch angeschriebenen Listen.
- Für 30 eigene Karten: originäre Speisekarten auf Webseiten oder dort explizit verlinkte PDFs speichern/mit Abrufdatum auswerten; niemals Lieferando/Wolt/Uber Eats/Google Maps-Menüs übernehmen. Freigaben zur dauerhaften Trainingsnutzung separat prüfen.
- Für Rezepte: Betriebsgrammaturen aus dem Pilot als verifizierte Quelle aufnehmen, getrennt von Haushaltsrezepten. Varianten wie „Seele“ und „Maccaroni-Auflauf“ brauchen eigene Nachweise.
- Ergiebigste Zahlenquellen: **DEHOGA/Destatis**, **WKO/Statistik Austria**, **GastroSuisse/BFS**. Für Speisekarten: **eigene Betriebswebsites**.

## Selbstprüfung
Jede **positive Zahl** in `zahlen.csv` hat Jahr und Quell-URL. Ketten/Systemgastronomie in `betriebe.csv` ausgeschlossen; einzelne Verbundzugehörigkeiten bleiben **ungeprüft**. Jeder `betriebe.csv`-Eintrag enthält exakt `kontakt_hinweis = keine Kaltmail – Ansprache nur persönlich/Brief/nach Einwilligung`. Keine persönlichen Mobilnummern, Eigentümernamen oder Geschäfts-E-Mails übernommen. **Auftrag teilweise erfüllt, nicht vollständiges Ziel von 100–200 / 30 / 40**.
