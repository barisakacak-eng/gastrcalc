// Müll-Zentrale (Etappe 6, Punkt 1 – Baris 13.10.2026, 12:45): eine Anlaufstelle, keine Türen Gericht/Rohware/Eimer mehr.
// Cockpit (Woche in der Tonne, kleine Monatstonne, am meisten weg) → großer Knopf → „Was ist weg?" (12 Kacheln + Suche) → Blatt → „Weg damit".
// Drei Tipps vom Cockpit bis zurück. Rechenwerk unverändert (js/muell.js), Storno statt Löschen. Optik gehört Sanji.
import { t, tAlle, einheitLabel } from "../i18n.js";
import { esc, parseZahl, fmtEuro, fmtZahl, heute, wertAnzeige } from "../util.js";
import { EINHEITEN } from "../data/katalog.js";
import { normalisieren, suchRang } from "../data/suchnamen.js";
import { mengeUmrechnen, SVEV_2026 } from "../engine.js";
import { gerichtWeg, rohwareWeg, eimerEintragen, eimerVerrechnen, personalessen, mahlzeitJetzt, muellWoche, muellMonatVergleich, haeufigsteMuell, muellVorschau } from "../muell.js";
import { nav } from "./nav.js";
import { sym } from "../symbole.js";
import { FOTOS } from "../data/fotos.js";
import { gerichtBild } from "./vergleich.js";
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
const warePikto = wareBild;
// Kleines Bild auf Gericht-Kacheln (Foto der Familie oder eigenes Foto)
const thumb = (stand, id) => { const g = (stand.gerichte || []).find((x) => x.id === id); return g ? gerichtBild(g).replace('class="gerichtbild', 'class="gerichtbild mini') : ""; };
import { datumLesbar, tagGewaehlt, eintragName, eintragMenge, tagLesbar } from "./tag.js";

let ansicht = "start";   // "start" | "eingabe"
let suche = "";
let wahl = null;         // Blatt: { typ: "gericht"|"artikel"|"eimer", id?, name, menge, einheit, packung?, personal }
let zeigeTage = false;
let zuletzt = null;
let auswahlOffen = false; // Zielbild: Auswahlblatt „Lebensmittel auswählen“
let foto = null;          // Zielbild: Foto (optional) zum Eintrag: Upload-Eintrag      // { id, text } – gerade eingetragen, mit „Rückgängig"
let letzterTipp = { id: "", zeit: 0 };

export const muellKennung = () => `${ansicht}:${wahl ? wahl.typ + wahl.name : ""}`;
export function muellZuruecksetzen() { ansicht = "start"; suche = ""; wahl = null; zeigeTage = false; zuletzt = null; auswahlOffen = false; foto = null; }
export function muellEingabeOeffnen() { ansicht = "eingabe"; suche = ""; wahl = null; auswahlOffen = false; foto = null; }
export function muellFotoSetzen(eintrag) { foto = eintrag; }
export function muellZurueck() { if (auswahlOffen) { auswahlOffen = false; return true; } if (ansicht !== "start") { ansicht = "start"; return true; } return false; }
export const muellAnsicht = () => ansicht;

const dreisprachig = (key) => { const a = t(key); return [...new Set(Object.values(tAlle(key)).filter((x) => x && x !== a))].join(" · "); };
const letzteTage = (n) => { const out = []; for (let i = 0; i < n; i++) { const d = new Date(); d.setDate(d.getDate() - i); out.push(heute(d)); } return out; };
const kurzTag = (iso) => t("kuehl.tage." + new Date(iso + "T12:00:00").getDay());

export function muellView(stand) {
  const D = tagGewaehlt(); const nach = D !== heute();
  const unter = [stand.betrieb.name, tagLesbar(D)].filter(Boolean).join(" · ");
  const kopf = (titel) => `<div class="kopfband"><h1>${esc(titel)}</h1><div class="unter">${esc(unter)}${nach ? ` · ${esc(t("kuehl.nacherfasst"))}` : ""}</div></div>`;
  if (ansicht === "eingabe") return kopf(t("muell.eintragen")) + formView(stand, D) + (auswahlOffen ? `<div class="blatthinten" data-a="muell-auswahl-zu"></div><div class="blatt auswahlblatt" role="dialog">${eingabeView(stand, D)}</div>` : "") + nav("muell", { schnell: false });
  return kopf(t("menue.muell")) + cockpitView(stand, D, nach) + nav("muell", { schnell: false });
}

function cockpitView(stand, D, nach) {
  const w = muellWoche(stand, D); const mv = muellMonatVergleich(stand, D);
  const leer = !w.anzahl;
  const fuell = mv.vormonat ? Math.min(1, mv.monat / Math.max(mv.monat, mv.vormonat * 1.25)) : (mv.monat > 0 ? 0.5 : 0);
  const linie = mv.vormonat ? Math.min(1, mv.vormonat / Math.max(mv.monat, mv.vormonat * 1.25)) : null;
  const vormonatName = new Date(Number(D.slice(0, 4)), Number(D.slice(5, 7)) - 2, 1).toLocaleDateString(undefined, { month: "long" });
  return `<div class="inhalt muellzentrale">
    ${nach ? `<div class="tipp">${esc(t("tag.nacherfassenHinweis"))}</div>` : ""}
    <div class="karte muellkarte">
      <small class="lbl">${esc(t("muell.wocheTonne"))}</small>
      <div class="muellkopf"><span class="riesig">${fmtEuro(w.summe, { dezimal: w.summe < 100 ? 2 : 0 })}</span>
        <div class="monatstonne" aria-label="${esc(t("muell.monatTonne"))}"><i class="fuellung" style="height:${Math.round(fuell * 100)}%"></i>${linie !== null ? `<i class="vormonat" style="bottom:${Math.round(linie * 100)}%"></i>` : ""}</div></div>
      <small>${leer ? esc(t("muell.leerWoche")) : esc(t("muell.wocheZeile", w.portionen !== null ? fmtZahl(w.portionen, w.portionen < 10 ? 1 : 0) : "–", fmtZahl(w.kg, 1)))}${w.ohneWert ? ` · ${esc(t("listen.ohneWert", w.ohneWert))}` : ""}</small>
      ${mv.vormonat !== null ? `<small class="${mv.monat <= mv.vormonat ? "besser" : "schlechter"}">${esc(t(mv.monat <= mv.vormonat ? "muell.wenigerAls" : "muell.mehrAls", vormonatName, mv.tag))}</small>` : ""}
      <div class="balken muell">${w.tage.map((x) => `<i class="${x.datum === D ? "heute" : ""}"><b style="height:${w.max > 0 ? Math.round(x.wert / w.max * 100) : 0}%"></b></i>`).join("")}</div>
      <div class="tage">${w.tage.map((x) => `<span>${esc(kurzTag(x.datum))}</span>`).join("")}</div>
    </div>
    ${zuletzt ? `<div class="zuletzt"><span>${esc(zuletzt.text)}</span><button type="button" class="leise" data-a="muell-rueckgaengig" data-id="${esc(zuletzt.id)}">${esc(t("muell.rueckgaengig"))}</button></div>` : ""}
    ${w.top.length ? `<div class="karte"><h2>${esc(t("muell.ammeisten"))}</h2>${w.top.map((x, i) => `<div class="zeile topzeile g-${esc(x.art === "gericht" || x.ref?.typ === "gericht" ? "speise" : x.art)}"><div class="oben"><div class="name"><span class="rang">${i + 1}</span> ${esc(x.art === "eimer" ? t("muell.eimer") : x.ref?.name || "")}<small>${esc(x.art === "eimer" ? `${fmtZahl(x.menge, 1)} kg` : `${fmtZahl(x.menge, 1)} ${einheitLabel(x.einheit)}`)}</small></div><b>${x.wert > 0 ? fmtEuro(x.wert, { dezimal: 2 }) : `<span class="marke offen">${esc(t("tag.keinPreis"))}</span>`}</b></div></div>`).join("")}</div>` : ""}
    <button type="button" class="knopf glut gross muellknopf" data-a="muell-eingabe">${sym("trash-2", "gross")}<b>${esc(t("muell.eintragen"))}</b><small>${esc(dreisprachig("muell.eintragen"))}</small></button>
    <div class="unterlinks">
      <button type="button" class="leise" data-a="nav" data-wert="listen">${esc(t("listen.titel"))}</button>
      ${nach || zeigeTage ? "" : `<button type="button" class="leise" data-a="muell-nachtragen">${esc(t("muell.andererTag"))}</button>`}
    </div>
    ${nach || zeigeTage ? `<div class="chips">${letzteTage(7).map((d, i) => `<button type="button" class="chip klein ${D === d ? "an" : ""}" data-a="tag-datum" data-wert="${d}">${esc(i === 0 ? t("tag.titel") : i === 1 ? t("tag.gestern") : datumLesbar(d).slice(0, 5))}</button>`).join("")}</div>` : ""}
  </div>`;
}

function eingabeView(stand, D) {
  const q = normalisieren(suche);
  const kacheln = q
    ? [...(stand.gerichte || []).filter((g) => g.klasse !== "getraenk").map((g) => ({ typ: "gericht", id: g.id, name: g.name, einheit: "portion", gruppe: "speise" })),
       ...(stand.artikel || []).filter((a) => a.benutzt !== false).map((a) => ({ typ: "artikel", name: a.name, einheit: a.packung?.einheit || a.einheit || "stk", gruppe: a.gruppe }))]
        // auch „domates“, „sogan“, „tomato“ finden (Suchnamen); Treffer im deutschen Namen zuerst
        .filter((x) => suchRang(x.name, q) >= 0).sort((a, b) => suchRang(a.name, q) - suchRang(b.name, q)).slice(0, 24)
    : haeufigsteMuell(stand, { datum: D });
  return `<div class="inhalt">
    <h2>${esc(t("muell.auswaehlen"))}</h2><p class="hinweis">${esc(dreisprachig("muell.wasWeg"))}</p>
    <input class="textfeld" data-f="muell-suche" value="${esc(suche)}" placeholder="${esc(t("muell.suchen"))} · ${esc(dreisprachig("muell.suchen"))}" autocomplete="off">
    <div class="zweier muellkacheln">
      ${kacheln.map((x) => `<button type="button" class="kachel klein g-${esc(x.gruppe || "speise")}" data-a="muell-kachel" data-typ="${x.typ}" data-id="${esc(x.id || "")}" data-name="${esc(x.name)}">${x.typ === "gericht" ? thumb(stand, x.id) : warePikto(x)}<b>${esc(x.name)}</b><small>${esc(x.typ === "gericht" ? t("muell.teller") : einheitLabel(x.einheit === "g" ? "kg" : x.einheit))}</small></button>`).join("")}
      <button type="button" class="kachel klein eimerkachel" data-a="muell-kachel" data-typ="eimer" data-name="">${FOTOS.has("m-eimer-foto") ? `<img class="gerichtbild mini" src="foto/m-eimer-foto.webp" alt="">` : `<img class="gerichtbild mini pikto" src="bilder/m-eimer.svg" alt="">`}<b>${esc(t("muell.eimer"))}</b><small>${esc(t("muell.eimerNurGewicht"))}</small></button>
    </div>
    ${!kacheln.length && !q ? `<div class="karte leer"><div>${esc(t("muell.keineGerichte"))}</div><button type="button" class="knopf zweit" data-a="nav" data-wert="kartefoto">${esc(t("foto.karteKnopf"))}</button></div>` : ""}
  </div>`;
}

// Zielbild (15.10.): Müll eintragen auf einer Seite – Lebensmittel auswählen · Menge · Foto (optional) · ein Knopf
function formView(stand, D) {
  const w = wahl; const einheit = !w ? "" : w.typ === "gericht" ? "portion" : w.typ === "eimer" ? "kg" : w.einheit;
  const basis = w ? EINHEITEN[w.einheit]?.basis : null;
  const ganze = w?.typ === "artikel" && w.packung?.menge > 0 ? mengeUmrechnen(w.packung.menge, w.packung.einheit, w.einheit) : null;
  const wert = !w ? null : w.typ === "eimer" ? (w.menge > 0 ? eimerVerrechnen(stand, D, w.menge).wert : null) : muellVorschau(stand, w, D);
  const personalWert = w?.typ === "gericht" && w.personal ? (w.menge || 0) * (SVEV_2026[mahlzeitJetzt()] ?? SVEV_2026.mittag) : null;
  return `<div class="inhalt muellform">
    <p class="hinweis">${esc(dreisprachig("muell.eintragen"))}</p>
    <p class="muellsatz">${esc(t("muell.satz"))}</p>
    <button type="button" class="karte auswahlkarte ${w ? "gewaehlt" : ""}" data-a="muell-auswahl">
      <span class="auswahlsym">${sym(w?.typ === "eimer" ? "scale" : "trash-2", "gross")}</span>
      <span><b>${esc(w ? (w.typ === "eimer" ? t("muell.eimer") : w.name) : t("muell.auswaehlen"))}</b><small>${esc(w ? t("muell.aendern") : dreisprachig("muell.auswaehlen"))}</small></span>${sym("chevron-right")}</button>
    <div class="zweier formkacheln">
      <div class="karte formkachel ${w ? "" : "aus"}"><span class="kachelsym">${sym("scale")}</span><b>${esc(t("muell.mengeEingeben"))}</b><small>${esc(dreisprachig("muell.mengeEingeben"))}</small>
        ${w ? `<div class="stepper"><button type="button" data-a="muell-d" data-d="-1" aria-label="−">−</button><div class="wert"><input inputmode="decimal" data-f="muell-menge" value="${esc(wertAnzeige(w.menge))}" aria-label="${esc(t("tag.wieViel"))}"> <small>${esc(w.typ === "gericht" ? t("muell.teller") : einheitLabel(einheit))}</small></div><button type="button" data-a="muell-d" data-d="1" aria-label="+">+</button></div>` : ""}</div>
      <label class="karte formkachel fotokachel-muell ${foto ? "an" : ""}"><span class="kachelsym">${sym(foto ? "check" : "camera")}</span><b>${esc(foto ? t("muell.fotoDabei") : t("muell.foto"))}</b><small>${esc(dreisprachig("muell.foto"))}</small>
        <input type="file" accept="image/*" capture="environment" data-f="muell-foto" class="versteckt"></label>
    </div>
    ${w ? `<div class="chips">${chipsFuer(w).map((c) => `<button type="button" class="chip ${w.menge === c ? "an" : ""}" data-a="muell-chip" data-wert="${c}">${esc(fmtZahl(c, c < 1 ? 1 : 0))} ${esc(w.typ === "gericht" ? "" : einheitLabel(einheit))}</button>`).join("")}${ganze ? `<button type="button" class="chip" data-a="muell-chip" data-wert="${ganze}">${esc(t("muell.ganzePackung"))}</button>` : ""}</div>
      ${w.typ === "artikel" && (basis === "g" || basis === "ml") ? `<div class="periode">${(basis === "g" ? ["g", "kg"] : ["ml", "l"]).map((e) => `<button type="button" class="${w.einheit === e ? "an" : ""}" data-a="muell-einheit" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div>` : ""}
      <p class="muellwert">${w.menge > 0 ? (personalWert !== null ? esc(t("muell.personalWert", fmtEuro(personalWert, { dezimal: 2 }))) : wert !== null ? esc(t("muell.inDerTonne", fmtEuro(wert, { dezimal: 2 }))) : `<span class="leise-text">${esc(t("muell.ohnePreisKurz"))}</span>`) : ""}</p>
      ${w.typ === "gericht" ? `<button type="button" class="knebelschalter ${w.personal ? "an" : ""}" role="switch" aria-checked="${w.personal}" data-a="muell-personal"><span class="knebel" aria-hidden="true"></span> ${esc(t("muell.fuerPersonal"))}</button>` : ""}
      ${w.typ === "eimer" ? `<p class="hinweis">${esc(t("muell.eimerHinweisKurz"))}</p>` : ""}` : ""}
    <button type="button" class="knopf muellhaupt" data-a="muell-weg-damit" ${w && w.menge > 0 ? "" : "disabled"}>${sym("check")} <b>${esc(t("muell.eintragen"))}</b> <small>${esc(dreisprachig("muell.eintragen"))}</small></button>
    <p class="hinweis geschaetzt-hinweis">≈ ${esc(t("muell.orientierung"))}</p>
    <button type="button" class="leise" data-a="muell-start">‹ ${esc(t("muell.zurUebersicht"))}</button>
  </div>`;
}

const chipsFuer = (w) => (w.typ === "gericht" ? [1, 2, 5] : w.typ === "eimer" ? [1, 2, 5, 10] : w.einheit === "kg" || w.einheit === "l" ? [0.5, 1, 2] : w.einheit === "g" || w.einheit === "ml" ? [250, 500, 1000] : [1, 2, 5]);
function blattView(stand, D) {
  const w = wahl; const einheit = w.typ === "gericht" ? "portion" : w.typ === "eimer" ? "kg" : w.einheit;
  const basis = EINHEITEN[w.einheit]?.basis;
  const ganze = w.typ === "artikel" && w.packung?.menge > 0 ? mengeUmrechnen(w.packung.menge, w.packung.einheit, w.einheit) : null;
  const wert = w.typ === "eimer" ? (w.menge > 0 ? eimerVerrechnen(stand, D, w.menge).wert : null) : muellVorschau(stand, w, D);
  const personalWert = w.typ === "gericht" && w.personal ? (w.menge || 0) * (SVEV_2026[mahlzeitJetzt()] ?? SVEV_2026.mittag) : null;
  return `<div class="blatthinten" data-a="muell-blatt-zu"></div>
  <div class="blatt" role="dialog" aria-label="${esc(w.typ === "eimer" ? t("muell.eimer") : w.name)}">
    <h2>${esc(w.typ === "eimer" ? t("muell.eimer") : w.name)}</h2>
    <div class="stepper gross"><button type="button" data-a="muell-d" data-d="-1" aria-label="−">−</button>
      <div class="wert"><input inputmode="decimal" data-f="muell-menge" value="${esc(wertAnzeige(w.menge))}" aria-label="${esc(t("tag.wieViel"))}"> ${esc(w.typ === "gericht" ? t("muell.teller") : einheitLabel(einheit))}</div>
      <button type="button" data-a="muell-d" data-d="1" aria-label="+">+</button></div>
    ${w.typ === "artikel" && (basis === "g" || basis === "ml") ? `<div class="periode">${(basis === "g" ? ["g", "kg"] : ["ml", "l"]).map((e) => `<button type="button" class="${w.einheit === e ? "an" : ""}" data-a="muell-einheit" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div>` : ""}
    <div class="chips">${chipsFuer(w).map((c) => `<button type="button" class="chip ${w.menge === c ? "an" : ""}" data-a="muell-chip" data-wert="${c}">${esc(fmtZahl(c, c < 1 ? 1 : 0))} ${esc(w.typ === "gericht" ? "" : einheitLabel(einheit))}</button>`).join("")}${ganze ? `<button type="button" class="chip" data-a="muell-chip" data-wert="${ganze}">${esc(t("muell.ganzePackung"))}</button>` : ""}</div>
    <p class="muellwert">${w.menge > 0 ? (personalWert !== null ? esc(t("muell.personalWert", fmtEuro(personalWert, { dezimal: 2 }))) : wert !== null ? esc(t("muell.inDerTonne", fmtEuro(wert, { dezimal: 2 }))) : esc(t("tag.keinPreisLang"))) : ""}</p>
    ${w.typ === "eimer" ? `<p class="hinweis">${esc(t("muell.eimerHinweisKurz"))}</p>` : ""}
    ${w.typ === "gericht" ? `<button type="button" class="knebelschalter ${w.personal ? "an" : ""}" role="switch" aria-checked="${w.personal}" data-a="muell-personal"><span class="knebel" aria-hidden="true"></span> ${esc(t("muell.fuerPersonal"))}</button>` : ""}
    <button type="button" class="knopf glut" data-a="muell-weg-damit" ${w.menge > 0 ? "" : "disabled"}>${sym("check")} <b>${esc(t("muell.wegDamit"))}</b> <small>${esc(dreisprachig("muell.wegDamit"))}</small></button>
  </div>`;
}

// ---------- Aktionen ----------
export function muellAktion(name, el, stand) {
  const D = tagGewaehlt();
  if (name === "muell-eingabe") { muellEingabeOeffnen(); return true; }
  if (name === "muell-start") { ansicht = "start"; wahl = null; return true; }
  if (name === "muell-nachtragen") { zeigeTage = true; return true; }
  if (name === "muell-blatt-zu") { wahl = null; return true; }
  if (name === "muell-auswahl") { auswahlOffen = true; suche = ""; return true; }
  if (name === "muell-auswahl-zu") { auswahlOffen = false; return true; }
  if (name === "muell-kachel") {
    const typ = el.dataset.typ;
    if (typ === "gericht") { const g = stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return false; wahl = { typ, id: g.id, name: g.name, menge: 1, einheit: "portion", personal: false }; }
    else if (typ === "artikel") { const a = stand.artikel.find((x) => x.name === el.dataset.name); if (!a) return false; const e = a.packung?.einheit === "g" ? "kg" : a.packung?.einheit === "ml" ? "l" : a.packung?.einheit || (a.einheit === "kg" ? "kg" : a.einheit) || "stk"; wahl = { typ, name: a.name, menge: null, einheit: e, packung: a.packung, personal: false }; }
    else wahl = { typ: "eimer", name: "", menge: null, einheit: "kg" };
    auswahlOffen = false;
    return true;
  }
  if (!wahl) return false;
  if (name === "muell-d") { const s = wahl.typ === "gericht" || wahl.einheit === "stk" ? 1 : wahl.einheit === "g" || wahl.einheit === "ml" ? 100 : 0.1; wahl.menge = Math.max(0, Math.round(((Number(wahl.menge) || 0) + Number(el.dataset.d) * s) * 100) / 100) || null; return true; }
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
    if (foto) for (const id of ids) { const x = stand.schwund.find((y) => y.id === id); if (x) x.foto = foto.id; } // Foto als Nachweis am Eintrag
    foto = null;
    const betrag = e.art === "personal" ? null : e.wert;
    zuletzt = { id: ids.join(","), text: `${betrag !== null && betrag !== undefined ? "+ " + fmtEuro(betrag, { dezimal: 2 }) + " " : ""}${t("muell.geradeEben")} · ${e.art === "eimer" ? t("muell.eimer") : eintragName(e, stand)} ${eintragMenge(e)}` };
    wahl = null; ansicht = "start"; suche = "";
    return true;
  }
  return false;
}
// Rückgängig: storniert, löscht nie
export function muellRueckgaengig(stand, ids) {
  let n = 0;
  for (const id of String(ids || "").split(",")) { const e = (stand.schwund || []).find((x) => x.id === id && !x.storniert); if (e) { e.storniert = true; e.storniertZeit = new Date().toISOString(); n += 1; } }
  zuletzt = null; return n;
}

export function muellEingabe(feld, wert) {
  if (feld === "muell-suche") { suche = wert; return true; }
  if (feld === "muell-menge") { if (wahl) { const n = parseZahl(wert); wahl.menge = n !== null && n > 0 && n <= 100000 ? n : null; } return "knopf"; }
  return false;
}
export const muellFormGueltig = () => !!(wahl && wahl.menge > 0);
