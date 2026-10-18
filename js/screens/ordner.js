// Büro – die drei Ordner zum Abgeben (Drei Ebenen, 15.10.2026, Vorschau-Rahmen „Ordner Gesundheitsamt“):
// "ordner-amt" (Gesundheitsamt: Kühlprotokoll, Putznachweis, Belehrungen, Eigenkontroll-Konzept), "ordner-steuer" (Steuerberater),
// "ordner-buch" (Buchhalter). Je Ordner: Zeitraum, Stand mit Ring, Inhaltsliste mit Haken/Lücke, „Als PDF teilen“, Vorschau, CSV.
// Daten kommen rein rechnend aus js/export_amt.js und js/export_steuer.js, Texte und Druckmodelle aus js/ordner_text.js (Trennung 2, 17.10.2026);
// hier stehen nur Aufbau, Zeitraum-Wahl und Teilen/Drucken.
import { t } from "../i18n.js";
import { esc, heute } from "../util.js";
import { personAnlegen } from "../stamm.js"; // Trennung (17.10.2026)
import { ordnerAmt, zeitraumFuer, belehrungEintragen } from "../export_amt.js";
import { monatsPaket, monatPlus, datumDe } from "../export_steuer.js";
import { amtZeitraumVon, paketZeitVon, monatLang, amtUnter, amtHinweis, paketUnter, dateiName, csvDateien as csvDateienR, dokumentFuer as dokumentFuerR } from "../ordner_text.js"; // Trennung 2 (17.10.2026)
import { monatName } from "./tag.js";
import { bsym, bueroKopf } from "./buero.js";
import { bueroRing as ring, dateienTeilen } from "./bausteine.js"; // Trennung (17.10.2026)

// ---------- Zustand ----------
let amtZeit = { art: "monat", von: null, bis: null };
let paketMonat = { steuer: null, buch: null };  // "JJJJ-MM"; null = Vormonat
let belehrungAuf = false;
const belDatum = {};          // personId → gewähltes Datum (Feld), Standard heute
let personNeu = "";
let vorschauHtml = null;      // offene Vorschau (fertiges Dokument)
export function ordnerZuruecksetzen() { belehrungAuf = false; vorschauHtml = null; personNeu = ""; }
export const ordnerVorschauOffen = () => !!vorschauHtml;

// Trennung 2 (17.10.2026): Zeitraum, Texte, Druckmodelle und CSV wohnen in js/ordner_text.js; hier nur die gewählte Zeit (Modulzustand).
const datum = (iso) => (iso ? datumDe(iso) : "–");
const wahl = () => ({ amtZeit, paketMonat });
const amtZeitraum = (H = heute()) => amtZeitraumVon(amtZeit, H);
const paketZeit = (art, H = heute()) => paketZeitVon(paketMonat, art, H);
const csvJetzt = (stand, ansicht, nurTeil = null) => csvDateienR(stand, ansicht, nurTeil, wahl());
const dokumentJetzt = (stand, ansicht) => dokumentFuerR(stand, ansicht, wahl());

// ---------- Zeilen der Inhaltsliste ----------
// W2-T: ok (Haken) · luecke (!) · pruefen (!) · notiz (i, nur Notiz) – Haken nur bei ok
const statusSym = (ok) => ok === null ? "" : ok === true || ok === "ok" ? `<span class="b-status ok" title="${esc(t("ordner.status.ok"))}">${bsym("check")}</span>`
  : ok === "notiz" ? `<span class="b-status luecke" title="${esc(t("ordnerT.status.notiz"))}">i</span>`
  : `<span class="b-status luecke" title="${esc(ok === "pruefen" ? t("ordnerT.status.pruefen") : t("ordner.status.luecke"))}">!</span>`;
const inhaltZeile = (symbol, titel, unter, ok, { aktion = "", teil = "", csv = false, auf = null } = {}) => {
  const innen = `<span class="b-zs">${bsym(symbol)}</span><span class="b-zt"><b>${esc(titel)}</b><small class="zahl">${esc(unter)}</small></span>`;
  const rechts = `${csv ? `<button type="button" class="b-mini" data-a="ordner-csv" data-teil="${esc(teil)}" aria-label="${esc(t("ordner.knopf.csvTeil", titel))}">CSV</button>` : ""}${statusSym(ok)}`;
  return aktion ? `<div class="b-zeile-wrap"><button type="button" class="b-zeile" data-a="${aktion}" aria-expanded="${auf}">${innen}${rechts}</button></div>` : `<div class="b-zeile">${innen}${rechts}</div>`;
};

function belehrungBlock(stand, o) {
  const H = heute();
  const statusText = (x) => x.status === "fehlt" ? t("ordner.belehrung.ohne") : `${t("ordner.belehrung.letzte", datum(x.letzte))} · ${t("ordner.belehrung.faellig", datum(x.faellig))}`;
  return `<div class="b-belehrung">
    <p class="b-leise">${esc(t("ordner.belehrung.hinweis"))}</p>${o.teile.belehrung.ausgeschieden.length ? `<p class="b-leise" data-ausgeschieden="${o.teile.belehrung.ausgeschieden.length}">${esc(t("amtW2.personAltHinweis"))}</p>` : ""}
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
function standKarte(von, gesamt, hinweis, allesDa = t("ordner.allesDa")) {
  return `<div class="karte b-stand">${ring(gesamt ? von / gesamt * 100 : 0, { groesse: 54, dicke: 6, farbe: von === gesamt ? "var(--eigen)" : "var(--glut)", text: true })}<div><b>${esc(von === gesamt ? allesDa : t("ordner.standVon", von, gesamt))}</b>${hinweis ? `<small>${esc(hinweis)}</small>` : ""}</div></div>`;
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
        ${inhaltZeile("file-text", t("amtW2.konzeptTitel"), amtUnter("konzept", o.teile.konzept), null)}
        ${inhaltZeile("trash-2", t("amtW2.muellTitel"), amtUnter("muell", o.teile.muell), null)}
      </div>
      ${knoepfe()}
    </div>${vorschauBlatt()}</div>`;
}

// ---------- Steuerberater und Buchhalter ----------
const TEIL_SYM = { umsatz: "trending-up", personal: "users", schwund: "trash-2", belege: "receipt", inventur: "clipboard-list", reinigung: "spray-can", kosten: "calculator" };

export function ordnerPaketView(stand, art) {
  const H = heute(); const z = paketZeit(art, H); const p = monatsPaket(stand, z, art);
  const istAktuell = z.monat >= H.slice(0, 7);
  return `<div class="buero">${bueroKopf({ ziel: "buero", text: t("buero.titel") }, "")}
    <div class="b-inhalt b-ordnerseite">
      ${kopfOrdner(stand, art, art === "steuer" ? "calculator" : "receipt", t(`ordner.${art}.unter`))}
      <div class="b-monat"><button type="button" class="b-rund" data-a="ordner-monat" data-wert="-1" aria-label="${esc(t("ordner.zeit.vor"))}">${bsym("chevron-left")}</button><b>${esc(monatLang(z.von))}</b><button type="button" class="b-rund" data-a="ordner-monat" data-wert="1" aria-label="${esc(t("ordner.zeit.nach"))}" ${istAktuell ? "disabled" : ""}>${bsym("chevron-right")}</button></div>
      ${standKarte(p.vollstaendig, p.pruefTeile.length, t("ordnerT.kasse"), t("ordnerT.allesDa"))}
      <div class="karte b-liste">${p.teile.map((teil) => inhaltZeile(TEIL_SYM[teil], t("ordner.teil." + teil), paketUnter(teil, p), p.stand[teil], { teil, csv: true })).join("")}</div>
      ${knoepfe()}
    </div>${vorschauBlatt()}</div>`;
}

// ---------- Drucken und Teilen (Browser) ----------
// Eigentümer-Ebene (18.10.2026): exportiert, screens/laeden.js druckt den Eigentümer-Bericht damit
export function drucken(html) {
  const f = document.createElement("iframe");
  f.setAttribute("aria-hidden", "true"); f.className = "b-druckrahmen";
  f.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { console.warn(e); const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); w.print(); } } setTimeout(() => f.remove(), 60000); };
  f.srcdoc = html; document.body.appendChild(f);
}
const teilen = dateienTeilen; // Trennung (17.10.2026): gemeinsames Teilen (./bausteine.js)

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
  if (name === "bel-person-neu") { const k = personNeu.trim(); if (!k) return false; personAnlegen(stand, k.slice(0, 12)); personNeu = ""; return { speichern: true }; }
  if (name === "ordner-vorschau") { vorschauHtml = dokumentJetzt(stand, ansicht); return true; }
  if (name === "ordner-vorschau-zu") { vorschauHtml = null; return true; }
  if (name === "ordner-pdf") { drucken(vorschauHtml || dokumentJetzt(stand, ansicht)); return { meldung: t("ordner.knopf.druckHinweis") }; }
  if (name === "ordner-teilen") { const html = vorschauHtml || dokumentJetzt(stand, ansicht); const z = ansicht === "ordner-amt" ? amtZeitraum(H) : paketZeit(ansicht === "ordner-steuer" ? "steuer" : "buch", H);
    const r = await teilen([{ name: dateiName(stand, t("ordner.datei." + ansicht.slice(7)), z).replace(/\.csv$/, ".html"), text: html, typ: "text/html;charset=utf-8" }], t(`ordner.${ansicht.slice(7)}.titel`)); return r === "abgebrochen" ? false : { meldung: t("ordner.knopf.geteilt") }; }
  if (name === "ordner-csv") { const d = csvJetzt(stand, ansicht, el.dataset.teil || null); const r = await teilen(d, t(`ordner.${ansicht.slice(7)}.titel`)); return r === "abgebrochen" ? false : { meldung: t("ordner.knopf.csvFertig", d.length) }; }
  return false;
}
export function ordnerEingabe(feld, wert) {
  if (feld === "amt-von" || feld === "amt-bis") { if (/^\d{4}-\d{2}-\d{2}$/.test(wert)) { amtZeit = { ...amtZeit, art: "frei", [feld === "amt-von" ? "von" : "bis"]: wert }; return true; } return false; }
  if (feld.startsWith("bel-datum:")) { belDatum[feld.slice(10)] = wert; return "knopf"; }
  if (feld === "person-neu") { personNeu = wert; return "knopf"; }
  return false;
}
