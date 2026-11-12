// Regelwerk: JEDER Fachwert der App (Satz, Grenze, Frist, Betrag) steht hier – mit Gültigkeit und Quelle. Nirgends sonst.
// Eintrag: { wert, ab, bis, quelle, url, abgerufen, status }.
//   ab/bis   = erster und letzter Tag der Gültigkeit (JJJJ-MM-TT), bis: null = gilt weiter.
//   status   = "beschlossen" (Gesetz, Verordnung, BMF-Schreiben liegt vor) | "geplant" (angekündigt, Anzeige mit ≈) | "setzung" (Schätzung oder eigene Festlegung der App: kein Gesetzeswert oder Original nicht selbst gelesen; Anzeige mit ≈).
//   abgerufen = Tag, an dem die Quelle zuletzt gelesen wurde.
// Lesen: regel(id, tag) gibt den Eintrag, der an diesem Tag gilt. Gibt es für den Tag keinen, kommt der letzte bekannte
// mit veraltet: true zurück (die Oberfläche zeigt dann ≈). wert(id, tag) gibt nur die Zahl.
// Neuer Wert (z. B. neuer Mindestlohn): den alten Eintrag mit „bis“ schließen, neuen Eintrag mit „ab“ anhängen. Sonst nichts ändern.
// Der Test tests/regelwerk.test.mjs prüft: Quelle und Adresse vorhanden, Zeiträume ohne Überlappung, Warnung 60 Tage vor Ablauf,
// kein Fachwert außerhalb dieser Datei.
const G = "https://www.gesetze-im-internet.de/";
const e = (wert, ab, bis, quelle, url, abgerufen, status = "beschlossen") => ({ wert, ab, bis, quelle, url, abgerufen, status });

export const REGELN = {
  // Lohnsteuer-Anmeldung: Zeitraum nach der Lohnsteuer des Vorjahres (§ 41a Abs. 2 EStG)
  lst_jahr_bis: [e(1080, "2025-01-01", null, "§ 41a Abs. 2 Satz 2 EStG: Kalenderjahr bei höchstens 1.080 € Lohnsteuer im Vorjahr", G + "estg/__41a.html", "2026-11-12")],
  lst_quartal_bis: [e(5000, "2025-01-01", null, "§ 41a Abs. 2 Satz 2 EStG: Kalendervierteljahr bei mehr als 1.080 € bis 5.000 € Lohnsteuer im Vorjahr", G + "estg/__41a.html", "2026-11-12")],
  // ── Lohn ──
  mindestlohn: [
    e(12.82, "2025-01-01", "2025-12-31", "Vierte Mindestlohnanpassungsverordnung, BGBl. 2023 I Nr. 321", G + "milov4/BJNR1410A0023.html", "2026-11-12"),
    e(13.90, "2026-01-01", "2026-12-31", "Fünfte Mindestlohnanpassungsverordnung vom 05.11.2025, § 1 Nr. 1, BGBl. 2025 I Nr. 268", G + "milov5/BJNR10C0A0025.html", "2026-11-12"),
    e(14.60, "2027-01-01", null, "Fünfte Mindestlohnanpassungsverordnung vom 05.11.2025, § 1 Nr. 2, BGBl. 2025 I Nr. 268", G + "milov5/BJNR10C0A0025.html", "2026-11-12"),
  ],
  // Minijob-Grenze = Mindestlohn × 130 / 3, auf volle Euro aufgerundet (§ 8 Abs. 1a SGB IV)
  minijob_grenze: [
    e(603, "2026-01-01", "2026-12-31", "§ 8 Abs. 1a SGB IV: 13,90 € × 130 / 3 = 602,33 → 603 €", G + "sgb_4/__8.html", "2026-11-12"),
    e(633, "2027-01-01", null, "§ 8 Abs. 1a SGB IV: 14,60 € × 130 / 3 = 632,67 → 633 €", G + "sgb_4/__8.html", "2026-11-12"),
  ],
  midijob_obergrenze: [e(2000, "2023-01-01", null, "§ 20 Abs. 2 SGB IV (Übergangsbereich)", G + "sgb_4/__20.html", "2026-11-12")],
  kurzfristig_tage: [e(70, "2021-01-01", null, "§ 8 Abs. 1 Nr. 2 SGB IV: drei Monate oder 70 Arbeitstage", G + "sgb_4/__8.html", "2026-11-12")],
  // Arbeitgeber-Abgaben auf den Brutto-Lohn, als Anteil (0,3117 = 31,17 %). Nur 2026 belegt; danach zeigt die App ≈ mit dem letzten Wert.
  abgaben_minijob: [e(0.3117, "2026-01-01", "2026-12-31", "Minijob-Zentrale, Abgaben gewerblicher Minijob 2026: KV 13 % + RV 15 % + Pauschsteuer 2 % + U1 0,80 % + U2 0,22 % + Insolvenzgeld 0,15 %", "https://www.minijob-zentrale.de/DE/fuer-gewerbetreibende/abgaben-und-steuern/abgaben-und-steuern_node.html", "2026-11-12")],
  abgaben_angestellt: [e(0.2115, "2026-01-01", "2026-12-31", "Arbeitgeberanteile 2026: KV 7,3 % (§ 241 SGB V) + halber durchschnittlicher Zusatzbeitrag 1,45 % (BMG, BAnz AT 10.11.2025 B7) + RV 9,3 % + AV 1,3 % (§ 341 SGB III) + PV 1,8 %", G + "sgb_5/__241.html", "2026-11-12")],
  // Umlagen U1/U2/Insolvenzgeld hängen an der Krankenkasse – Schätzung mit einem Standardsatz, darum status „setzung“ und Anzeige mit ≈
  umlagen_angestellt: [e(0.0269, "2026-01-01", "2026-12-31", "Schätzung: U1 2,1 % + U2 0,44 % (Standardsätze einer großen Kasse 2026) + Insolvenzgeldumlage 0,15 % (§ 360 SGB III)", G + "sgb_3/__360.html", "2026-11-12", "setzung")],
  // Berufsgenossenschaft: Branchenschnitt aus den Geschäftszahlen, kein gesetzlicher Satz – Schätzung
  bgn_anteil: [e(0.0104, "2025-01-01", null, "Schätzung: BGN-Geschäftszahlen 2025, Umlage ÷ Entgelt im Gewerbezweig Gaststätten ≈ 1,04 %; der eigene Satz steht im BGN-Bescheid", "https://www.bgn.de/die-bgn/statistik-geschaeftszahlen-geschaeftsbericht/BGN_Geschaeftszahlen_2025.pdf", "2026-10-28", "setzung")],
  // Sachbezug Verpflegung je Mahlzeit und Tag (§ 2 Abs. 1 SvEV; Tageswert = Monatswert ÷ 30)
  sachbezug_fruehstueck: [
    e(2.37, "2026-01-01", "2026-12-31", "§ 2 Abs. 1 SvEV 2026: Frühstück 71 € im Monat", G + "svev/__2.html", "2026-11-12"),
    e(2.43, "2027-01-01", null, "17. Verordnung zur Änderung der SvEV vom 26.10.2026, BGBl. 2026 I Nr. 324 (verkündet; Zahl aus dem Entwurf BR-Drs. 503/26, Verordnungstext nicht selbst gelesen)", "https://www.recht.bund.de/bgbl/1/2026/324/VO.html", "2026-11-12", "geplant"),
  ],
  sachbezug_mittag: [
    e(4.57, "2026-01-01", "2026-12-31", "§ 2 Abs. 1 SvEV 2026: Mittag- oder Abendessen 137 € im Monat", G + "svev/__2.html", "2026-11-12"),
    e(4.70, "2027-01-01", null, "17. Verordnung zur Änderung der SvEV vom 26.10.2026, BGBl. 2026 I Nr. 324 (verkündet; Zahl aus dem Entwurf BR-Drs. 503/26, Verordnungstext nicht selbst gelesen)", "https://www.recht.bund.de/bgbl/1/2026/324/VO.html", "2026-11-12", "geplant"),
  ],
  sachbezug_monat: [
    e(345, "2026-01-01", "2026-12-31", "§ 2 Abs. 1 SvEV 2026: Verpflegung 345 € im Monat", G + "svev/__2.html", "2026-11-12"),
    e(355, "2027-01-01", null, "17. Verordnung zur Änderung der SvEV vom 26.10.2026, BGBl. 2026 I Nr. 324 (verkündet; Zahl aus dem Entwurf BR-Drs. 503/26, Verordnungstext nicht selbst gelesen)", "https://www.recht.bund.de/bgbl/1/2026/324/VO.html", "2026-11-12", "geplant"),
  ],
  // Steuerfreie Zuschläge (§ 3b EStG), als Anteil vom Grundlohn; Nacht = 20 bis 6 Uhr
  zuschlag_nacht: [e(0.25, "2004-01-01", null, "§ 3b Abs. 1 Nr. 1 EStG", G + "estg/__3b.html", "2026-11-12")],
  zuschlag_nacht_0_4: [e(0.40, "2004-01-01", null, "§ 3b Abs. 3 Nr. 1 EStG: 0 bis 4 Uhr, wenn die Arbeit vor 0 Uhr begann", G + "estg/__3b.html", "2026-11-12")],
  zuschlag_sonntag: [e(0.50, "2004-01-01", null, "§ 3b Abs. 1 Nr. 2 EStG", G + "estg/__3b.html", "2026-11-12")],
  zuschlag_feiertag: [e(1.25, "2004-01-01", null, "§ 3b Abs. 1 Nr. 3 EStG: Feiertage und 31.12. ab 14 Uhr", G + "estg/__3b.html", "2026-11-12")],
  zuschlag_weihnachten: [e(1.50, "2004-01-01", null, "§ 3b Abs. 1 Nr. 4 EStG: 24.12. ab 14 Uhr, 25./26.12., 1. Mai", G + "estg/__3b.html", "2026-11-12")],
  nacht_beginn_uhr: [e(20, "2004-01-01", null, "§ 3b Abs. 2 Satz 2 EStG: Nachtarbeit 20 bis 6 Uhr", G + "estg/__3b.html", "2026-11-12")],
  nacht_ende_uhr: [e(6, "2004-01-01", null, "§ 3b Abs. 2 Satz 2 EStG: Nachtarbeit 20 bis 6 Uhr", G + "estg/__3b.html", "2026-11-12")],
  // Arbeitszeit-Aufzeichnung (§ 17 MiLoG) und Bußgelder
  arbeitszeit_frist_tage: [e(7, "2015-01-01", null, "§ 17 Abs. 1 MiLoG: bis zum Ablauf des siebten Kalendertages nach der Arbeit", G + "milog/__17.html", "2026-11-12")],
  arbeitszeit_aufheben_jahre: [e(2, "2015-01-01", null, "§ 17 Abs. 1 MiLoG: mindestens zwei Jahre aufbewahren", G + "milog/__17.html", "2026-11-12")],
  bussgeld_arbeitszeit: [e(50000, "2025-01-01", null, "§ 21 Abs. 1 Nr. 8, Abs. 3 MiLoG: bis zu 50.000 € bei fehlender oder verspäteter Aufzeichnung", G + "milog/__21.html", "2026-11-12")],
  bussgeld_sofortmeldung: [e(25000, "2009-01-01", null, "§ 111 Abs. 1 Nr. 2, Abs. 4 SGB IV", G + "sgb_4/__111.html", "2026-11-12")],
  bussgeld_ausweis: [e(5000, "2009-01-01", null, "§ 8 Abs. 2 Nr. 1, Abs. 6 SchwarzArbG (Hinweis auf die Mitführungspflicht); Betrag aus dem Bestand, Original nicht neu gelesen", G + "schwarzarbg_2004/__8.html", "2026-10-28", "setzung")],
  belehrung_monate: [e(24, "2001-01-01", null, "§ 43 Abs. 4 IfSG: Folgebelehrung alle zwei Jahre", G + "ifsg/__43.html", "2026-11-12")],
  // ── Umsatzsteuer ──
  mwst_voll: [e(0.19, "2007-01-01", null, "§ 12 Abs. 1 UStG", G + "ustg_1980/__12.html", "2026-11-12")],
  mwst_ermaessigt: [e(0.07, "1983-07-01", null, "§ 12 Abs. 2 UStG; Speisen in der Gastronomie seit 01.01.2026 ohne Befristung (§ 12 Abs. 2 Nr. 15 UStG, Steueränderungsgesetz 2025, BGBl. 2025 I Nr. 363)", G + "ustg_1980/__12.html", "2026-11-12")],
  kleinunternehmer_vorjahr: [e(25000, "2025-01-01", null, "§ 19 Abs. 1 UStG: Gesamtumsatz im Vorjahr höchstens 25.000 € (Entgelt, also ohne Umsatzsteuer)", G + "ustg_1980/__19.html", "2026-11-12")],
  kleinunternehmer_laufend: [e(100000, "2025-01-01", null, "§ 19 Abs. 1 UStG: im laufenden Jahr höchstens 100.000 €; ab dem Umsatz, der die Grenze überschreitet, gilt die Regelbesteuerung", G + "ustg_1980/__19.html", "2026-11-12")],
  ust_va_monat_ab: [e(9000, "2025-01-01", null, "§ 18 Abs. 2 Satz 2 UStG: Kalendermonat bei mehr als 9.000 € Steuer im Vorjahr", G + "ustg_1980/__18.html", "2026-11-12")],
  // Gründer: im Gründungsjahr und im Jahr danach monatliche Voranmeldung. 2021 bis 2026 ausgesetzt (Satz 6), ab 2027 wieder in Kraft.
  ust_gruender_monatlich: [
    e(false, "2021-01-01", "2026-12-31", "§ 18 Abs. 2 Satz 6 UStG: 2021 bis 2026 zählt die voraussichtliche Jahressteuer", G + "ustg_1980/__18.html", "2026-11-12"),
    e(true, "2027-01-01", null, "§ 18 Abs. 2 Satz 4 UStG: im Jahr der Gründung und im Folgejahr Kalendermonat", G + "ustg_1980/__18.html", "2026-11-12"),
  ],
  kleinbetragsrechnung: [e(250, "2017-01-01", null, "§ 33 UStDV: Rechnungen bis 250 € brutto", G + "ustdv_1980/__33.html", "2026-11-12")],
  // ── Einkommen, Gewerbe, Aufbewahrung ──
  gwg_grenze: [e(800, "2018-01-01", null, "§ 6 Abs. 2 EStG: bis 800 € netto", G + "estg/__6.html", "2026-11-12")],
  gewerbesteuer_freibetrag: [e(24500, "2002-01-01", null, "§ 11 Abs. 1 Satz 3 Nr. 1 GewStG: natürliche Personen und Personengesellschaften", G + "gewstg/__11.html", "2026-11-12")],
  aufbewahrung_belege_jahre: [e(8, "2025-01-01", null, "§ 147 Abs. 3 AO: Buchungsbelege acht Jahre", G + "ao_1977/__147.html", "2026-11-12")],
  aufbewahrung_buecher_jahre: [e(10, "1977-01-01", null, "§ 147 Abs. 3 AO: Bücher, Aufzeichnungen, Abschlüsse zehn Jahre", G + "ao_1977/__147.html", "2026-11-12")],
  // Eigenverbrauch des Inhabers: Jahres-Pauschbetrag je Person, netto (nur Vergleichswert im Steuer-Ordner). Für 2027 liegt noch kein Schreiben vor.
  eigenverbrauch_pauschale: [e(4001, "2026-01-01", "2026-12-31", "BMF-Schreiben vom 23.12.2025, IV D 3 - S 1547/00006/007/021, Gaststätten mit kalten und warmen Speisen: 3.173 € (7 %) + 828 € (19 %); gelesen in Kopien, das BMF-Original war nicht abrufbar", "https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Weitere_Steuerthemen/Betriebspruefung/Richtsatzsammlung/2025-12-23-pauschbetraege-2026.html", "2026-10-20", "setzung")],
  // Richtsatz Wareneinsatz Imbiss (Anteil am Umsatz ohne Umsatzsteuer) – Orientierung, kein Recht
  richtsatz_wareneinsatz: [e(0.32, "2025-01-01", null, "BMF-Richtsatzsammlung für das Kalenderjahr 2025, Imbissstuben u. Ä. (56103.0): Rohgewinn I Mittel 68 % → Wareneinsatz 32 %; gelesen in der Kopie der IHK München, das BMF-Original war nicht abrufbar", "https://www.ihk-muenchen.de/ihk/documents/Recht-Steuern/Steuerrecht/Einkommensteuer/2026-06-25-download-richtsatzsammlung-2025.pdf", "2026-11-12", "setzung")],
  richtsatz_wareneinsatz_min: [e(0.23, "2025-01-01", null, "wie richtsatz_wareneinsatz: Rohgewinn I obere Grenze 77 %", "https://www.ihk-muenchen.de/ihk/documents/Recht-Steuern/Steuerrecht/Einkommensteuer/2026-06-25-download-richtsatzsammlung-2025.pdf", "2026-11-12", "setzung")],
  richtsatz_wareneinsatz_max: [e(0.41, "2025-01-01", null, "wie richtsatz_wareneinsatz: Rohgewinn I untere Grenze 59 %", "https://www.ihk-muenchen.de/ihk/documents/Recht-Steuern/Steuerrecht/Einkommensteuer/2026-06-25-download-richtsatzsammlung-2025.pdf", "2026-11-12", "setzung")],
  richtsatz_rohaufschlag: [e(2.13, "2025-01-01", null, "wie richtsatz_wareneinsatz: Rohgewinnaufschlag Mittel 213 %", "https://www.ihk-muenchen.de/ihk/documents/Recht-Steuern/Steuerrecht/Einkommensteuer/2026-06-25-download-richtsatzsammlung-2025.pdf", "2026-11-12", "setzung")],
  // ── Beiträge ──
  // Rundfunkbeitrag je Betriebsstätte im Monat. Für 2027 gibt es nur eine Empfehlung der KEF (18,64 €), keinen Beschluss – darum unverändert.
  rundfunk_voll: [e(18.36, "2022-01-01", null, "rundfunkbeitrag.de, Berechnung für Betriebsstätten: 9 bis 19 Beschäftigte ein Beitrag", "https://www.rundfunkbeitrag.de/informationen-zur-berechnung-des-rundfunkbeitrags", "2026-11-12")],
  rundfunk_drittel: [e(6.12, "2022-01-01", null, "rundfunkbeitrag.de, Berechnung für Betriebsstätten: 0 bis 8 Beschäftigte ein Drittel", "https://www.rundfunkbeitrag.de/informationen-zur-berechnung-des-rundfunkbeitrags", "2026-11-12")],
  rundfunk_stufe_ab: [e(9, "2013-01-01", null, "rundfunkbeitrag.de, Berechnung für Betriebsstätten: zweite Stufe ab 9 Beschäftigten", "https://www.rundfunkbeitrag.de/informationen-zur-berechnung-des-rundfunkbeitrags", "2026-11-12")],
  // GEMA: Betrag aus der Tarifübersicht 2026 (Gaststätte bis 100 m², Radio), netto im Jahr. Gilt nur 2026.
  gema_radio_jahr: [e(395.90, "2026-01-01", "2026-12-31", "GEMA Tarifübersicht Gaststätten 2026 (Hintergrundmusik, bis 100 m², Radio)", "https://www.gema.de/documents/d/guest/user_upload-dokumente-musiknutzer-tarife-tarife_ad-tarifuebersicht_gaststaetten-pdf", "2026-10-28")],
};

export function regel(id, tag) {
  const liste = REGELN[id]; if (!liste) throw new Error("Regelwerk: unbekannter Wert " + id);
  if (typeof tag !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tag)) throw new Error("Regelwerk: " + id + " braucht einen Tag (JJJJ-MM-TT)");
  const gilt = liste.find((x) => x.ab <= tag && (!x.bis || tag <= x.bis)); if (gilt) return gilt;
  const davor = liste.filter((x) => x.ab <= tag).sort((a, b) => (a.ab < b.ab ? 1 : -1))[0];
  return { ...(davor || liste[0]), veraltet: true };
}
export const wert = (id, tag) => regel(id, tag).wert;
// Einträge, die in den nächsten n Tagen auslaufen, ohne dass ein Nachfolger eingetragen ist (für den Warn-Test und das Büro)
export function laeuftAus(tag, n = 60) {
  const [j, m, d] = tag.split("-").map(Number); const x = new Date(Date.UTC(j, m - 1, d + n)); const grenze = x.toISOString().slice(0, 10);
  const out = [];
  for (const [id, liste] of Object.entries(REGELN)) for (const r of liste) {
    if (r.bis && r.bis >= tag && r.bis <= grenze && !liste.some((y) => y.ab > r.bis)) out.push({ id, bis: r.bis });
  }
  return out;
}
