// Büro – die drei Ordner zum Abgeben (Drei Ebenen, 15.10.2026, Vorschau-Rahmen „Ordner Gesundheitsamt“):
// "ordner-amt" (Gesundheitsamt: Kühlprotokoll, Putznachweis, Belehrungen, Eigenkontroll-Konzept), "ordner-steuer" (Steuerberater),
// "ordner-buch" (Buchhalter). Je Ordner: Zeitraum, Stand mit Ring, Inhaltsliste mit Haken/Lücke, „Als PDF teilen“, Vorschau, CSV.
// Daten kommen rein rechnend aus js/export_amt.js und js/export_steuer.js; hier stehen nur Texte, Aufbau und Teilen/Drucken.
import { t, sprache } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, uid } from "../util.js";
import { ordnerAmt, amtCsv, druckHtml, zeitraumFuer, belehrungEintragen, AMT_TEILE } from "../export_amt.js";
import { monatsPaket, teilCsv, monatVon, monatPlus, datumDe } from "../export_steuer.js";
import { monatName } from "./tag.js";
import { bsym, ring, bueroKopf } from "./buero.js";

// ---------- Zustand ----------
let amtZeit = { art: "monat", von: null, bis: null };
let paketMonat = { steuer: null, buch: null };  // "JJJJ-MM"; null = Vormonat
let belehrungAuf = false;
const belDatum = {};          // personId → gewähltes Datum (Feld), Standard heute
let personNeu = "";
let vorschauHtml = null;      // offene Vorschau (fertiges Dokument)
export function ordnerZuruecksetzen() { belehrungAuf = false; vorschauHtml = null; personNeu = ""; }
export const ordnerVorschauOffen = () => !!vorschauHtml;

const monatLang = (iso) => `${monatName(iso)} ${iso.slice(0, 4)}`;
const datum = (iso) => (iso ? datumDe(iso) : "–");
const euro = (n) => fmtEuro(n, { dezimal: 2 });
const grad = (n) => (typeof n === "number" ? `${fmtZahl(n, 1)} °C` : "–");
const aufgabeText = (a) => (a?.text ? a.text[sprache()] || a.text.de : a?.aufgabe || "?");
const monatKurz = (iso) => new Date(iso + "T12:00:00").toLocaleDateString(sprache() === "de" ? "de-DE" : sprache() === "tr" ? "tr-TR" : sprache() === "en" ? "en-GB" : sprache(), { month: "short", year: "numeric" });

function amtZeitraum(H = heute()) { return zeitraumFuer(amtZeit.art, { datum: H, von: amtZeit.von, bis: amtZeit.bis }); }
function zeitraumText(z) {
  if (z.art === "monat") return monatLang(z.von);
  if (z.art === "quartal") return t("ordner.zeit.quartalLang", z.quartal, z.von.slice(0, 4));
  return `${datumDe(z.von)} – ${datumDe(z.bis)}`;
}
const paketZeit = (art, H = heute()) => monatVon((paketMonat[art] || monatPlus(H.slice(0, 7), -1)) + "-01");

// ---------- Kachelstand für die Büro-Startseite ----------
export function ordnerKachelStand(stand, { datum: H = heute() } = {}) {
  const a = ordnerAmt(stand, zeitraumFuer("monat", { datum: H }), { datum: H });
  const vm = monatVon(monatPlus(H.slice(0, 7), -1) + "-01");
  const s = monatsPaket(stand, vm, "steuer"); const b = monatsPaket(stand, vm, "buch");
  return {
    amt: { farbe: a.vollstaendig === a.gesamt ? "gruen" : a.vollstaendig ? "gelb" : "rot", text: t("ordner.kachelVon", a.vollstaendig, a.gesamt) },
    steuer: { farbe: s.vollstaendig === s.teile.length ? "gruen" : s.umsatz.tage ? "gelb" : "grau", text: monatName(vm.von) },
    buch: { farbe: b.umsatz.tage ? "gruen" : "grau", text: t(b.umsatz.tage ? "ordner.bereit" : "ordner.leer") },
  };
}

// ---------- Zeilen der Inhaltsliste ----------
const statusSym = (ok) => ok ? `<span class="b-status ok" title="${esc(t("ordner.status.ok"))}">${bsym("check")}</span>` : `<span class="b-status luecke" title="${esc(t("ordner.status.luecke"))}">!</span>`;
const inhaltZeile = (symbol, titel, unter, ok, { aktion = "", teil = "", csv = false, auf = null } = {}) => {
  const innen = `<span class="b-zs">${bsym(symbol)}</span><span class="b-zt"><b>${esc(titel)}</b><small class="zahl">${esc(unter)}</small></span>`;
  const rechts = `${csv ? `<button type="button" class="b-mini" data-a="ordner-csv" data-teil="${esc(teil)}" aria-label="${esc(t("ordner.knopf.csvTeil", titel))}">CSV</button>` : ""}${statusSym(ok)}`;
  return aktion ? `<div class="b-zeile-wrap"><button type="button" class="b-zeile" data-a="${aktion}" aria-expanded="${auf}">${innen}${rechts}</button></div>` : `<div class="b-zeile">${innen}${rechts}</div>`;
};

function amtUnter(teil, x) {
  if (teil === "kuehl") return !x.stellen ? t("ordner.zeile.kuehlKeine") : x.offen ? t("ordner.zeile.kuehlOffen", x.offen) : x.luecken.length ? t("ordner.zeile.kuehlLuecken", x.anzahl, x.luecken.length) : t("ordner.zeile.kuehl", x.anzahl, x.behoben);
  if (teil === "putz") return !x.aktiv ? t("ordner.zeile.putzAus") : t("ordner.zeile.putz", x.tage, x.tageGesamt);
  if (teil === "belehrung") {
    if (!x.zeilen.length) return t("ordner.zeile.belehrungKeine");
    const n = x.naechste; if (!n) return t("ordner.zeile.belehrungOk", x.zeilen.length);
    return n.status === "fehlt" ? t("ordner.zeile.belehrungFehlt", n.name) : n.status === "ueberfaellig" ? t("ordner.zeile.belehrungUeber", n.name) : t("ordner.zeile.belehrungBald", n.name, monatKurz(n.faellig));
  }
  return x.vollstaendig ? t("ordner.zeile.konzept") : t("ordner.zeile.konzeptFehlt");
}
function amtHinweis(o) {
  const b = o.teile.belehrung.zaehl;
  if (b.bald) return t("ordner.hinweis.belehrungBald", b.bald);
  if (b.ueberfaellig || b.fehlt) return t("ordner.hinweis.belehrungFehlt", b.ueberfaellig + b.fehlt);
  if (o.teile.kuehl.offen) return t("ordner.zeile.kuehlOffen", o.teile.kuehl.offen);
  if (o.teile.kuehl.luecken.length) return t("ordner.hinweis.luecken", o.teile.kuehl.luecken.length);
  return o.vollstaendig === o.gesamt ? t("ordner.hinweis.fertig") : "";
}

function belehrungBlock(stand, o) {
  const H = heute();
  const statusText = (x) => x.status === "fehlt" ? t("ordner.belehrung.ohne") : `${t("ordner.belehrung.letzte", datum(x.letzte))} · ${t("ordner.belehrung.faellig", datum(x.faellig))}`;
  return `<div class="b-belehrung">
    <p class="b-leise">${esc(t("ordner.belehrung.hinweis"))}</p>
    ${o.teile.belehrung.zeilen.map((x) => `<div class="b-person">
      <div class="b-person-kopf"><b>${esc(x.name)}</b><span class="b-pille ${x.status}">${esc(t("ordner.belehrung.status." + x.status))}</span></div>
      <small class="zahl">${esc(statusText(x))}</small>
      <div class="b-person-eingabe"><input type="date" class="textfeld" data-f="bel-datum:${esc(x.id)}" value="${esc(belDatum[x.id] || H)}" max="${H}" aria-label="${esc(t("ordner.belehrung.am", x.name))}">
        <button type="button" class="knopf zweit schmal" data-a="bel-eintragen" data-id="${esc(x.id)}" data-wert="erst">${esc(t("ordner.belehrung.erst"))}</button>
        <button type="button" class="knopf weich schmal" data-a="bel-eintragen" data-id="${esc(x.id)}" data-wert="folge">${esc(t("ordner.belehrung.folge"))}</button></div>
    </div>`).join("")}
    <div class="neu b-person-neu"><input class="textfeld" data-f="person-neu" value="${esc(personNeu)}" maxlength="12" placeholder="${esc(t("ordner.belehrung.name"))}" autocomplete="off" enterkeyhint="done"><button type="button" class="knopf weich schmal" data-a="bel-person-neu">${esc(t("allgemein.hinzufuegen"))}</button></div>
  </div>`;
}

const knoepfe = () => `<div class="b-unten">
    <button type="button" class="knopf glut b-haupt" data-a="ordner-pdf">${bsym("share")} ${esc(t("ordner.knopf.pdf"))}</button>
    <div class="b-knopfreihe"><button type="button" class="knopf zweit" data-a="ordner-vorschau">${bsym("eye")} ${esc(t("ordner.knopf.vorschau"))}</button><button type="button" class="knopf zweit" data-a="ordner-csv">${bsym("download")} ${esc(t("ordner.knopf.csv"))}</button></div>
  </div>`;

const vorschauBlatt = () => !vorschauHtml ? "" : `<div class="b-vorschau" role="dialog" aria-label="${esc(t("ordner.knopf.vorschau"))}">
    <div class="b-vorschau-leiste"><button type="button" class="knopf zweit schmal" data-a="ordner-vorschau-zu">${esc(t("ordner.knopf.schliessen"))}</button>
      <button type="button" class="knopf zweit schmal" data-a="ordner-teilen">${bsym("share")} ${esc(t("ordner.knopf.datei"))}</button>
      <button type="button" class="knopf glut schmal" data-a="ordner-pdf">${esc(t("ordner.knopf.drucken"))}</button></div>
    <iframe class="b-vorschau-dok" title="${esc(t("ordner.knopf.vorschau"))}" srcdoc="${esc(vorschauHtml)}"></iframe></div>`;

function kopfOrdner(stand, art, symbol, unter) {
  return `<div class="b-ordnerkopf"><span class="b-ks ${art}">${bsym(symbol)}</span><div><b>${esc(t(`ordner.${art}.titel`))}</b><small>${esc(stand.betrieb?.name || t("menue.deinLaden"))} · ${esc(unter)}</small></div></div>`;
}
function standKarte(von, gesamt, hinweis) {
  return `<div class="karte b-stand">${ring(gesamt ? von / gesamt * 100 : 0, { groesse: 54, dicke: 6, farbe: von === gesamt ? "var(--eigen)" : "var(--glut)", text: true })}<div><b>${esc(von === gesamt ? t("ordner.allesDa") : t("ordner.standVon", von, gesamt))}</b>${hinweis ? `<small>${esc(hinweis)}</small>` : ""}</div></div>`;
}

// ---------- Gesundheitsamt ----------
export function ordnerAmtView(stand) {
  const H = heute(); const z = amtZeitraum(H); const o = ordnerAmt(stand, z, { datum: H });
  const seg = (art, text) => `<button type="button" class="${amtZeit.art === art ? "an" : ""}" data-a="ordner-zeit" data-wert="${art}" aria-pressed="${amtZeit.art === art}">${esc(text)}</button>`;
  return `<div class="buero">${bueroKopf({ ziel: "buero", text: t("buero.titel") }, "")}
    <div class="b-inhalt b-ordnerseite">
      ${kopfOrdner(stand, "amt", "shield-check", t("ordner.amt.unter"))}
      <div class="b-segment" role="group">${seg("monat", monatName(H))}${seg("quartal", t("ordner.zeit.quartal"))}${seg("frei", t("ordner.zeit.frei"))}</div>
      ${amtZeit.art === "frei" ? `<div class="b-frei"><label><span>${esc(t("ordner.zeit.von"))}</span><input type="date" class="textfeld" data-f="amt-von" value="${esc(z.von)}" max="${H}"></label><label><span>${esc(t("ordner.zeit.bis"))}</span><input type="date" class="textfeld" data-f="amt-bis" value="${esc(z.bis)}"></label></div>` : ""}
      ${standKarte(o.vollstaendig, o.gesamt, amtHinweis(o))}
      <div class="karte b-liste">
        ${inhaltZeile("thermometer", t("ordner.teil.kuehl"), amtUnter("kuehl", o.teile.kuehl), o.teile.kuehl.vollstaendig)}
        ${inhaltZeile("spray-can", t("ordner.teil.putz"), amtUnter("putz", o.teile.putz), o.teile.putz.vollstaendig)}
        ${inhaltZeile("users", t("ordner.teil.belehrung"), amtUnter("belehrung", o.teile.belehrung), o.teile.belehrung.vollstaendig, { aktion: "ordner-belehrung", auf: belehrungAuf })}
        ${belehrungAuf ? belehrungBlock(stand, o) : ""}
        ${inhaltZeile("file-text", t("ordner.teil.konzept"), amtUnter("konzept", o.teile.konzept), o.teile.konzept.vollstaendig)}
      </div>
      ${knoepfe()}
    </div>${vorschauBlatt()}</div>`;
}

// ---------- Steuerberater und Buchhalter ----------
function paketUnter(teil, p) {
  if (teil === "umsatz") return p.umsatz.tage ? t("ordner.zeile.umsatz", p.umsatz.tage, fmtEuro(p.umsatz.summe.brutto)) : t("ordner.zeile.umsatzKeine");
  if (teil === "personal") return p.personal.zeilen.length ? t("ordner.zeile.personal", fmtZahl(p.personal.anzahl), euro(p.personal.sachbezug)) : t("ordner.zeile.keine");
  if (teil === "schwund") return p.schwund.zeilen.length ? (p.schwund.ohneWert ? t("ordner.zeile.schwundOffen", euro(p.schwund.muellwert), p.schwund.ohneWert) : t("ordner.zeile.schwund", euro(p.schwund.muellwert))) : t("ordner.zeile.keine");
  if (teil === "belege") return p.belege.anzahl ? t("ordner.zeile.belege", p.belege.anzahl, fmtEuro(p.belege.netto)) : t("ordner.zeile.belegeKeine");
  if (teil === "inventur") { const l = p.inventur.zeilen.filter((x) => !x.vorher).pop(); return l ? `${datumDe(l.datum)} · ${euro(l.wert)}` : t("ordner.zeile.inventurKeine"); }
  if (teil === "reinigung") return p.reinigung.zeilen.length ? t("ordner.zeile.reinigung", euro(p.reinigung.netto)) : t("ordner.zeile.keine");
  if (teil === "kosten") return p.kosten.zeilen.length ? t("ordner.zeile.kosten", fmtEuro(p.kosten.gesamt)) : t("ordner.zeile.kostenKeine");
  return "";
}
const TEIL_SYM = { umsatz: "trending-up", personal: "users", schwund: "trash-2", belege: "receipt", inventur: "clipboard-list", reinigung: "spray-can", kosten: "calculator" };

export function ordnerPaketView(stand, art) {
  const H = heute(); const z = paketZeit(art, H); const p = monatsPaket(stand, z, art);
  const istAktuell = z.monat >= H.slice(0, 7);
  return `<div class="buero">${bueroKopf({ ziel: "buero", text: t("buero.titel") }, "")}
    <div class="b-inhalt b-ordnerseite">
      ${kopfOrdner(stand, art, art === "steuer" ? "calculator" : "receipt", t(`ordner.${art}.unter`))}
      <div class="b-monat"><button type="button" class="b-rund" data-a="ordner-monat" data-wert="-1" aria-label="${esc(t("ordner.zeit.vor"))}">${bsym("chevron-left")}</button><b>${esc(monatLang(z.von))}</b><button type="button" class="b-rund" data-a="ordner-monat" data-wert="1" aria-label="${esc(t("ordner.zeit.nach"))}" ${istAktuell ? "disabled" : ""}>${bsym("chevron-right")}</button></div>
      ${standKarte(p.vollstaendig, p.teile.length, p.umsatz?.tage ? t("ordner.hinweis.kasse") : "")}
      <div class="karte b-liste">${p.teile.map((teil) => inhaltZeile(TEIL_SYM[teil], t("ordner.teil." + teil), paketUnter(teil, p), p.stand[teil] === "ok", { teil, csv: true })).join("")}</div>
      ${knoepfe()}
    </div>${vorschauBlatt()}</div>`;
}

// ---------- Dokumente (übersetzt) ----------
const NAMEN = () => ({
  ja: () => t("allgemein.ja"),
  grund: (g) => (g ? t("ordner.dok.nichtGemessen") : ""),
  massnahme: (m) => t("kuehl.massnahmen." + m),
  nachkontrolle: (s) => t("ordner.dok.nk." + s),
  aufgabe: (x) => aufgabeText(x),
  status: (s) => t("ordner.belehrung.status." + s),
  kuehlart: (a) => t("kuehl.arten." + a),
  art: (a) => t("tag.arten." + a),
  mahlzeit: (m) => t("tag.mahlzeiten." + m),
  stelle: (s) => { if (s === "ware") return t("ordner.dok.ware"); const v = t("kosten.posten." + s); return Array.isArray(v) ? v[0] : s; },
  posten: (s) => { const v = t("kosten.posten." + s); return Array.isArray(v) ? v[0] : s; },
  periode: (p) => t(p === "jahr" ? "allgemein.proJahr" : "allgemein.proMonat"),
  basis: (b) => t("ordner.dok.basis." + (b === "brutto" ? "brutto" : "netto")),
});
const kopfVon = (teil) => t("ordner.dok.kopf." + teil);
const erstelltText = () => t("ordner.dok.erstellt", datumDe(heute()), new Date().toTimeString().slice(0, 5));

export function amtDokument(stand, o) {
  const n = NAMEN(); const k = o.teile.kuehl, p = o.teile.putz, b = o.teile.belehrung, c = o.teile.konzept;
  return {
    titel: t("ordner.amt.titel"), laden: stand.betrieb?.name || "", zeitraum: zeitraumText(o.zeitraum), erstellt: erstelltText(), sprache: sprache(),
    abschnitte: [
      { titel: t("ordner.teil.kuehl"), info: `${amtUnter("kuehl", k)}${k.luecken.length ? ` · ${t("ordner.dok.ohneMessung", k.luecken.map(datumDe).join(", "))}` : ""}`, warn: !k.vollstaendig, kopf: t("ordner.dok.druck.kuehl"), rechts: [3, 4],
        zeilen: k.zeilen.map((x) => ({ warn: x.abweichung, zellen: [datumDe(x.datum), x.zeit, x.stelle, x.wert === null ? n.grund(x.grund || "x") : grad(x.wert), (typeof x.min === "number" && typeof x.max === "number" ? `${fmtZahl(x.min, 1)} … ${fmtZahl(x.max, 1)} °C` : typeof x.max === "number" ? `≤ ${grad(x.max)}` : typeof x.min === "number" ? `≥ ${grad(x.min)}` : "–"),
          x.abweichung ? [x.massnahmen.map(n.massnahme).join(", "), x.nachkontrolle ? n.nachkontrolle(x.nachkontrolle) : ""].filter(Boolean).join(" · ") || t("ordner.dok.keineMassnahme") : "", x.von] })), leer: t("ordner.zeile.keine") },
      { titel: t("ordner.teil.putz"), info: amtUnter("putz", p) + (p.luecken.length ? ` · ${t("ordner.dok.offeneTage", p.luecken.map(datumDe).join(", "))}` : ""), warn: !p.vollstaendig, kopf: kopfVon("putz"),
        zeilen: p.eintraege.map((x) => [datumDe(x.datum), x.zeit, aufgabeText(x), x.von]), leer: t("ordner.zeile.keine") },
      { titel: t("ordner.teil.belehrung"), info: t("ordner.belehrung.hinweis"), kopf: kopfVon("belehrung"),
        zeilen: b.zeilen.map((x) => ({ warn: x.status !== "ok", zellen: [x.name, datum(x.erst), datum(x.letzte), datum(x.faellig), n.status(x.status)] })), leer: t("ordner.zeile.belehrungKeine") },
      { titel: t("ordner.teil.konzept"), info: [c.ladenArt ? t("ordner.dok.ladenArt", t("schnell.arten." + c.ladenArt)) : "", c.geraete.length ? t("ordner.dok.geraete", c.geraete.map((g) => t("putzplan.geraete." + g)).join(", ")) : "", t("ordner.dok.takt", c.takt), c.putzplan ? t("ordner.dok.aufgaben", c.aufgaben) : t("ordner.zeile.putzAus")].filter(Boolean).join(" · "),
        kopf: kopfVon("konzept"), rechts: [2, 3], zeilen: c.kuehlstellen.map((x) => [x.name, n.kuehlart(x.art), typeof x.min === "number" ? grad(x.min) : "–", typeof x.max === "number" ? grad(x.max) : "–", x.standard ? t("ordner.dok.standardGrenze") : t("ordner.dok.eigeneGrenze")]), leer: t("ordner.zeile.kuehlKeine") },
    ],
    unterschrift: t("ordner.dok.unterschrift"), fuss: t("ordner.dok.fussAmt"),
  };
}

export function paketDokument(stand, p) {
  const n = NAMEN(); const a = [];
  const art = p.art;
  if (p.umsatz) a.push({ titel: t("ordner.teil.umsatz"), info: t("ordner.dok.satz", fmtZahl(p.umsatz.satz * 100, 1)) + " · " + t("ordner.hinweis.kasse"), kopf: kopfVon("umsatz").slice(0, 4), rechts: [1, 2, 3],
    zeilen: p.umsatz.zeilen.map((x) => [datumDe(x.datum) + (x.nacherfasst ? " *" : ""), euro(x.brutto), euro(x.netto), euro(x.steuer)]), summe: p.umsatz.tage ? [t("ordner.dok.summe"), euro(p.umsatz.summe.brutto), euro(p.umsatz.summe.netto), euro(p.umsatz.summe.steuer)] : null, leer: t("ordner.zeile.umsatzKeine") });
  if (p.personal) a.push({ titel: t("ordner.teil.personal"), info: t("ordner.dok.svev"), kopf: kopfVon("personal").slice(0, 7), rechts: [4, 5, 6],
    zeilen: p.personal.zeilen.map((x) => [datumDe(x.datum), x.person || "–", x.gericht, n.mahlzeit(x.mahlzeit), fmtZahl(x.menge), euro(x.je), euro(x.sachbezug)]), summe: p.personal.zeilen.length ? [t("ordner.dok.summe"), "", "", "", fmtZahl(p.personal.anzahl), "", euro(p.personal.sachbezug)] : null, leer: t("ordner.zeile.keine") });
  if (p.schwund) a.push({ titel: t("ordner.teil.schwund"), info: t("ordner.dok.netto"), warn: !!p.schwund.ohneWert, kopf: t("ordner.dok.druck.schwund"), rechts: [3, 4],
    zeilen: p.schwund.zeilen.map((x) => [datumDe(x.datum), n.art(x.art), x.name || "–", `${fmtZahl(x.menge, x.einheit === "stk" || x.einheit === "portion" ? 0 : 2)} ${x.einheit === "portion" ? t("tag.portionen") : x.einheit === "stk" ? t("allgemein.stueck") : x.einheit}`, x.wert === null ? t("tag.keinPreis") : euro(x.wert)]),
    summe: p.schwund.zeilen.length ? [t("ordner.dok.summe"), "", "", "", euro(p.schwund.muellwert + (p.schwund.eigen?.waren || 0))] : null, leer: t("ordner.zeile.keine") });
  if (p.belege) a.push({ titel: t("ordner.teil.belege"), kopf: kopfVon("belege").slice(0, 5), rechts: [3, 4],
    zeilen: p.belege.zeilen.map((x) => [datumDe(x.datum), x.lieferant || "–", n.stelle(x.stelle), euro(x.netto), x.brutto === null ? "–" : euro(x.brutto)]), summe: p.belege.anzahl ? [t("ordner.dok.summe"), "", "", euro(p.belege.netto), euro(p.belege.brutto)] : null, leer: t("ordner.zeile.belegeKeine") });
  if (p.inventur) a.push({ titel: t("ordner.teil.inventur"), kopf: kopfVon("inventur"), rechts: [1, 2, 3],
    zeilen: p.inventur.zeilen.map((x) => [datumDe(x.datum) + (x.vorher ? ` (${t("ordner.dok.vormonat")})` : ""), euro(x.wert), fmtZahl(x.gezaehlt), fmtZahl(x.ohnePreis)]), leer: t("ordner.zeile.inventurKeine") });
  if (p.reinigung) a.push({ titel: t("ordner.teil.reinigung"), kopf: kopfVon("reinigung"), rechts: [3],
    zeilen: p.reinigung.zeilen.map((x) => [datumDe(x.datum), x.lieferant || "–", x.artikel, euro(x.netto)]), summe: p.reinigung.zeilen.length ? [t("ordner.dok.summe"), "", "", euro(p.reinigung.netto)] : null, leer: t("ordner.zeile.keine") });
  if (p.kosten) a.push({ titel: t("ordner.teil.kosten"), kopf: kopfVon("kosten"), rechts: [1],
    zeilen: p.kosten.zeilen.map((x) => [n.posten(x.posten), euro(x.betrag), n.periode(x.periode), n.basis(x.basis)]), summe: p.kosten.zeilen.length ? [t("ordner.dok.monatslast"), euro(p.kosten.gesamt), "", ""] : null, leer: t("ordner.zeile.kostenKeine") });
  return { titel: t(`ordner.${art}.titel`), laden: stand.betrieb?.name || "", zeitraum: monatLang(p.zeitraum.von), erstellt: erstelltText(), sprache: sprache(), abschnitte: a, fuss: t("ordner.dok.fussSteuer") };
}

// Dateien (CSV) je Teil
const dateiName = (stand, teil, z) => `${(stand.betrieb?.name || "laden").replace(/ı/g, "i").replace(/ß/g, "ss").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "_").replace(/_+/g, "_").slice(0, 30)}_${teil}_${z.von}_${z.bis}.csv`;
function csvDateien(stand, ansicht, nurTeil = null) {
  const H = heute(); const n = NAMEN();
  if (ansicht === "ordner-amt") { const z = amtZeitraum(H); const o = ordnerAmt(stand, z, { datum: H });
    return AMT_TEILE.filter((x) => !nurTeil || x === nurTeil).map((teil) => ({ name: dateiName(stand, t("ordner.datei." + teil), z), text: amtCsv(o, teil, kopfVon(teil), n) })); }
  const art = ansicht === "ordner-steuer" ? "steuer" : "buch"; const z = paketZeit(art, H); const p = monatsPaket(stand, z, art);
  return p.teile.filter((x) => !nurTeil || x === nurTeil).map((teil) => ({ name: dateiName(stand, t("ordner.datei." + teil), z), text: teilCsv(p, teil, kopfVon(teil), n) }));
}
export function dokumentFuer(stand, ansicht) {
  const H = heute();
  if (ansicht === "ordner-amt") return druckHtml(amtDokument(stand, ordnerAmt(stand, amtZeitraum(H), { datum: H })));
  const art = ansicht === "ordner-steuer" ? "steuer" : "buch";
  return druckHtml(paketDokument(stand, monatsPaket(stand, paketZeit(art, H), art)));
}

// ---------- Drucken und Teilen (Browser) ----------
function drucken(html) {
  const f = document.createElement("iframe");
  f.setAttribute("aria-hidden", "true"); f.className = "b-druckrahmen";
  f.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { console.warn(e); const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); w.print(); } } setTimeout(() => f.remove(), 60000); };
  f.srcdoc = html; document.body.appendChild(f);
}
async function teilen(dateien, titel) {
  const files = dateien.map((d) => new File([d.text], d.name, { type: d.typ || "text/csv;charset=utf-8" }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: titel }); return "geteilt"; } catch (e) { if (e.name === "AbortError") return "abgebrochen"; }
  }
  for (const f of files) { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  return "geladen";
}

// ---------- Aktionen und Eingaben ----------
// Rückgabe: false | true (neu zeichnen) | { speichern?: true, meldung? }
export async function ordnerAktion(name, el, stand, ansicht) {
  const H = heute();
  if (name === "ordner-zeit") { amtZeit = { art: el.dataset.wert, von: amtZeit.von, bis: amtZeit.bis }; if (amtZeit.art === "frei" && !amtZeit.von) { const z = zeitraumFuer("monat", { datum: H }); amtZeit.von = z.von; amtZeit.bis = H; } return true; }
  if (name === "ordner-monat") { const art = ansicht === "ordner-steuer" ? "steuer" : "buch"; const jetzt = paketZeit(art, H).monat; const neu = monatPlus(jetzt, Number(el.dataset.wert) || 0); if (neu > H.slice(0, 7)) return false; paketMonat[art] = neu; return true; }
  if (name === "ordner-belehrung") { belehrungAuf = !belehrungAuf; return true; }
  if (name === "bel-eintragen") {
    const id = el.dataset.id; const e = belehrungEintragen(stand, id, { datum: belDatum[id] || H, art: el.dataset.wert });
    if (!e) return { meldung: t("ordner.belehrung.ungueltig") };
    delete belDatum[id]; return { speichern: true, meldung: t("ordner.belehrung.gespeichert") };
  }
  if (name === "bel-person-neu") { const k = personNeu.trim(); if (!k) return false; stand.personen ??= []; stand.personen.push({ id: uid(), kuerzel: k.slice(0, 12), aktiv: true, entfernt: false }); personNeu = ""; return { speichern: true }; }
  if (name === "ordner-vorschau") { vorschauHtml = dokumentFuer(stand, ansicht); return true; }
  if (name === "ordner-vorschau-zu") { vorschauHtml = null; return true; }
  if (name === "ordner-pdf") { drucken(vorschauHtml || dokumentFuer(stand, ansicht)); return { meldung: t("ordner.knopf.druckHinweis") }; }
  if (name === "ordner-teilen") { const html = vorschauHtml || dokumentFuer(stand, ansicht); const z = ansicht === "ordner-amt" ? amtZeitraum(H) : paketZeit(ansicht === "ordner-steuer" ? "steuer" : "buch", H);
    const r = await teilen([{ name: dateiName(stand, t("ordner.datei." + ansicht.slice(7)), z).replace(/\.csv$/, ".html"), text: html, typ: "text/html;charset=utf-8" }], t(`ordner.${ansicht.slice(7)}.titel`)); return r === "abgebrochen" ? false : { meldung: t("ordner.knopf.geteilt") }; }
  if (name === "ordner-csv") { const d = csvDateien(stand, ansicht, el.dataset.teil || null); const r = await teilen(d, t(`ordner.${ansicht.slice(7)}.titel`)); return r === "abgebrochen" ? false : { meldung: t("ordner.knopf.csvFertig", d.length) }; }
  return false;
}
export function ordnerEingabe(feld, wert) {
  if (feld === "amt-von" || feld === "amt-bis") { if (/^\d{4}-\d{2}-\d{2}$/.test(wert)) { amtZeit = { ...amtZeit, art: "frei", [feld === "amt-von" ? "von" : "bis"]: wert }; return true; } return false; }
  if (feld.startsWith("bel-datum:")) { belDatum[feld.slice(10)] = wert; return "knopf"; }
  if (feld === "person-neu") { personNeu = wert; return "knopf"; }
  return false;
}
