// Bildliste für Sanji (17.10.2026): erzeugt aus den echten App-Daten die vollständige Liste aller Bilder, die die App brauchen kann –
// Laden-Arten, Bereiche, Warengruppen, Gericht-Familien, alle 120 Gericht-Vorlagen, alle Katalog-Artikel, Selbstgemachtes, Kühlung, Müll.
// Aufruf: node tools/bildliste.mjs  → schreibt bruecke/an-sanji/BILDLISTE.md und bruecke/an-sanji/bildliste.csv
// Der Dateiname je Bild ist fest; die App sucht genau diesen Namen in foto/ (siehe js/data/fotos.js). Status „vorhanden“ = Datei liegt schon in foto/.
import fs from "node:fs";
import path from "node:path";
const WURZEL = path.resolve(new URL("..", import.meta.url).pathname);
const { KATALOG, WARENGRUPPEN, VORLAGEN } = await import("../js/data/katalog.js");
const { GRUNDREZEPTE } = await import("../js/rezept_baukasten.js");
const { SELBST_KACHELN } = await import("../js/data/zwischen.js");
const DE = (await import("../js/lang/de.js")).default;
const { wareBild } = await import("../js/screens/muell.js");
const { fotoName } = await import("../js/bilder.js"); // Trennung 2 (17.10.2026): Bildzuordnung im Rechenwerk
const ersatzWare = (p) => (wareBild({ name: p.n, gruppe: p.g }).match(/foto\/([^"]+)\.webp/) || [])[1] || null;

const { fotoSlug: slug } = await import("../js/util.js"); // gleiche Regel wie die App
const vorhanden = new Set(fs.readdirSync(path.join(WURZEL, "foto")).filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5)));
const zeilen = []; const gesehen = new Set();
const dazu = (gruppe, prio, datei, name, motiv, ersatz = null) => { if (gesehen.has(datei)) return; gesehen.add(datei);
  const status = vorhanden.has(datei) ? "vorhanden" : ersatz && ersatz !== datei ? `fehlt – zeigt bis dahin ${ersatz}` : "fehlt";
  zeilen.push({ gruppe, prio, datei, name, motiv, status }); };

// Pilot ist ein Dönerladen: was ein Dönerladen sieht, kommt zuerst (Prio 1), dann Pizza/Imbiss/Getränke (2), dann der Rest (3).
const PRIO_BEREICH = { doener: 1, grundzutaten: 1, verpackung: 1, alkoholfrei: 1, beilagen: 1, salat: 1, pizza: 2, burger: 2, currywurst: 2, fingerfood: 2, asia: 2, fleischgericht: 2, suppe: 3, fruehstueck: 3, kuchen: 3, kaffee: 3, eis: 3, bier: 3, bar: 3 };
const FORM = { kg: "lose Ware, eine Handvoll bzw. Portion", g: "kleine Menge", l: "Flasche oder Kanister", ml: "kleine Flasche", stk: "ein einzelnes Stück", pkg: "eine Packung, ohne Markenaufdruck" };

// A. Laden-Arten (Onboarding-Kacheln)
for (const [id, name] of Object.entries(DE.schnell.arten)) dazu("A Laden-Art", 1, "laden-" + id, name, `Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: ${name}. Keine Schrift, kein Logo, keine Personen.`);
// B. Bereiche des Katalogs (Kacheln in Karte & Einkauf)
for (const [id, b] of Object.entries(KATALOG)) dazu("B Bereich", PRIO_BEREICH[id] || 3, "bereich-" + id, b.label, `Typische Auswahl des Bereichs „${b.label}“ als Stillleben, 3–5 Dinge, Draufsicht.`);
// C. Warengruppen (Inventur, Einkaufspreise)
for (const [id, name] of Object.entries(WARENGRUPPEN)) dazu("C Warengruppe", 1, "gruppe-" + id, name, `Sinnbild der Warengruppe „${name}“: 3–4 typische Waren nebeneinander, Draufsicht.`);
// D. Gericht-Familien (Rezept-Baukasten; die App nimmt das Familienfoto, wenn kein Einzelfoto da ist)
for (const g of GRUNDREZEPTE) {
  const z = (g.zutaten || []).map((x) => x.name || x[0]).filter(Boolean).slice(0, 6).join(", ");
  dazu("D Gericht-Familie", 1, "g-" + g.id, g.id, `Ein typisches Gericht der Familie „${g.id}“, fertig serviert wie im Imbiss${z ? ` (sichtbar: ${z})` : ""}. Eine Portion.`);
}
// E. Einzelne Gerichte (120 Vorlagen)
for (const [bereich, liste] of Object.entries(VORLAGEN)) for (const v of liste) {
  const z = (v.zutaten || []).filter((x) => !/t[üu]te|karton|schale|box|becher|serviette|folie/i.test(x[0])).map((x) => x[0]).slice(0, 6).join(", ");
  dazu("E Gericht", PRIO_BEREICH[bereich] || 3, "g-" + slug(v.name), v.name, `„${v.name}“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: ${z}.`, fotoName({ name: v.name, bereich }));
}
// F. Artikel (Einkauf, Inventur, Müll) – Rohware r-, Verpackung v-, Getränke d-
for (const [bereich, b] of Object.entries(KATALOG)) for (const p of b.produkte) {
  const pre = p.g === "verpackung" ? "v-" : p.g === "getraenk" || p.g === "spirituose" ? "d-" : "r-";
  const motiv = p.g === "verpackung" ? `${p.n}, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.`
    : p.g === "getraenk" || p.g === "spirituose" ? `${p.n} als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.`
    : `${p.n} als Rohware, ${FORM[p.e] || "eine Portion"}; so, wie es beim Großhändler oder in der Küche aussieht.`;
  dazu("F Artikel", PRIO_BEREICH[bereich] || 3, pre + slug(p.n), p.n, motiv, ersatzWare(p));
}
// G. Selbst gemacht, Kühlung, Müll
for (const k of SELBST_KACHELN) dazu("G Selbst gemacht", 1, "s-" + k.id, k.id, `Selbstgemachtes „${k.id}“ in der Küche, roh bzw. frisch zubereitet, in einer Edelstahl- oder Kunststoffschale.`);
for (const [id, name] of [["kuehlschrank", "Kühlschrank"], ["tiefkuehler", "Tiefkühltruhe"], ["saladette", "Saladette / Kühltheke"], ["warmhalter", "Warmhaltetheke / Bain-Marie"], ["kuehlraum", "Kühlraum (begehbar)"], ["getraenkekuehler", "Getränkekühlschrank mit Glastür"]])
  dazu("H Kühlung", 1, `k-${id}-foto`, name, `${name} in einem Imbiss, Gerät gut erkennbar, Tür geschlossen, ohne Marke.`);
for (const [id, name] of [["eimer-foto", "Abfalleimer mit Speiseresten"], ["biotonne-foto", "Biotonne"], ["frittieroel", "Altöl-Kanister"], ["personalessen", "Personalessen (Teller am Tresen)"]])
  dazu("I Müll", 1, "m-" + id, name, `${name}, sauber fotografiert, nicht eklig.`);

zeilen.sort((a, b) => a.prio - b.prio || a.gruppe.localeCompare(b.gruppe) || a.datei.localeCompare(b.datei));
const fehlt = zeilen.filter((z) => z.status.startsWith("fehlt"));
const ohneBild = fehlt.filter((z) => z.status === "fehlt");
const zaehl = (f) => Object.entries(zeilen.reduce((m, z) => { if (f(z)) m[z.gruppe] = (m[z.gruppe] || 0) + 1; return m; }, {})).map(([g, n]) => `${g}: ${n}`).join(" · ");

const md = `# BILDLISTE GastroCalc – alle Bilder, die die App braucht
Stand ${new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · erzeugt aus den App-Daten mit \`node tools/bildliste.mjs\` (nicht von Hand ändern, neu erzeugen) · gepflegt von Zoro · für Sanji und Baris

Insgesamt **${zeilen.length} Bilder**, davon **${zeilen.length - fehlt.length} vorhanden**, **${fehlt.length} fehlen** – ${fehlt.length - ohneBild.length} davon zeigen bis dahin ein ähnliches Sammelbild (Status „zeigt bis dahin …“), ${ohneBild.length} zeigen nur ein Piktogramm. Ein fehlendes Einzelbild ist also nie ein Loch, aber oft ungenau (Beispiel heute: „Dönerspieß Kalb/Pute“ zeigt den Hähnchenspieß).
Fehlend nach Prio: Prio 1 = ${fehlt.filter((z) => z.prio === 1).length} · Prio 2 = ${fehlt.filter((z) => z.prio === 2).length} · Prio 3 = ${fehlt.filter((z) => z.prio === 3).length}.
Fehlend je Gruppe: ${zaehl((z) => z.status.startsWith("fehlt"))}.
Die gleiche Liste als Tabelle: \`bruecke/an-sanji/bildliste.csv\` (Spalten: prio;gruppe;datei;name;status;motiv).

## Was drauf soll – was du (Sanji) entscheidest
Zoro sagt je Bild nur, WAS drauf ist (Spalte „Motiv“). WIE es aussieht, entscheidest du mit Baris im Zielbild „Kräuter & Kupfer“ – einmal festlegen, dann für alle gleich.

## Feste technische Regeln (die App hängt daran)
1. Dateiname genau wie in der Spalte „Datei“, plus \`.webp\`. Nur Kleinbuchstaben, Bindestriche.
2. WebP, 520 × 390 px (4:3), Qualität 70–75, Ziel 25–45 KB je Bild.
3. Keine Schrift, keine Logos, keine Marken, keine erkennbaren Personen, keine Hände mit Ringen/Tattoos.
4. Ein Motiv pro Bild, mittig, mit etwas Rand (die App schneidet bei kleinen Kacheln rund oder quadratisch zu).
5. Gerichte (g-): eine Portion, wie ein Imbiss sie serviert – kein Restaurant-Anrichten. Rohware (r-): so, wie sie geliefert wird. Verpackung (v-): leer. Getränke (d-): neutrales Gebinde.
6. Rechte: Nur selbst erzeugte Bilder (ChatGPT) oder eigene Fotos. Keine Stockfotos ohne geklärte Lizenz.

## Lieferweg (seit 17.10.2026 mit Schreibrecht)
- Eigener Branch: \`sanji/2026-10-17-bilder\` (oder späteres Datum), nie direkt nach main.
- Ablage nur unter \`design-handoffs/sanji/bilder-<datum>/\` – fertige \`.webp\` mit dem Dateinamen aus der Liste, dazu \`LIESMICH.md\` (welche Bilder, Status ENTWURF / ZUR FREIGABE / VON BARIS FREIGEGEBEN).
- Gerne als Bildbogen-Raster, wenn das schneller ist – dann im LIESMICH die Reihenfolge der Kacheln nennen; Zoro schneidet.
- Zoro prüft (Größe, Format, Name), kopiert nach \`foto/\`, trägt in \`js/data/fotos.js\` ein, Tests, Veröffentlichung. Sanji fasst \`foto/\`, \`js/\`, \`css/\`, \`sw.js\` nicht an.

## Reihenfolge-Vorschlag
Erst Prio 1 (alles, was ein Dönerladen sieht – unser Pilot), innerhalb davon zuerst Gruppe F (Artikel: Müll-Raster und Inventur zeigen sie täglich), dann D/E (Gerichte), dann A–C, G–I. Ein Bogen mit 12 Bildern je Lieferung ist ein guter Takt.

## Die Liste
${["Prio", "Gruppe", "Datei", "Name in der App", "Status", "Motiv"].join(" | ")}
${["---", "---", "---", "---", "---", "---"].join(" | ")}
${zeilen.map((z) => [z.prio, z.gruppe, "`" + z.datei + ".webp`", z.name, z.status, z.motiv.replace(/\|/g, "/")].join(" | ")).join("\n")}
`;
const csv = "prio;gruppe;datei;name;status;motiv\n" + zeilen.map((z) => [z.prio, z.gruppe, z.datei + ".webp", z.name, z.status, z.motiv].map((x) => String(x).replace(/;/g, ",")).join(";")).join("\n") + "\n";
fs.writeFileSync(path.join(WURZEL, "bruecke/an-sanji/BILDLISTE.md"), md);
fs.writeFileSync(path.join(WURZEL, "bruecke/an-sanji/bildliste.csv"), csv);
console.log(`Bildliste: ${zeilen.length} Bilder, ${zeilen.length - fehlt.length} vorhanden, ${fehlt.length} fehlen (Prio 1: ${fehlt.filter((z) => z.prio === 1).length})`);
