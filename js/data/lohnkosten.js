// Arbeitgeberkosten auf den Brutto-Lohn (Baris 27.10.2026: „15 € brutto bleiben nicht 15 € brutto“). Stand 2026, Abruf 27.10.2026.
// Angestellt (sozialversicherungspflichtig, auch Übergangsbereich als Näherung): Arbeitgeberanteile 2026 laut TK (Stand 06.01.2026)
//   KV 7,3 % + halber durchschnittlicher Zusatzbeitrag 2,9 % / 2 = 1,45 % + RV 9,3 % + AV 1,3 % + PV 1,8 % = 21,15 %
//   Umlagen: U1 2,1 % (Standardsatz TK, je Kasse und Erstattungssatz verschieden) + U2 0,44 % + Insolvenzgeldumlage 0,15 % → ≈ 2,69 %
//   Quelle: https://www.tk.de/firmenkunden/versicherung/beitraege-faq/beitragssaetze/aktuelle-beitragssaetze-in-der-sozialversicherung-2031554
//   Insolvenzgeldumlage 0,15 %: https://www.lohndialog.de/minijob-lohnabrechnung-2026/
//   Nicht enthalten: Berufsgenossenschaft (Unfallversicherung, je Betrieb verschieden) – darum ≈.
// Minijob (gewerblich, bis 603 €/Monat 2026): KV 13 % + RV 15 % + Pauschsteuer 2 % + U1 0,8 % + U2 0,22 % + Insolvenzgeld 0,15 % = 31,17 %
//   Quelle: https://www.lohndialog.de/minijob-lohnabrechnung-2026/ (Abruf 27.10.2026)
export const LOHN_AUFSCHLAG = {
  angestellt: { satz: 0.2115 + 0.0269, geschaetzt: true, stand: "2026" },
  minijob: { satz: 0.3117, geschaetzt: false, stand: "2026" },
};
export const LOHN_STANDARD = "angestellt";
// Was dich eine Stunde wirklich kostet: Brutto × (1 + Aufschlag)
export const kostenJeStunde = (brutto, art = LOHN_STANDARD) => (brutto > 0 ? brutto * (1 + (LOHN_AUFSCHLAG[art] || LOHN_AUFSCHLAG[LOHN_STANDARD]).satz) : 0);

// Fester Monatslohn (Baris 27.10.2026, 13:02: „Stunden und Monat … rechnen sich natürlich anders“): Personen mit lohnModell "monat"
// kosten jeden Monat Brutto × (1 + Aufschlag) – unabhängig von „Waren heute Mitarbeiter da?“. Sie gehören zu den festen Kosten.
export const kostenJeMonat = (brutto, art = LOHN_STANDARD) => (brutto > 0 ? brutto * (1 + (LOHN_AUFSCHLAG[art] || LOHN_AUFSCHLAG[LOHN_STANDARD]).satz) : 0);
export const festPersonalMonat = (stand) => (stand?.personen || []).filter((p) => !p.entfernt && p.aktiv !== false && p.lohnModell === "monat" && p.monatsBrutto > 0)
  .reduce((s, p) => s + kostenJeMonat(p.monatsBrutto, p.lohnArt), 0);
