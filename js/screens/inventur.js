// Inventur (Punkt 3, Baris 15.10.2026): „A1 + A2 (beim Anklicken auf das Produkt)" und „A-E sehr gut mit Erklärung".
// A1 = lange Liste nach Lagerort (Hauptbildschirm), Antippen von Foto/Name öffnet A2 = eine große Karte je Ware mit ＋/− und ¼ ½ ¾,
// „Weiter" zur nächsten Ware. Nach dem Abschluss das Ergebnis A–E: jede Zahl mit „Was heißt das?" in einfachen Worten.
// Rechnen tut nur js/inventur.js; hier stehen Aufbau, Texte und data-Attribute.
import { t, einheitLabel } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute } from "../util.js";
import { PRODUKT_INDEX } from "../data/katalog.js";
import { normalisieren, suchRang } from "../data/suchnamen.js";
import { gebindeKette } from "../engine.js";
import { LAGERORTE, inventurOffen, inventurenFertig, inventurStarten, artikelFuerInventur, inventurWert, inventurVergleich, inventurVorher,
  mengeSetzen, mengeSchritt, anbruchSetzen, ganzTeil, ausblenden, einblenden, hinzufuegen, inventurAbschliessen, inventurVerwerfen, lagerortFuer } from "../inventur.js";
import { wareBild } from "./muell.js";
import { datumLesbar, monatName } from "./tag.js";
import { nav } from "./nav.js";
import { sym } from "../symbole.js";

let modus = "auto";      // "auto" | "start" | "liste" | "karte" | "ergebnis"
let karteName = null;    // A2: welche Ware
let ergebnisId = null;   // Ergebnis: welche Inventur
let suche = "";
let zeigeAusgeblendet = false;

export const inventurKennung = () => `${modus}:${modus === "karte" ? karteName : modus === "ergebnis" ? ergebnisId : ""}`;
export function inventurZuruecksetzen() { modus = "auto"; karteName = null; ergebnisId = null; suche = ""; zeigeAusgeblendet = false; }
// Zurück-Geste: eine Ebene hoch (Karte → Liste → Übersicht). false = die Inventur verlassen.
export function inventurZurueck(stand) {
  if (modus === "karte") { modus = "liste"; return true; }
  if (modus === "start" || (modus === "auto" && !inventurOffen(stand))) return false;
  modus = "start"; return true;
}

const ORT_SYM = { kuehlhaus: "thermometer", tiefkuehler: "snowflake", trockenlager: "store", verpackung: "package", reinigung: "spray-can" };
const TEIL = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
// 1,5 → „1 ½", 0,75 → „¾", null → „–"
export function zahlText(v) {
  if (v === null || v === undefined) return "–";
  const { ganz, teil } = ganzTeil(v);
  if (!teil) return String(ganz);
  return ganz ? `${ganz} ${TEIL[teil]}` : TEIL[teil];
}
const gebindeName = (z) => t("gebinde.arten." + (z.gebinde || "packung"));
function gebindeZeile(z) {
  const a = z.artikel; const art = gebindeName(z);
  if (!a || !(a.packung?.menge > 0)) return art;
  const k = gebindeKette(a); const n = (x) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(x);
  return k[1] ? t("gebinde.satz", art, k[1].anzahl, t("gebinde.arten." + k[1].art), n(k[1].inhalt), einheitLabel(k[0].einheit)) : t("gebinde.satz", art, null, null, n(k[0].inhalt), einheitLabel(k[0].einheit));
}
const bild = (z, gross = false) => { const h = wareBild({ name: z.name, gruppe: z.gruppe });
  return gross ? h.replace('class="gerichtbild mini', 'class="gerichtbild inv-foto') : h.replace('class="gerichtbild mini', 'class="gerichtbild mini inv-daumen'); };
const euro = (v) => fmtEuro(v, { dezimal: v !== null && v !== 0 && Math.abs(v) < 10 ? 2 : 0 }); // kleine Beträge mit Cent, sonst ganze Euro
const prozent = (q) => (q === null || q === undefined ? "–" : `${fmtZahl(q * 100, 1)} %`);

function wertText(z) {
  if (z.menge === null) return `<small class="inv-eur leer">${esc(t("inventur.nochNicht"))}</small>`;
  if (z.preis === null) return `<small class="inv-eur fehlt">${esc(t("inventur.preisFehlt"))}</small>`;
  return `<small class="inv-eur">= ${esc(fmtEuro(z.wert, { dezimal: 2 }))}</small>`;
}

// ---------- Ansicht ----------
export function inventurView(stand) {
  const offen = inventurOffen(stand);
  let m = modus;
  if (m === "auto") m = offen ? "liste" : "start";
  if ((m === "liste" || m === "karte") && !offen) m = "start";
  if (m === "ergebnis" && !inventurenFertig(stand).some((i) => i.id === ergebnisId)) m = "start";
  const inhalt = m === "liste" ? listeView(stand, offen) : m === "karte" ? karteView(stand, offen) : m === "ergebnis" ? ergebnisView(stand) : startView(stand, offen);
  return inhalt + nav("inventur", { schnell: false });
}

function startView(stand, offen) {
  const fertig = inventurenFertig(stand).slice().reverse();
  let offenKarte = "";
  if (offen) {
    const w = inventurWert(stand, offen);
    offenKarte = `<div class="karte inv-offenkarte"><h2>${esc(t("inventur.offenTitel"))}</h2>
      <p>${esc(t("inventur.offenSeit", datumLesbar(offen.begonnen.slice(0, 10)), w.gezaehlt, w.anzahl))}</p>
      <button type="button" class="knopf glut" data-a="inv-liste">${esc(t("inventur.weiterzaehlen"))}</button>
      <button type="button" class="leise" data-a="inv-verwerfen">${esc(t("inventur.verwerfen"))}</button></div>`;
  }
  return `<div class="kopfband"><h1>${esc(t("inventur.titel"))}</h1><div class="unter">${esc(t("inventur.unterStart"))}</div></div>
    <div class="inhalt inv-start">
      ${offenKarte || `<button type="button" class="knopf glut gross inv-startknopf" data-a="inv-start">${sym("package", "gross")}<b>${esc(t("inventur.starten"))}</b></button>`}
      <div class="tipp">${esc(t("inventur.soGehts"))}</div>
      <div class="karte"><h2>${esc(t("inventur.letzte"))}</h2>
        ${fertig.length ? fertig.map((i) => `<button type="button" class="zeileknopf inv-verlauf" data-a="inv-ergebnis" data-id="${esc(i.id)}"><span><b>${esc(datumLesbar(i.datum))}</b><small>${esc(t("inventur.ansehen"))}</small></span><span class="inv-verlaufwert">${esc(euro(inventurWert(stand, i).summe))}</span><span class="pfeil">›</span></button>`).join("")
          : `<p class="hinweis">${esc(t("inventur.keine"))}</p>`}
      </div>
    </div>`;
}

function listeView(stand, inv) {
  const { liste, ausgeblendet } = artikelFuerInventur(stand, inv);
  const w = inventurWert(stand, inv);
  const titel = t("inventur.titelMonat", monatName(inv.begonnen.slice(0, 10)));
  const fortschritt = w.anzahl ? Math.round(w.gezaehlt / w.anzahl * 100) : 0;
  const gruppen = LAGERORTE.map((o) => ({ o, zeilen: liste.filter((z) => z.lagerort === o) })).filter((g) => g.zeilen.length);
  const posten = (z) => {
    const { teil } = ganzTeil(z.menge);
    return `<div class="inv-posten ${z.menge === null ? "offen" : ""}" data-name="${esc(z.name)}">
      <div class="inv-oben">
        <button type="button" class="inv-auf" data-a="inv-karte" data-name="${esc(z.name)}" aria-label="${esc(t("inventur.gross", z.name))}">${bild(z)}<span class="inv-text"><b>${esc(z.name)}</b><small>${esc(gebindeZeile(z))}</small>${wertText(z)}</span></button>
        <div class="inv-mini"><button type="button" data-a="inv-d" data-name="${esc(z.name)}" data-d="-1" aria-label="${esc(t("inventur.weniger"))}">−</button><span class="wert">${esc(zahlText(z.menge))}</span><button type="button" class="plus" data-a="inv-d" data-name="${esc(z.name)}" data-d="1" aria-label="${esc(t("inventur.mehr"))}">+</button></div>
      </div>
      <div class="inv-anbruch"><span>${esc(t("inventur.angebrochen"))}</span>${[0.25, 0.5, 0.75].map((x) => `<button type="button" class="${z.menge !== null && Math.abs(teil - x) < 0.01 ? "an" : ""}" data-a="inv-t" data-name="${esc(z.name)}" data-t="${x}" aria-pressed="${z.menge !== null && Math.abs(teil - x) < 0.01}">${TEIL[x]}</button>`).join("")}</div>
    </div>`;
  };
  return `<div class="kopfband inv-kopf"><div><h1>${esc(titel)}</h1><div class="unter">${esc([stand.betrieb.name, datumLesbar(inv.begonnen.slice(0, 10))].filter(Boolean).join(" · "))}</div></div>
      <button type="button" class="knopf zweit inv-pause" data-a="inv-pause">${esc(t("inventur.pause"))}</button></div>
    <div class="inhalt inv-listeseite">
      <div class="karte inv-zusammen"><div><b>${esc(t("inventur.gezaehlt", w.gezaehlt, w.anzahl))}</b><div class="inv-balken"><i style="width:${fortschritt}%"></i></div></div>
        <div class="inv-summe"><small>${esc(t("inventur.wareBisher"))}</small><b>${esc(euro(w.summe))}</b></div></div>
      ${!liste.length ? `<div class="karte leer">${esc(t("inventur.leer"))}</div>` : ""}
      ${gruppen.map((g) => { const s = g.zeilen.reduce((x, z) => x + (z.wert || 0), 0);
        return `<section class="inv-gruppe"><h2 class="inv-gruppenkopf ort-${g.o}"><span class="inv-gsym">${sym(ORT_SYM[g.o])}</span><span>${esc(t("inventur.lagerorte." + g.o))}</span><small>${esc(t("inventur.waren", g.zeilen.length))} · ${esc(euro(s))}</small></h2>
          <div class="inv-liste">${g.zeilen.map(posten).join("")}</div></section>`; }).join("")}
      <div class="karte inv-dazu"><h2>${esc(t("inventur.dazu"))}</h2>
        <input class="textfeld" data-f="inv-suche" value="${esc(suche)}" placeholder="${esc(t("inventur.dazuSuche"))}" autocomplete="off" enterkeyhint="search">
        ${sucheTreffer(stand, liste)}
        ${ausgeblendet.length ? `<button type="button" class="leise" data-a="inv-ausgeblendet">${esc(zeigeAusgeblendet ? t("inventur.ausgeblendetZu") : t("inventur.ausgeblendetZeigen", ausgeblendet.length))}</button>
          ${zeigeAusgeblendet ? ausgeblendet.map((z) => `<div class="inv-weg"><span>${esc(z.name)}</span><button type="button" class="chip klein" data-a="inv-einblenden" data-name="${esc(z.name)}">${esc(t("inventur.einblenden"))}</button></div>`).join("") : ""}` : ""}
      </div>
      <button type="button" class="leise inv-verwerfen" data-a="inv-verwerfen">${esc(t("inventur.verwerfen"))}</button>
      <div class="inv-fuss"><small>${esc(t("inventur.gezaehlt", w.gezaehlt, w.anzahl))} · ${esc(euro(w.summe))}</small>
        <button type="button" class="knopf" data-a="inv-fertig" ${w.gezaehlt ? "" : "disabled"}>${esc(t("inventur.fertig"))}</button></div>
    </div>`;
}

function sucheTreffer(stand, liste) {
  const q = normalisieren(suche); if (!q) return "";
  const da = new Set(liste.map((z) => z.name));
  const namen = [...new Set([...(stand.artikel || []).filter((a) => a.herkunft !== "selbst").map((a) => a.name), ...Object.keys(PRODUKT_INDEX)])].filter((n) => !da.has(n));
  const treffer = namen.filter((n) => suchRang(n, q) >= 0).sort((a, b) => suchRang(a, q) - suchRang(b, q) || a.localeCompare(b, "de")).slice(0, 8);
  if (!treffer.length) return `<p class="hinweis">${esc(t("inventur.nichtsGefunden"))}</p>`;
  return `<div class="inv-treffer">${treffer.map((n) => `<button type="button" class="zeileknopf" data-a="inv-dazu" data-name="${esc(n)}"><span><b>${esc(n)}</b><small>${esc(t("inventur.lagerorte." + lagerortVon(stand, n)))}</small></span><span class="pfeil">${sym("plus")}</span></button>`).join("")}</div>`;
}
const lagerortVon = (stand, n) => { const a = (stand.artikel || []).find((x) => x.name === n); return lagerortFuer(a || { name: n, gruppe: PRODUKT_INDEX[n]?.g }); };

function karteView(stand, inv) {
  const { liste } = artikelFuerInventur(stand, inv);
  const i = liste.findIndex((z) => z.name === karteName);
  if (i < 0) { modus = "liste"; return listeView(stand, inv); }
  const z = liste[i]; const gruppe = liste.filter((x) => x.lagerort === z.lagerort); const k = gruppe.indexOf(z) + 1;
  const { ganz, teil } = ganzTeil(z.menge); const w = inventurWert(stand, inv);
  return `<div class="kopfband inv-kopf"><div><h1>${esc(t("inventur.titelMonat", monatName(inv.begonnen.slice(0, 10))))}</h1></div>
      <button type="button" class="knopf zweit inv-pause" data-a="inv-liste">${esc(t("inventur.zurListe"))}</button></div>
    <div class="inhalt inv-karteseite">
      <div class="inv-balken gross" aria-hidden="true"><i style="width:${w.anzahl ? Math.round(w.gezaehlt / w.anzahl * 100) : 0}%"></i></div>
      <div class="inv-ort"><span><b>${esc(t("inventur.vonIn", t("inventur.lagerorte." + z.lagerort), k, gruppe.length))}</b></span><span>${esc(t("inventur.gesamt", i + 1, liste.length))}</span></div>
      <div class="inv-karte">
        ${bild(z, true)}
        <div class="inv-koerper">
          <h2>${esc(z.name)}</h2>
          <div class="inv-einheit">${esc(t("inventur.zaehltIn"))} <b>${esc(gebindeZeile(z))}</b></div>
          ${z.letztes !== null ? `<span class="inv-letztes">${sym("clock")} ${esc(t("inventur.letztesMal", zahlText(z.letztes), gebindeName(z)))}</span>` : ""}
          <div class="inv-grosszahl"><button type="button" data-a="inv-k-d" data-d="-1" aria-label="${esc(t("inventur.weniger"))}">−</button>
            <div class="inv-mitte"><b>${esc(z.menge === null ? "–" : String(ganz))}</b><small>${esc(t("inventur.ganz", gebindeName(z)))}</small></div>
            <button type="button" class="plus" data-a="inv-k-d" data-d="1" aria-label="${esc(t("inventur.mehr"))}">+</button></div>
          <div class="inv-teilwahl" role="group" aria-label="${esc(t("inventur.angebrochen"))}">${[0, 0.25, 0.5, 0.75].map((x) => { const an = z.menge !== null && Math.abs(teil - x) < 0.01; return `<button type="button" class="${an ? "an" : ""}" aria-pressed="${an}" data-a="inv-k-t" data-t="${x}">${x === 0 ? esc(t("inventur.voll")) : "+ " + TEIL[x]}</button>`; }).join("")}</div>
          <div class="inv-teilhinweis">${esc(t("inventur.teilHinweis"))}</div>
          <div class="inv-wertzeile"><span>${esc(t("inventur.wert"))}</span>${z.preis === null ? `<b class="fehlt">${esc(t("inventur.preisFehlt"))}</b>` : `<b>${esc(fmtEuro((z.menge || 0) * z.preis, { dezimal: 2 }))}</b>`}</div>
        </div>
      </div>
      <button type="button" class="leise" data-a="inv-ausblenden">${esc(t("inventur.ausblenden"))}</button>
      <div class="inv-fuss reihe"><button type="button" class="knopf zweit" data-a="inv-spaeter">${esc(t("inventur.spaeter"))}</button><button type="button" class="knopf" data-a="inv-weiter">${esc(t("inventur.weiter"))}</button></div>
    </div>`;
}

// ---------- Ergebnis A–E ----------
function ergebnisView(stand) {
  const inv = inventurenFertig(stand).find((i) => i.id === ergebnisId);
  const w = inventurWert(stand, inv); const vorher = inventurVorher(stand, inv); const v = inventurVergleich(stand, inv, vorher);
  const wv = vorher ? inventurWert(stand, vorher) : null;
  const was = (text) => `<p class="inv-was"><b>${esc(t("inventur.wasHeisst"))}</b> ${esc(text)}</p>`;
  const diff = wv ? w.summe - wv.summe : null;
  const kopf = `<div class="kopfband"><h1>${esc(t("inventur.fertigTitel"))}</h1><div class="unter">${esc([stand.betrieb.name, datumLesbar(inv.datum)].filter(Boolean).join(" · "))}</div></div>`;
  const ware = `<div class="karte inv-zaehler"><small class="lbl">${esc(t("inventur.wareImLaden"))}</small><span class="riesig">${esc(euro(w.summe))}</span>
      <small>${esc(t("inventur.gezaehltZeile", w.gezaehlt))}${wv ? ` · ${esc(t("inventur.vorherZeile", datumLesbar(vorher.datum), euro(wv.summe)))} <span class="inv-delta ${diff < 0 ? "minus" : ""}">(${diff >= 0 ? "+" : "−"} ${esc(euro(Math.abs(diff)))})</span>` : ""}</small></div>
    ${was(t("inventur.wareText"))}`;
  const orte = `<div class="karte"><h2>${esc(t("inventur.jeOrt"))}</h2>${LAGERORTE.filter((o) => w.jeLagerort[o].anzahl).map((o) => `<div class="summenzeile"><span>${esc(t("inventur.lagerorte." + o))}</span><span class="wert">${esc(euro(w.jeLagerort[o].summe))}</span></div>`).join("")}</div>`;
  const luecken = [
    w.ohnePreis.length ? `<div class="karte hinweisgelb"><p>${esc(t("inventur.ohnePreis", w.ohnePreis.length, w.ohnePreis.slice(0, 6).join(", ") + (w.ohnePreis.length > 6 ? " …" : "")))}</p><button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="preise">${esc(t("inventur.preiseEintragen"))}</button></div>` : "",
    w.offen ? `<p class="hinweis">${esc(t("inventur.nichtGezaehlt", w.offen))}</p>` : "",
  ].join("");
  const fuss = `<button type="button" class="knopf glut" data-a="nav" data-wert="vergleich">${esc(t("inventur.gerichteKnopf"))}</button>
      <button type="button" class="leise" data-a="inv-uebersicht">${esc(t("inventur.zurUebersicht"))}</button>`;
  if (!v) {
    return `${kopf}<div class="inhalt inv-ergebnis">${ware}
      <div class="karte inv-erste"><h2>${esc(t("inventur.ersteTitel"))}</h2><p>${esc(t("inventur.ersteText"))}</p><div class="tipp">${esc(t("inventur.ersteTipp"))}</div></div>
      ${orte}${luecken}${fuss}</div>`;
  }
  const ca = v.unvollstaendig ? "≈ " : "";
  const zeile = (zeichen, text, wert, cls = "") => `<div class="inv-z ${cls}"><span><em>${zeichen}</em>${esc(text)}</span><b>${esc(wert)}</b></div>`;
  const rechnung = v.tage === 0 ? `<div class="karte hinweisgelb">${esc(t("inventur.gleicherTag"))}</div>` : `
    <h2 class="inv-ue">${esc(t("inventur.verbrauchUe"))}</h2>
    <div class="karte inv-rechnung">
      ${zeile("", t("inventur.anfang", datumLesbar(v.vorherDatum)), ca + euro(v.anfang))}
      ${zeile("+", t("inventur.einkauf", v.belege), euro(v.einkauf))}
      ${zeile("−", t("inventur.ende", datumLesbar(v.datum)), ca + euro(v.ende))}
      ${zeile("=", t("inventur.verbraucht", v.tage), ca + euro(v.verbrauch), "summe")}
    </div>
    ${was(t("inventur.verbrauchText"))}
    <div class="karte hinweisgelb inv-belege"><p>${esc(v.belege ? t("inventur.belegeWarnung") : t("inventur.belegeKeine"))}</p>${v.belege ? "" : `<button type="button" class="knopf zweit" data-a="nav" data-wert="beleg">${esc(t("inventur.belegeKnopf"))}</button>`}</div>
    ${v.verbrauchNegativ ? `<div class="karte hinweisrot">${esc(t("inventur.verbrauchNegativ"))}</div>` : ""}`;
  const skala = Math.max(0.4, (v.echteQuote || 0) * 1.1, (v.appQuote || 0) * 1.1);
  const balken = (q, farbe) => `<div class="inv-bahn"><i style="width:${q === null ? 0 : Math.min(100, Math.max(0, q / skala * 100))}%;background:${farbe}"></i></div>`;
  const cent = (q) => fmtZahl(q * 100, 0);
  const quote = v.tage === 0 ? "" : v.umsatzNetto > 0 ? `
    <h2 class="inv-ue">${esc(t("inventur.quoteUe"))}</h2>
    <div class="karte inv-vergleich">
      <div class="inv-vbalken"><div class="kopf"><span>${esc(v.quoteQuelle === "eigen" ? t("inventur.quoteEigen") : t("inventur.quoteApp"))}</span><b>${esc(prozent(v.appQuote))}</b></div>${balken(v.appQuote, "var(--salbei)")}</div>
      <div class="inv-vbalken"><div class="kopf"><span>${esc(t("inventur.quoteEcht"))}</span><b class="${v.appQuote !== null && v.echteQuote > v.appQuote ? "rot" : ""}">${esc(ca + prozent(v.echteQuote))}</b></div>${balken(v.echteQuote, "var(--glut)")}</div>
      <small class="inv-klein">${esc(t("inventur.umsatzZeile", euro(v.umsatzNetto), v.umsatzTage, v.tage))}</small>
    </div>
    ${was(v.appQuote !== null ? t("inventur.quoteText", cent(v.echteQuote), cent(v.appQuote)) : t("inventur.quoteTextOhneApp", cent(v.echteQuote)))}`
    : `<div class="karte hinweisgelb"><p>${esc(t("inventur.umsatzFehlt"))}</p><button type="button" class="knopf zweit" data-a="nav" data-wert="umsatz">${esc(t("inventur.umsatzKnopf"))}</button></div>`;
  let luecke = "";
  if (v.luecke !== null && v.tage > 0) {
    if (v.luecke > 0) {
      const anteil = v.luecke > 0 ? Math.min(100, v.erklaert / v.luecke * 100) : 0;
      luecke = `<div class="inv-luecke"><b class="gross">${esc(t("inventur.lueckeMehr", euro(v.luecke)))}</b>
        <div class="inv-aufteilung" aria-hidden="true"><i class="muell" style="width:${anteil}%"></i><i class="rest"></i></div>
        <div class="inv-legende"><span><i class="muell"></i>${esc(t("inventur.alsMuell", euro(v.erklaert)))}</span><span><i class="rest"></i>${esc(t("inventur.ohneErklaerung", euro(v.ohneErklaerung)))}</span></div></div>
        ${was(t("inventur.lueckeText", euro(v.sollWare)))}
        <div class="tipp">${esc(t("inventur.lueckeTun"))}</div>`;
    } else {
      luecke = `<div class="inv-luecke gut"><b class="gross">${esc(t("inventur.lueckeWeniger", euro(-v.luecke)))}</b></div>${was(t("inventur.lueckeGut"))}`;
    }
  }
  return `${kopf}<div class="inhalt inv-ergebnis">${ware}${rechnung}${quote}${luecke}
    ${v.unvollstaendig ? `<p class="hinweis geschaetzt-hinweis">${esc(t("inventur.ungefaehr"))}</p>` : ""}
    ${luecken}${orte}${fuss}</div>`;
}

// ---------- Aktionen ----------
// Rückgabe: false (nichts geändert), true (neu zeichnen, speichern), "sofort" (sofort speichern), {meldung} (mit Hinweis)
export function inventurAktion(name, el, stand, { frage = (x) => confirm(x) } = {}) {
  const offen = inventurOffen(stand);
  if (name === "inv-start") { inventurStarten(stand); modus = "liste"; suche = ""; return "sofort"; }
  if (name === "inv-liste") { if (!offen) return false; modus = "liste"; return true; }
  if (name === "inv-pause" || name === "inv-uebersicht") { modus = "start"; return "sofort"; }
  if (name === "inv-ergebnis") { ergebnisId = el.dataset.id; modus = "ergebnis"; return true; }
  if (name === "inv-verwerfen") { if (!offen || !frage(t("inventur.verwerfenFrage"))) return false; inventurVerwerfen(stand, offen); modus = "start"; return { sofort: true, meldung: t("inventur.verworfen") }; }
  if (!offen) return false;
  if (name === "inv-d") { const n = el.dataset.name; mengeSetzen(offen, n, mengeSchritt(offen.posten[n] ?? null, Number(el.dataset.d))); return true; }
  if (name === "inv-t") { const n = el.dataset.name; mengeSetzen(offen, n, anbruchSetzen(offen.posten[n] ?? null, Number(el.dataset.t))); return true; }
  if (name === "inv-karte") { karteName = el.dataset.name; modus = "karte"; return true; }
  if (name === "inv-ausgeblendet") { zeigeAusgeblendet = !zeigeAusgeblendet; return true; }
  if (name === "inv-einblenden") { einblenden(offen, el.dataset.name); return true; }
  if (name === "inv-dazu") { hinzufuegen(stand, offen, el.dataset.name); suche = ""; return { meldung: t("inventur.dazuGemacht", el.dataset.name) }; }
  if (name === "inv-fertig") {
    const w = inventurWert(stand, offen); if (!w.gezaehlt) return false;
    if (w.offen && !frage(t("inventur.nichtGezaehltFrage", w.offen))) return false;
    inventurAbschliessen(stand, offen, { datum: heute() });
    ergebnisId = offen.id; modus = "ergebnis"; return "abgeschlossen";
  }
  if (modus !== "karte" || !karteName) return false;
  const n = karteName;
  if (name === "inv-k-d") { mengeSetzen(offen, n, mengeSchritt(offen.posten[n] ?? null, Number(el.dataset.d))); return true; }
  if (name === "inv-k-t") { mengeSetzen(offen, n, anbruchSetzen(offen.posten[n] ?? null, Number(el.dataset.t))); return true; }
  if (name === "inv-ausblenden") { const naechste = naechsteWare(stand, offen, n); ausblenden(offen, n); weiterZu(naechste); return { meldung: t("inventur.ausgeblendetMeldung", n) }; }
  if (name === "inv-weiter" || name === "inv-spaeter") {
    if (name === "inv-weiter" && (offen.posten[n] ?? null) === null) mengeSetzen(offen, n, 0); // „Weiter" bestätigt die angezeigte Zahl
    const naechste = naechsteWare(stand, offen, n); weiterZu(naechste);
    return naechste ? true : { meldung: t("inventur.geschafft") };
  }
  return false;
}
function naechsteWare(stand, inv, name) { const { liste } = artikelFuerInventur(stand, inv); const i = liste.findIndex((z) => z.name === name); return i >= 0 && i + 1 < liste.length ? liste[i + 1].name : null; }
function weiterZu(name) { if (name) karteName = name; else { karteName = null; modus = "liste"; } }

export function inventurEingabe(feld, wert) {
  if (feld === "inv-suche") { suche = String(wert || "").slice(0, 40); return true; }
  return false;
}
