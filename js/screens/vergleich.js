// Gerichte im Vergleich (Zielbild „Kräuter & Kupfer“, 15.10.2026): Welche Gerichte bringen dir den meisten Gewinn?
// Je Gericht: Bild, Name, Verkaufspreis, Wareneinsatz, Deckungsbeitrag, Marge mit Balken. Umschalter Deckungsbeitrag | Marge %.
// Zahlen kommen aus kalkulation() (netto, wie überall in der Kalkulation); nichts wird hier neu gerechnet außer der Sortierung.
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, fotoSlug } from "../util.js";
import { kalkulation, wareneinsatzWarnung } from "../engine.js"; // Paket 3 (16.10.2026), M4
import { rezeptStempel } from "../rezept_quelle.js";
import { nav } from "./nav.js";
import { FOTOS } from "../data/fotos.js";
import { sym } from "../symbole.js";

let modus = "db"; // "db" | "marge"
export const vergleichModus = (m) => { if (m === "db" || m === "marge") modus = m; };
export const vergleichModusAktuell = () => modus; // Paket 2: für Tests
export const vergleichZuruecksetzen = () => { modus = "db"; }; // Paket 2 (16.10.2026): Ladenwechsel – zentrale Liste in app.js

// Bild je Gericht: eigenes Foto (später), sonst Foto der Familie (foto/g-*.webp), sonst Sanjis Piktogramm (bilder/g-*.svg)
const PIKTO = { doener: "g-doener", "haehnchen-doener": "g-doener", wrap: "g-duerum", "falafel-wrap": "g-duerum", "doener-teller": "g-teller", teller: "g-teller", "falafel-teller": "g-teller",
  "doener-box": "g-box", lahmacun: "g-lahmacun", pide: "g-pide", seele: "g-seele", pizza: "g-pizza", nudeln: "g-nudeln", boerek: "g-boerek", falafel: "g-falafel",
  "doener-salat": "g-salat", salat: "g-salat", pommes: "g-pommes", burger: "g-burger", currywurst: "g-currywurst", wurst: "g-currywurst", "asia-nudeln": "g-asia-nudeln", "pad-thai": "g-asia-nudeln", "asia-reis": "g-asia-nudeln" };
export const FOTO = { "haehnchen-doener": "g-doener", "falafel-wrap": "g-falafel", wrap: "g-duerum", teller: "g-doener-teller", "falafel-teller": "g-falafel-teller", "doener-salat": "g-salat",
  shawarma: "g-duerum", pljeskavica: "g-cevapi", sosse: "g-sosse" };
// Fallback nach Name (erste passende Regel) und nach Katalogbereich, wenn die Familie kein Foto hat (Prüfung 15.10.)
const NAME_FOTO = [[/adana|urfa|spie(ß|ss)/i, "g-adana", "g-koefte"], [/lasagne/i, "g-lasagne", "g-auflauf"], [/sucuk/i, "g-sucuk"], [/suppe|[çc]orba/i, "g-suppe"],
  [/reis|pilav/i, "g-reis"], [/gem[üu]se/i, "g-gemuese"], [/schnitzel/i, "g-fleischgericht"], [/fr[üu]hst[üu]ck/i, "g-fruehstueck"], [/kuchen|torte/i, "g-kuchen"],
  [/kaffee|espresso|cappuccino|latte/i, "g-kaffee"], [/eis\b|eisbecher/i, "g-eis"], [/bier|pils|radler/i, "g-bier"], [/ayran/i, "g-ayran"],
  [/cola|fanta|sprite/i, "d-cola", "g-getraenk"], [/wasser|sprudel/i, "d-wasser", "g-getraenk"], [/limo|orange/i, "d-limo", "g-getraenk"], [/eistee|ice ?tea/i, "d-eistee", "g-getraenk"],
  [/[çc]ay|\btee\b/i, "d-tee", "g-getraenk"], [/energy/i, "d-energy", "g-getraenk"], [/saft|schorle/i, "d-saft", "g-getraenk"], [/gazoz/i, "d-gazoz", "g-getraenk"], [/getr[äa]nk/i, "g-getraenk"], [/pommes|fries/i, "g-pommes"], [/falafel/i, "g-falafel"], [/salat/i, "g-salat"],
  [/pizza/i, "g-pizza"], [/burger/i, "g-burger"], [/b[öo]rek/i, "g-boerek"], [/lahmacun/i, "g-lahmacun"], [/pide/i, "g-pide"], [/d[üu]r[üu]m|wrap/i, "g-duerum"],
  [/d[öo]ner/i, "g-doener"], [/currywurst/i, "g-currywurst"], [/wurst/i, "g-wurst"], [/nudel|pasta|spaghetti|penne/i, "g-nudeln"], [/nugget|wings|fingerfood/i, "g-fingerfood"]];
const BEREICH_FOTO = { doener: "g-doener", pizza: "g-pizza", burger: "g-burger", currywurst: "g-currywurst", asia: "g-asia-reis", salat: "g-salat", fingerfood: "g-fingerfood",
  beilagen: "g-pommes", alkoholfrei: "g-getraenk", suppe: "g-suppe", kuchen: "g-kuchen", kaffee: "g-kaffee", fruehstueck: "g-fruehstueck", eis: "g-eis", bier: "g-bier", fleischgericht: "g-fleischgericht" };
export function fotoName(g) {
  const f = g.rezeptFamilie || "";
  const kandidaten = ["g-" + fotoSlug(g.name)]; // 17.10.2026: Einzelbild je Gericht zuerst (Bildliste), dann Familie, Name, Bereich
  if (g.klasse === "getraenk") for (const [re, ...namen] of NAME_FOTO) if (re.test(g.name || "") && namen.some((n) => /ayran|getraenk|^d-/.test(n))) kandidaten.push(...namen); // Getränk nie mit Gerichtfoto
  if (g.klasse === "getraenk") kandidaten.push("g-getraenk");
  if (f) kandidaten.push(FOTO[f] || "g-" + f);
  for (const [re, ...namen] of NAME_FOTO) if (re.test(g.name || "")) { kandidaten.push(...namen); break; }
  if (g.bereich) kandidaten.push(BEREICH_FOTO[g.bereich]);
  if (g.klasse === "getraenk") kandidaten.push("g-getraenk");
  return kandidaten.find((n) => n && FOTOS.has(n)) || null;
}
export function gerichtBild(g) {
  const pikto = `bilder/${PIKTO[g.rezeptFamilie || ""] || "g-teller"}.svg`;
  if (g.foto) return `<img class="gerichtbild" data-foto="${esc(g.foto)}" src="${pikto}" alt="">`; // eigenes Foto des Wirts, wird nach dem Zeichnen aus der Ablage geladen
  const name = fotoName(g);
  return name ? `<img class="gerichtbild" src="foto/${name}.webp" alt="" loading="lazy">` : `<img class="gerichtbild pikto" src="${pikto}" alt="" loading="lazy">`;
}

export function vergleichView(stand) {
  const k = kalkulation(stand);
  const zeilen = k.zeilen.filter((z) => z.klasse !== "getraenk").map((z) => {
    const g = stand.gerichte.find((x) => x.id === z.id);
    const db = z.preisNetto !== null && z.waren !== null ? z.preisNetto - z.waren : null;
    return { z, g, db, marge: db !== null && z.preisNetto > 0 ? db / z.preisNetto : null, geschaetzt: rezeptStempel(g).stufe === "schaetzung" };
  });
  const mit = zeilen.filter((x) => x.db !== null).sort((a, b) => (modus === "db" ? b.db - a.db : b.marge - a.marge));
  const ohne = zeilen.filter((x) => x.db === null);
  const geschaetzt = mit.some((x) => x.geschaetzt);
  const karte = (x) => `<div class="vergleichkarte">
      <label class="bildwahl" aria-label="${esc(t("vergleich.eigenesFoto"))}">${gerichtBild(x.g)}<span class="bildwahl-sym">${sym("camera", "klein")}</span><input type="file" accept="image/*" capture="environment" data-f="gericht-foto" data-id="${esc(x.g.id)}" class="versteckt"></label>
      <div class="vk-text">
        <div class="vk-kopf"><b>${esc(x.z.name)}</b><span class="vk-preis">${x.z.preisBrutto !== null ? fmtEuro(x.z.preisBrutto, { dezimal: 2 }) : "–"}</span></div>
        <div class="vk-zeile ${wareneinsatzWarnung(x.z.wareneinsatzAnteil) ? "minus" : ""}"><span>${esc(t("vergleich.ware"))}</span><span>${x.geschaetzt ? "≈ " : ""}${fmtEuro(x.z.waren, { dezimal: 2 })}${wareneinsatzWarnung(x.z.wareneinsatzAnteil) ? ` · ${esc(t("vergleich.wareHoch", fmtZahl(x.z.wareneinsatzAnteil * 100, 0)))}` : ""}</span></div>
        <div class="vk-zeile ${x.db < 0 ? "minus" : ""}"><span>${esc(t("vergleich.db"))}</span><span>${fmtEuro(x.db, { dezimal: 2 })}</span></div>
        <div class="vk-zeile ${x.marge < 0 ? "minus" : ""}"><span>${esc(t("vergleich.marge"))}</span><span>${fmtZahl(x.marge * 100, 0)} %</span></div>
        <span class="vk-balken"><i class="${x.marge < 0.5 ? "knapp" : ""}" style="width:${Math.max(0, Math.min(100, Math.round(x.marge * 100)))}%"></i></span>
      </div></div>`;
  return `<div class="kopfband"><h1>${esc(t("vergleich.titel"))}</h1><div class="unter">${esc(t("vergleich.unter"))}</div></div>
    <div class="inhalt vergleich">
      <div class="seg umschalter" role="tablist">${["db", "marge"].map((m) => `<button type="button" role="tab" aria-selected="${modus === m}" class="${modus === m ? "an" : ""}" data-a="vergleich-modus" data-wert="${m}">${esc(t("vergleich.tab." + m))}</button>`).join("")}</div>
      ${mit.length ? mit.map(karte).join("") : `<div class="karte leer"><div>${esc(t("vergleich.leer"))}</div><button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="preise">${esc(t("start.preiseAendern"))}</button></div>`}
      ${ohne.length ? `<div class="karte"><h2>${esc(t("vergleich.ohneZahlen", ohne.length))}</h2>${ohne.map((x) => `<div class="vk-ohne">${esc(x.z.name)} · <small>${esc(x.z.preisBrutto === null ? t("ergebnis.preisFehlt") : t("vergleich.einkaufFehlt"))}</small></div>`).join("")}</div>` : ""}
      ${geschaetzt ? `<p class="hinweis geschaetzt-hinweis">≈ ${esc(t("vergleich.hinweis"))}</p>` : ""}
    </div>${nav("vergleich")}`;
}
