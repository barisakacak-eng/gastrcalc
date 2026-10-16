// Müll mit einem Tipp (Drei Ebenen, Punkt 8 – 15.10.2026): Foto-Raster der häufigsten Waren dieses Ladens (Gerichte und Rohware gemischt).
// Tipp auf ein Foto = sofort eingetragen mit der üblichen Menge, Haken + Zähler „2ד + Hinweis mit „Rückgängig" (= Storno).
// Lang drücken (500 ms) oder „…" öffnet das Detail (Menge, Foto, Personalessen). „Andere" öffnet die Suche (auch türkische/englische Namen)
// und „Eimer gewogen". Die Wochen-Statistik (früher Müll-Zentrale) wohnt jetzt im Büro unter Listen (muellStatistikView).
// Im Personal-Modus: keine Euro-Beträge, nur Mengen; Einträge tragen von: personId. Rechenwerk unverändert (js/muell.js).
import { t, einheitLabel, sprache } from "../i18n.js";
import { esc, parseZahl, fmtEuro, fmtZahl, heuteGeschaeft as heute, wertAnzeige } from "../util.js"; // Paket 3 (16.10.2026), M7: Müll-Tag = Geschäftstag (bis 4 Uhr = Vortag)
import { EINHEITEN } from "../data/katalog.js";
import { normalisieren, suchRang } from "../data/suchnamen.js";
import { mengeUmrechnen, SVEV_2026 } from "../engine.js";
import { gerichtWeg, rohwareWeg, eimerEintragen, eimerVerrechnen, personalessen, mahlzeitJetzt, muellWoche, muellMonatVergleich, haeufigsteMuell, muellVorschau,
  muellSchluessel, standardMenge, muellTippEintragen, muellStornieren, tippsHeute, muellHeute } from "../muell.js";
import { nav } from "./nav.js";
import { sym } from "../symbole.js";
import { FOTOS } from "../data/fotos.js";
import { gerichtBild } from "./vergleich.js";
import { personalAktiv, personalVon, personalLeiste } from "./personal.js";
// Bild für Rohware, Verpackung und Getränke (Prüfung 15.10.: Reihenfolge zählt, die erste passende Regel gewinnt)
const VERP = [[/handschuh/i, "v-handschuhe"], [/tragetasche|tasche/i, "v-tragetasche"], [/t[üu]te/i, "v-doenertuete"], [/alu|folie/i, "v-alufolie"], [/men[üu]/i, "v-menueschale"],
  [/karton/i, "v-pizzakarton"], [/pommes/i, "v-pommesschale"], [/dressing|so(ß|ss)e|dip|sauce/i, "v-dressingbecher"], [/salat/i, "v-salatschale"], [/burger/i, "v-burgerbox"],
  [/box|asia|nudel/i, "v-asiabox"], [/becher|cup/i, "v-becher"], [/serviette|papier/i, "v-serviette"]];
const WARE = [[/brot|fladen|wrap|yufka|lavash|bun\b|br[öo]tchen|baguette|toast|tortilla/i, "w-brot"], [/onion|stick|nugget|frikandel|fingerfood|wings/i, "w-fingerfood-tk"],
  [/so(ß|ss)e|sauce|mayo|ketchup|dip|dressing|remoulade|aioli|hummus|ajvar|senf|pesto|tzatziki|cac[iı]k/i, "w-sosse"],
  [/gew[üu]rz|salz|pfeffer|oregano|pulver|kreuzk|kumin|flocken|pul biber|sumach|thymian|zimt/i, "w-gewuerz"], [/joghurt|quark|sahne|schmand|cr[eè]me/i, "w-joghurt"],
  [/falafel/i, "w-falafel"], [/sucuk/i, "w-sucuk"], [/salami/i, "w-salami"], [/schinken/i, "w-schinken"], [/d[öo]ner|gyros|kalb|lamm|rind/i, "w-doenerfleisch"],
  [/h[äa]hnchen|chicken|pute|truthahn/i, "w-haehnchen"], [/spie(ß|ss)/i, "w-doenerfleisch"], [/hack|patty|k[öo]fte|cevapi/i, "w-hack"], [/wurst|krakauer|wiener/i, "w-wurst"],
  [/feta|hirten|schafsk|wei(ß|ss)k[äa]se/i, "w-feta"], [/k[äa]se|mozzarella|cheddar|gouda|emmentaler|halloumi/i, "w-kaese"], [/thunfisch/i, "w-thunfisch"],
  [/champignon|pilz/i, "w-champignon"], [/peperoni|jalape|chili/i, "w-peperoni"], [/paprika/i, "w-paprika"], [/knoblauch/i, "w-knoblauch"], [/zwiebel/i, "w-zwiebel"],
  [/gurke/i, "w-gurke"], [/tomate/i, "w-tomate"], [/salat|eisberg|rucola|lollo/i, "w-salat"], [/petersilie|basilikum|minze|dill|kr[äa]uter|koriander/i, "w-petersilie"],
  [/kohl/i, "w-kohl"], [/spinat/i, "w-spinat"], [/mais/i, "w-mais"], [/(ö|oe)l(\s|$)|frittier/i, "w-oel"], [/olive/i, "w-oliven"], [/ananas/i, "w-ananas"], [/zitrone|limette/i, "w-zitrone"], [/salatmix|salatmischung/i, "w-salatmix"],
  [/nudel|penne|spaghetti|fusilli|tagliatelle|lasagne/i, "w-nudeln"], [/reis|basmati|bulgur|couscous/i, "w-reis"], [/mehl|teig|hefe/i, "w-mehl"], [/\bei(er)?\b/i, "w-ei"],
  [/pommes|kroketten|wedges|kartoffel/i, "w-pommes-tk"]];
const GETRAENK = [[/ayran/i, "g-ayran"], [/cola|fanta|sprite|dose/i, "d-cola"], [/wasser|sprudel/i, "d-wasser"], [/limo|orange/i, "d-limo"], [/eistee|ice ?tea/i, "d-eistee"],
  [/[çc]ay|\btee\b/i, "d-tee"], [/energy|red ?bull/i, "d-energy"], [/saft|schorle/i, "d-saft"], [/gazoz/i, "d-gazoz"]];
// Echte Fotos (Sanji Welle 3, r-* und v-*), sobald vorhanden; sonst bleibt das Piktogramm
const R_ALIAS = { "w-doenerfleisch": (n) => /h[äa]hnchen|pute/i.test(n) ? "r-haehnchenspiess" : /geschnitten|kg|gegart/i.test(n) ? "r-doener-geschnitten" : "r-doenerspiess",
  "w-kohl": (n) => /wei(ß|ss)/i.test(n) ? "r-weisskohl" : "r-rotkohl", "w-kaese": (n) => /mozzarella/i.test(n) && !/gerieben/i.test(n) ? "r-mozzarella" : "r-pizzakaese",
  "w-ei": () => "r-eier", "w-sosse": (n) => /knoblauch|joghurt|wei(ß|ss)/i.test(n) ? "r-knoblauchsauce" : /scharf|chili|acı/i.test(n) ? "r-scharfe-sosse" : "r-ketchup-mayo",
  "w-brot": (n) => /yufka|wrap|d[üu]r[üu]m|lavash|tortilla/i.test(n) ? "r-yufka" : /bun|br[öo]tchen/i.test(n) ? "r-buns" : "r-fladenbrot",
  "w-falafel": () => "r-falafel-tk", "w-mehl": (n) => /pizza/i.test(n) ? "r-pizzateig" : /lahmacun/i.test(n) ? "r-lahmacun-teig" : "r-mehl", "w-hack": (n) => /patty/i.test(n) ? "r-patty" : "r-hack" };
const fotoFuer = (n, name) => { const kand = n.startsWith("v-") ? n : R_ALIAS[n] ? R_ALIAS[n](name) : "r-" + n.slice(2); return FOTOS.has(kand) ? kand : null; };
export function wareBild(x) {
  if (x.gruppe === "getraenk") { const d = (GETRAENK.find(([re, n]) => re.test(x.name) && FOTOS.has(n)) || [])[1] || "g-getraenk";
    return `<img class="gerichtbild mini" src="foto/${d}.webp" alt="" loading="lazy">`; }
  const liste = x.gruppe === "verpackung" ? VERP : WARE;
  const n = (liste.find(([re]) => re.test(x.name)) || [])[1] || "w-ware";
  const foto = fotoFuer(n, x.name);
  return foto ? `<img class="gerichtbild mini" src="foto/${foto}.webp" alt="" loading="lazy">` : `<img class="gerichtbild mini pikto" src="bilder/${/zitrone|salatmix/.test(n) ? "w-ware" : n}.svg" alt="" loading="lazy">`;
}
// Kleines Bild auf Gericht-Kacheln (Foto der Familie oder eigenes Foto)
const thumb = (stand, id) => { const g = (stand.gerichte || []).find((x) => x.id === id); return g ? gerichtBild(g).replace('class="gerichtbild', 'class="gerichtbild mini') : ""; };
import { datumLesbar, tagGewaehlt, eintragName, tagLesbar } from "./tag.js";

let ansicht = "start";   // "start" (Foto-Raster) | "eingabe" (Detail: Menge, Foto, Personalessen)
let suche = "";
let wahl = null;         // Detail: { typ: "gericht"|"artikel"|"eimer", id?, name, menge, einheit, packung?, personal }
let zuletzt = null;      // { ids, schluessel, text, zeit } – gerade eingetragen, mit „Rückgängig"
let auswahlOffen = false; // Suchblatt „Andere"
let foto = null;          // Foto (optional) zum nächsten Eintrag (Upload-Eintrag)
let letzterTipp = { id: "", zeit: 0 };
let toastUhr = null;
const TOAST_MS = 5000;
const RASTER = 8;         // 8 Fotos + „Andere" = 3 × 3

export const muellKennung = () => `${ansicht}:${wahl ? wahl.typ + wahl.name : ""}`;
export function muellZuruecksetzen() { ansicht = "start"; suche = ""; wahl = null; zuletzt = null; auswahlOffen = false; foto = null; }
export function muellEingabeOeffnen() { ansicht = "start"; suche = ""; wahl = null; auswahlOffen = false; foto = null; } // Schnellweg „Müll": direkt aufs Foto-Raster
export function muellFotoSetzen(eintrag) { foto = eintrag; }
export function muellZurueck() { if (auswahlOffen) { auswahlOffen = false; if (!wahl) ansicht = "start"; return true; } if (ansicht !== "start") { ansicht = "start"; wahl = null; return true; } return false; }
export const muellAnsicht = () => ansicht;

const letzteTage = (n) => { const out = []; for (let i = 0; i < n; i++) { const d = new Date(); d.setDate(d.getDate() - i); out.push(heute(d)); } return out; }; // Paket 3, M7: Geschäftstage
const kurzTag = (iso) => t("kuehl.tage." + new Date(iso + "T12:00:00").getDay());
const mengeText = (menge, einheit) => einheit === "portion" ? t("muell1.portion", menge, fmtZahl(menge, Number.isInteger(menge) ? 0 : 1)) : `${fmtZahl(menge, Number.isInteger(menge) ? 0 : 2)} ${einheitLabel(einheit)}`;
const bildFuer = (stand, x) => (x.typ === "gericht" ? thumb(stand, x.id) : wareBild(x));

// ---------- Foto-Raster ----------
function kachelHtml(stand, x, zaehl, frisch) {
  const m = standardMenge(stand, x); const k = muellSchluessel(x); const n = zaehl[k] || 0;
  const daten = `data-typ="${x.typ}" data-id="${esc(x.id || "")}" data-name="${esc(x.name)}"`;
  return `<div class="karte ware ${frisch === k ? "frisch" : ""}" data-k="${esc(k)}">
    <button type="button" class="ware-tipp" data-a="muell-tipp" ${daten}>${bildFuer(stand, x)}<span class="wt"><b>${esc(x.name)}</b><small>${esc(mengeText(m.menge, m.einheit))}</small></span></button>
    ${n ? `<span class="zaehler zahl">${n}×</span>` : ""}${frisch === k ? `<span class="haken">${sym("check")}</span>` : ""}
    <button type="button" class="ware-mehr" data-a="muell-detail" ${daten} aria-label="${esc(t("muell1.menge"))}">…</button>
  </div>`;
}
function pilleHtml(stand, D) {
  const h = muellHeute(stand, D);
  const zahl = personalAktiv() ? `${fmtZahl(h.anzahl)}×` : fmtEuro(h.wert, { dezimal: 2 });
  return `<span class="heutewert" id="muell-heute"><small>${esc(D === heute() ? t("tag.titel") : datumLesbar(D).slice(0, 6))}</small><span class="zahl">${zahl}</span></span>`;
}
function toastHtml() {
  if (!zuletzt || Date.now() - zuletzt.zeit > TOAST_MS) return "";
  return `<div class="muelltoast" role="status" aria-live="polite"><span class="ok">${sym("check")}</span><div><b>${esc(zuletzt.text)}</b><small>${esc(t("muell1.eingetragen"))}</small></div>
    <button type="button" class="rueck" data-a="muell1-zurueck" data-id="${esc(zuletzt.ids)}">${esc(t("muell.rueckgaengig"))}</button></div>`;
}

export function muellView(stand) {
  const D = tagGewaehlt(); const nach = D !== heute(); const pers = personalAktiv();
  const oben = pers ? personalLeiste(true) : "";
  const unten = pers ? "" : nav("muell", { schnell: false });
  if (ansicht === "eingabe") return oben + formView(stand, D) + (auswahlOffen ? `<div class="blatthinten" data-a="muell-auswahl-zu"></div><div class="blatt auswahlblatt" role="dialog">${eingabeView(stand, D)}</div>` : "") + unten;
  return oben + rasterView(stand, D, nach) + unten;
}

function rasterView(stand, D, nach) {
  const kacheln = haeufigsteMuell(stand, { datum: D, max: RASTER, mischen: true }); const zaehl = tippsHeute(stand, D);
  const frisch = zuletzt && Date.now() - zuletzt.zeit <= TOAST_MS ? zuletzt.schluessel : null;
  return `<div class="inhalt muell1">
    <div class="muellkopf1"><h1>${esc(t("muell1.titel"))}</h1>${pilleHtml(stand, D)}</div>
    ${nach ? `<div class="nachband">${esc(t("kuehl.nacherfasst"))} · ${esc(tagLesbar(D))} <button type="button" class="leise" data-a="tag-datum" data-wert="${heute()}">${esc(t("tag.titel"))}</button></div>` : ""}
    ${kacheln.length ? `<div class="muellraster">${kacheln.map((x) => kachelHtml(stand, x, zaehl, frisch)).join("")}
      <button type="button" class="karte ware andere" data-a="muell-andere"><span class="rund">${sym("plus")}</span><b>${esc(t("muell1.andere"))}</b></button></div>`
    : `<div class="karte leer"><div>${esc(t("muell.keineGerichte"))}</div>${personalAktiv() ? "" : `<button type="button" class="knopf zweit" data-a="nav" data-wert="kartefoto">${esc(t("foto.karteKnopf"))}</button>`}</div>
      <button type="button" class="karte ware andere einzeln" data-a="muell-andere"><span class="rund">${sym("plus")}</span><b>${esc(t("muell1.andere"))}</b></button>`}
  </div>${toastHtml()}`;
}

// Nach einem Tipp nur die getippte Kachel, die Kopfzahl und den Hinweis tauschen – nicht den ganzen Bildschirm (< 100 ms).
export function muellTippZeigen(root, stand) {
  const D = tagGewaehlt(); const zaehl = tippsHeute(stand, D);
  const raster = root.querySelector(".muellraster"); if (!raster) return false;
  for (const alt of raster.querySelectorAll(".ware.frisch")) { alt.classList.remove("frisch"); alt.querySelector(".haken")?.remove(); }
  const ziel = zuletzt ? raster.querySelector(`.ware[data-k="${CSS.escape(zuletzt.schluessel)}"]`) : null;
  if (ziel) { const x = kachelDaten(ziel.querySelector("[data-a='muell-tipp']"), stand); if (x) ziel.outerHTML = kachelHtml(stand, x, zaehl, zuletzt.schluessel); }
  const p = root.querySelector("#muell-heute"); if (p) p.outerHTML = pilleHtml(stand, D);
  root.querySelector(".muelltoast")?.remove();
  const html = toastHtml(); if (html) raster.closest(".inhalt").insertAdjacentHTML("afterend", html);
  clearTimeout(toastUhr); const id = zuletzt?.ids;
  toastUhr = setTimeout(() => { if (zuletzt?.ids === id) { const el = root.querySelector(".muelltoast"); if (el) el.remove(); const f = root.querySelector(".ware.frisch"); if (f) { f.classList.remove("frisch"); f.querySelector(".haken")?.remove(); } } }, TOAST_MS);
  return true;
}
// Rückgängig aus dem Hinweis: stornieren, Kachel und Zahl auffrischen
export function muellZurueckZeigen(root, stand) {
  const raster = root.querySelector(".muellraster"); const D = tagGewaehlt(); const zaehl = tippsHeute(stand, D);
  if (raster) for (const w of raster.querySelectorAll(".ware[data-k]")) { if (!w.classList.contains("frisch") && !w.querySelector(".zaehler")) continue; const x = kachelDaten(w.querySelector("[data-a='muell-tipp']"), stand); if (x) w.outerHTML = kachelHtml(stand, x, zaehl, null); }
  const p = root.querySelector("#muell-heute"); if (p) p.outerHTML = pilleHtml(stand, D);
  root.querySelector(".muelltoast")?.remove();
}
function kachelDaten(el, stand) {
  if (!el) return null; const typ = el.dataset.typ;
  if (typ === "gericht") { const g = (stand.gerichte || []).find((x) => x.id === el.dataset.id); return g ? { typ, id: g.id, name: g.name, einheit: "portion", gruppe: "speise" } : null; }
  const a = (stand.artikel || []).find((x) => x.name === el.dataset.name); return a ? { typ: "artikel", name: a.name, einheit: a.packung?.einheit || a.einheit || "stk", gruppe: a.gruppe } : null;
}

// Lang drücken = Detail öffnen. Einmal an der Wurzel einrichten; beiLang(el) zeichnet neu.
let unterdrueckenBis = 0;
export const muellKlickUnterdrueckt = () => Date.now() < unterdrueckenBis;
export function muellLangdruckEinrichten(root, beiLang) {
  let uhr = null, x0 = 0, y0 = 0;
  const weg = () => { clearTimeout(uhr); uhr = null; };
  root.addEventListener("pointerdown", (ev) => {
    const el = ev.target.closest('[data-a="muell-tipp"]'); if (!el) return;
    x0 = ev.clientX; y0 = ev.clientY; weg();
    uhr = setTimeout(() => { uhr = null; unterdrueckenBis = Date.now() + 900; if (navigator.vibrate) try { navigator.vibrate(15); } catch { /* egal */ } beiLang(el); }, 500);
  });
  root.addEventListener("pointermove", (ev) => { if (uhr && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10) weg(); });
  for (const n of ["pointerup", "pointercancel", "pointerleave"]) root.addEventListener(n, weg);
  root.addEventListener("contextmenu", (ev) => { if (ev.target.closest(".muellraster")) ev.preventDefault(); });
}

// ---------- Büro / Listen: die Wochen-Statistik (frühere Müll-Zentrale) ----------
export function muellStatistikView(stand) {
  const D = heute();
  const w = muellWoche(stand, D); const mv = muellMonatVergleich(stand, D);
  const leer = !w.anzahl;
  const fuell = mv.vormonat ? Math.min(1, mv.monat / Math.max(mv.monat, mv.vormonat * 1.25)) : (mv.monat > 0 ? 0.5 : 0);
  const linie = mv.vormonat ? Math.min(1, mv.vormonat / Math.max(mv.monat, mv.vormonat * 1.25)) : null;
  const vormonatName = new Date(Number(D.slice(0, 4)), Number(D.slice(5, 7)) - 2, 1).toLocaleDateString(sprache(), { month: "long" });
  return `<div class="muellzentrale">
    <div class="karte muellkarte">
      <small class="lbl">${esc(t("muell.wocheTonne"))}</small>
      <div class="muellkopf"><span class="riesig">${fmtEuro(w.summe, { dezimal: w.summe < 100 ? 2 : 0 })}</span>
        <div class="monatstonne" aria-label="${esc(t("muell.monatTonne"))}"><i class="fuellung" style="height:${Math.round(fuell * 100)}%"></i>${linie !== null ? `<i class="vormonat" style="bottom:${Math.round(linie * 100)}%"></i>` : ""}</div></div>
      <small>${leer ? esc(t("muell.leerWoche")) : esc(t("muell.wocheZeile", w.portionen !== null ? fmtZahl(w.portionen, w.portionen < 10 ? 1 : 0) : "–", fmtZahl(w.kg, 1)))}${w.ohneWert ? ` · ${esc(t("listen.ohneWert", w.ohneWert))}` : ""}</small>
      ${mv.vormonat !== null ? `<small class="${mv.monat <= mv.vormonat ? "besser" : "schlechter"}">${esc(t(mv.monat <= mv.vormonat ? "muell.wenigerAls" : "muell.mehrAls", vormonatName, mv.tag))}</small>` : ""}
      <div class="balken muell">${w.tage.map((x) => `<i class="${x.datum === D ? "heute" : ""}"><b style="height:${w.max > 0 ? Math.round(x.wert / w.max * 100) : 0}%"></b></i>`).join("")}</div>
      <div class="tage">${w.tage.map((x) => `<span>${esc(kurzTag(x.datum))}</span>`).join("")}</div>
    </div>
    ${w.top.length ? `<div class="karte"><h2>${esc(t("muell.ammeisten"))}</h2>${w.top.map((x, i) => `<div class="zeile topzeile g-${esc(x.art === "gericht" || x.ref?.typ === "gericht" ? "speise" : x.art)}"><div class="oben"><div class="name"><span class="rang">${i + 1}</span> ${esc(x.art === "eimer" ? t("muell.eimer") : x.ref?.name || "")}<small>${esc(x.art === "eimer" ? `${fmtZahl(x.menge, 1)} kg` : `${fmtZahl(x.menge, 1)} ${einheitLabel(x.einheit)}`)}</small></div><b>${x.wert > 0 ? fmtEuro(x.wert, { dezimal: 2 }) : `<span class="marke offen">${esc(t("tag.keinPreis"))}</span>`}</b></div></div>`).join("")}</div>` : ""}
    <div class="karte"><h2>${esc(t("muell.andererTag"))}</h2>
      <div class="chips">${letzteTage(7).map((d, i) => `<button type="button" class="chip klein" data-a="muell1-nachtragen" data-wert="${d}">${esc(i === 0 ? t("tag.titel") : i === 1 ? t("tag.gestern") : datumLesbar(d).slice(0, 5))}</button>`).join("")}</div>
      <p class="hinweis">≈ ${esc(t("muell.orientierung"))}</p></div>
  </div>`;
}

// ---------- „Andere": Suche über alle Waren (auch türkische/englische Namen) + Eimer gewogen ----------
function eingabeView(stand, D) {
  const q = normalisieren(suche);
  const kacheln = q
    ? [...(stand.gerichte || []).filter((g) => g.klasse !== "getraenk").map((g) => ({ typ: "gericht", id: g.id, name: g.name, einheit: "portion", gruppe: "speise" })),
       ...(stand.artikel || []).filter((a) => a.benutzt !== false).map((a) => ({ typ: "artikel", name: a.name, einheit: a.packung?.einheit || a.einheit || "stk", gruppe: a.gruppe }))]
        // auch „domates", „sogan", „tomato" finden (Suchnamen); Treffer im deutschen Namen zuerst
        .filter((x) => suchRang(x.name, q) >= 0).sort((a, b) => suchRang(a.name, q) - suchRang(b.name, q)).slice(0, 24)
    : haeufigsteMuell(stand, { datum: D });
  return `<div class="inhalt">
    <h2>${esc(t("muell.auswaehlen"))}</h2>
    <input class="textfeld" data-f="muell-suche" value="${esc(suche)}" placeholder="${esc(t("muell.suchen"))}" autocomplete="off">
    <div class="zweier muellkacheln">
      ${kacheln.map((x) => `<button type="button" class="kachel klein g-${esc(x.gruppe || "speise")}" data-a="muell-kachel" data-typ="${x.typ}" data-id="${esc(x.id || "")}" data-name="${esc(x.name)}">${bildFuer(stand, x)}<b>${esc(x.name)}</b><small>${esc(x.typ === "gericht" ? t("muell.teller") : einheitLabel(x.einheit === "g" ? "kg" : x.einheit))}</small></button>`).join("")}
      <button type="button" class="kachel klein eimerkachel" data-a="muell-kachel" data-typ="eimer" data-name="">${FOTOS.has("m-eimer-foto") ? `<img class="gerichtbild mini" src="foto/m-eimer-foto.webp" alt="">` : `<img class="gerichtbild mini pikto" src="bilder/m-eimer.svg" alt="">`}<b>${esc(t("muell.eimer"))}</b><small>${esc(t("muell.eimerNurGewicht"))}</small></button>
    </div>
    ${!kacheln.length && q ? `<p class="hinweis">${esc(t("muell.nichtsGefunden"))}</p>` : ""}
  </div>`;
}

// ---------- Detail: Menge · Foto · Personalessen · ein Knopf (ohne Untertitel in drei Sprachen) ----------
function formView(stand, D) {
  const w = wahl; const pers = personalAktiv(); const einheit = !w ? "" : w.typ === "gericht" ? "portion" : w.typ === "eimer" ? "kg" : w.einheit;
  const basis = w ? EINHEITEN[w.einheit]?.basis : null;
  const ganze = w?.typ === "artikel" && w.packung?.menge > 0 ? mengeUmrechnen(w.packung.menge, w.packung.einheit, w.einheit) : null;
  const wert = !w || pers ? null : w.typ === "eimer" ? (w.menge > 0 ? eimerVerrechnen(stand, D, w.menge).wert : null) : muellVorschau(stand, w, D);
  const personalWert = !pers && w?.typ === "gericht" && w.personal ? (w.menge || 0) * (SVEV_2026[mahlzeitJetzt()] ?? SVEV_2026.mittag) : null;
  const einheitText = w?.typ === "gericht" ? t("muell.teller") : einheitLabel(einheit);
  return `<div class="inhalt muellform">
    <button type="button" class="karte auswahlkarte ${w ? "gewaehlt" : ""}" data-a="muell-auswahl">
      <span class="auswahlsym">${w && w.typ !== "eimer" ? bildFuer(stand, w) : sym(w?.typ === "eimer" ? "scale" : "trash-2", "gross")}</span>
      <span><b>${esc(w ? (w.typ === "eimer" ? t("muell.eimer") : w.name) : t("muell.auswaehlen"))}</b>${w ? `<small>${esc(t("muell.aendern"))}</small>` : ""}</span>${sym("chevron-right")}</button>
    ${w ? `<div class="karte mengekarte">
      <div class="stepper gross"><button type="button" data-a="muell-d" data-d="-1" aria-label="−">−</button><div class="wert"><input inputmode="decimal" data-f="muell-menge" value="${esc(wertAnzeige(w.menge))}" aria-label="${esc(t("muell1.menge"))}"> <small>${esc(einheitText)}</small></div><button type="button" data-a="muell-d" data-d="1" aria-label="+">+</button></div>
      <div class="chips">${chipsFuer(w).map((c) => `<button type="button" class="chip ${w.menge === c ? "an" : ""}" data-a="muell-chip" data-wert="${c}">${esc(fmtZahl(c, c < 1 ? 1 : 0))} ${esc(w.typ === "gericht" ? "" : einheitLabel(einheit))}</button>`).join("")}${ganze ? `<button type="button" class="chip" data-a="muell-chip" data-wert="${ganze}">${esc(t("muell.ganzePackung"))}</button>` : ""}</div>
      ${w.typ === "artikel" && (basis === "g" || basis === "ml") ? `<div class="periode">${(basis === "g" ? ["g", "kg"] : ["ml", "l"]).map((e) => `<button type="button" class="${w.einheit === e ? "an" : ""}" data-a="muell-einheit" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div>` : ""}
      ${pers ? "" : `<p class="muellwert">${w.menge > 0 ? (personalWert !== null ? esc(t("muell.personalWert", fmtEuro(personalWert, { dezimal: 2 }))) : wert !== null ? esc(t("muell.inDerTonne", fmtEuro(wert, { dezimal: 2 }))) : `<span class="leise-text">${esc(t("tag.keinPreis"))}</span>`) : ""}</p>`}
    </div>
    <div class="zweier formkacheln">
      <label class="karte formkachel fotokachel-muell ${foto ? "an" : ""}"><span class="kachelsym">${sym(foto ? "check" : "camera")}</span><b>${esc(foto ? t("muell.fotoDabei") : t("muell.foto"))}</b>
        <input type="file" accept="image/*" capture="environment" data-f="muell-foto" class="versteckt"></label>
      ${w.typ === "gericht" ? `<button type="button" class="karte formkachel personalkachel ${w.personal ? "an" : ""}" role="switch" aria-checked="${w.personal}" data-a="muell-personal"><span class="kachelsym">${sym(w.personal ? "check" : "chef-hat")}</span><b>${esc(t("muell1.personalessen"))}</b></button>` : ""}
    </div>
    ${w.typ === "eimer" ? `<p class="hinweis">${esc(t("muell.eimerHinweisKurz"))}</p>` : ""}` : ""}
    <button type="button" class="knopf glut muellhaupt" data-a="muell-weg-damit" ${w && w.menge > 0 ? "" : "disabled"}>${sym("check")} <b>${esc(t("muell.eintragen"))}</b></button>
    <button type="button" class="leise" data-a="muell-start">‹ ${esc(t("muell1.titel"))}</button>
  </div>`;
}

const chipsFuer = (w) => (w.typ === "gericht" ? [1, 2, 5] : w.typ === "eimer" ? [1, 2, 5, 10] : w.einheit === "kg" || w.einheit === "l" ? [0.5, 1, 2] : w.einheit === "g" || w.einheit === "ml" ? [250, 500, 1000] : [1, 2, 5]);

// Detail-Wahl aus einer Kachel (Raster oder Suche) mit der üblichen Menge vorbelegt
function wahlAus(el, stand) {
  const typ = el.dataset.typ;
  if (typ === "gericht") { const g = stand.gerichte.find((x) => x.id === el.dataset.id); return g ? { typ, id: g.id, name: g.name, menge: 1, einheit: "portion", gruppe: "speise", personal: false } : null; }
  if (typ === "artikel") { const a = stand.artikel.find((x) => x.name === el.dataset.name); if (!a) return null; const m = standardMenge(stand, { typ, name: a.name });
    return { typ, name: a.name, menge: m.menge, einheit: m.einheit, packung: a.packung, gruppe: a.gruppe, personal: false }; }
  return { typ: "eimer", name: "", menge: null, einheit: "kg" };
}

// ---------- Aktionen ----------
// Ein Tipp auf ein Foto: sofort eintragen. Rückgabe { eintrag } oder false. Doppeltipp (< 350 ms auf dieselbe Kachel) zählt einmal.
export function muellTipp(el, stand) {
  const x = kachelDaten(el, stand); if (!x) return false;
  const k = muellSchluessel(x); const jetzt = Date.now();
  if (letzterTipp.id === "tipp:" + k && jetzt - letzterTipp.zeit < 350) return false;
  letzterTipp = { id: "tipp:" + k, zeit: jetzt };
  const e = muellTippEintragen(stand, x, { datum: tagGewaehlt(), von: personalVon(stand) });
  if (!e) return false;
  zuletzt = { ids: e.id, schluessel: k, text: `${x.name} · ${mengeText(e.menge, e.ref?.typ === "gericht" ? "portion" : e.einheit)}`, zeit: jetzt };
  return { eintrag: e };
}
export function muellTippZurueck(stand, ids) { const n = muellStornieren(stand, ids); if (zuletzt && zuletzt.ids === ids) zuletzt = null; return n; }

export function muellAktion(name, el, stand) {
  const D = tagGewaehlt();
  if (name === "muell-eingabe" || name === "muell-andere") { ansicht = "eingabe"; wahl = null; suche = ""; foto = null; auswahlOffen = true; return true; }
  if (name === "muell-detail") { const w = wahlAus(el, stand); if (!w) return false; wahl = w; ansicht = "eingabe"; auswahlOffen = false; foto = null; return true; }
  if (name === "muell-start") { ansicht = "start"; wahl = null; auswahlOffen = false; return true; }
  if (name === "muell-auswahl") { auswahlOffen = true; suche = ""; return true; }
  if (name === "muell-auswahl-zu") { auswahlOffen = false; if (!wahl) ansicht = "start"; return true; }
  if (name === "muell-kachel") { const w = wahlAus(el, stand); if (!w) return false; wahl = w; auswahlOffen = false; return true; }
  if (!wahl) return false;
  if (name === "muell-d") { const s = wahl.typ === "gericht" || wahl.einheit === "stk" ? 1 : wahl.einheit === "g" || wahl.einheit === "ml" ? 50 : 0.1; wahl.menge = Math.max(0, Math.round(((Number(wahl.menge) || 0) + Number(el.dataset.d) * s) * 100) / 100) || null; return true; }
  if (name === "muell-chip") { wahl.menge = Number(el.dataset.wert); return true; }
  if (name === "muell-einheit") { wahl.menge = mengeUmrechnen(wahl.menge, wahl.einheit, el.dataset.wert); wahl.einheit = el.dataset.wert; return true; }
  if (name === "muell-personal") { wahl.personal = !wahl.personal; return true; }
  if (name === "muell-weg-damit") {
    if (!(wahl.menge > 0)) return false;
    const k = `${wahl.typ}:${wahl.name}:${wahl.menge}`; const jetzt = Date.now();
    if (letzterTipp.id === k && jetzt - letzterTipp.zeit < 600) return false; // Doppeltipp
    letzterTipp = { id: k, zeit: jetzt };
    let e = null; const ids = [];
    if (wahl.typ === "gericht") {
      const g = stand.gerichte.find((x) => x.id === wahl.id); if (!g) return false;
      if (wahl.personal) { for (let i = 0; i < Math.max(1, Math.round(wahl.menge)); i++) { e = personalessen(stand, g, { datum: D }); ids.push(e.id); } }
      else { e = gerichtWeg(stand, g, { datum: D, anzahl: wahl.menge }); ids.push(e.id); }
    } else if (wahl.typ === "artikel") { const a = stand.artikel.find((x) => x.name === wahl.name); if (!a) return false; e = rohwareWeg(stand, a, { datum: D, menge: wahl.menge, einheit: wahl.einheit }); if (e) ids.push(e.id); }
    else { e = eimerEintragen(stand, { datum: D, kg: wahl.menge }); if (e) ids.push(e.id); }
    if (!e) return false;
    const von = personalVon(stand);
    for (const id of ids) { const x = stand.schwund.find((y) => y.id === id); if (!x) continue; if (foto) x.foto = foto.id; if (von) x.von = von; } // Foto als Nachweis, Person im Personal-Modus
    foto = null;
    zuletzt = { ids: ids.join(","), schluessel: e.art === "eimer" ? "eimer" : muellSchluessel(e), text: `${e.art === "eimer" ? t("muell.eimer") : eintragName(e, stand)} · ${e.art === "eimer" ? fmtZahl(e.gewogen, 1) + " kg" : mengeText(e.menge, e.ref?.typ === "gericht" ? "portion" : e.einheit)}`, zeit: jetzt };
    wahl = null; ansicht = "start"; suche = "";
    return true;
  }
  return false;
}
// Rückgängig (alter Weg, z. B. aus Listen): storniert, löscht nie
export function muellRueckgaengig(stand, ids) { const n = muellStornieren(stand, ids); zuletzt = null; return n; }

export function muellEingabe(feld, wert) {
  if (feld === "muell-suche") { suche = wert; return true; }
  if (feld === "muell-menge") { if (wahl) { const n = parseZahl(wert); wahl.menge = n !== null && n > 0 && n <= 100000 ? n : null; } return "knopf"; }
  return false;
}
export const muellFormGueltig = () => !!(wahl && wahl.menge > 0);
// für Tests
export const _muellZustand = () => ({ ansicht, wahl, zuletzt, auswahlOffen });
