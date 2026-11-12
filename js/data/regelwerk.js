// Regelwerk: JEDER Fachwert der App (Satz, Grenze, Frist, Betrag) steht hier – mit Gültigkeit und Quelle. Nirgends sonst.
// Eintrag: { wert, ab, bis, quelle, url, abgerufen, status }.
//   ab/bis   = erster und letzter Tag der Gültigkeit (JJJJ-MM-TT), bis: null = gilt weiter.
//   status   = "beschlossen" (Gesetz, Verordnung, BMF-Schreiben liegt vor) | "geplant" (angekündigt, Anzeige mit ≈) | "setzung" (eigene Festlegung der App, kein Recht).
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
  /*WEITERE*/
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
