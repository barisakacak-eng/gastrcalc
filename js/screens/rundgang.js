// Mitmach-Rundgang mit Zeki (Entwurf 28.10.2026, Konzept „Mitmach-Rundgang“ Abschnitt 7, freigegeben 13:39). Ersetzt den Vortrag vom 26.10.:
// zeigen, tippen lassen, loben, weiter. Nur das Ziel im Lichtkegel ist antippbar, der Rest gesperrt; der Chef tippt auf die ECHTEN Knöpfe.
// Alles, was er dabei einträgt, ist Übung: app.js merkt den Stand vorher, pausiert das Speichern und legt den Stand am Ende zurück
// (js/stamm.js uebungStarten/uebungZuruecknehmen, js/store.js speichernPausieren). Diese Datei zeigt nur an und meldet über die Rückrufe
// (api) aus app.js – sie schreibt nie in den Laden. „Überspringen“ (jede Station außer 16) führt zum Pflicht-Abschluss (Station 16),
// ohne eigenes Rezept vorher über das Fenster „Achtung Chef …“. Station 16 lässt sich nicht überspringen oder schließen.
import { t, sprache, mengenText } from "../i18n.js";
import { esc } from "../util.js";
import { mascotMarkup, zekiSpielen } from "../gastrocash-brand.js";
import { zekiFragenFuer } from "../data/zeki_fragen.js";

const M = (k, ...a) => t("rundgang.mitmach." + k, ...a);
const BEISPIEL_MAIL = "steuer@example.com"; // reservierte Beispiel-Adresse (RFC 2606), nur im Feld, nie gespeichert

// Stationen 0–16 (Konzept 7.1). schritte: { ziel (Selektor oder Liste – der Lichtkegel umfasst alle), tipp (nur dieser Knopf zählt),
// schlucken (Tipp zählt, die App reagiert nicht), nurZeigen (nicht antippbar, „Weiter“), fertig (api → true: Schritt erledigt),
// fuellen (Übungswerte in Feldern), vor (vorbereiten), text (eigener Satz), frei (kein Abdunkeln), oben (Blase oben) }.
const STATIONEN = {
  0: { blasen: ["s0a", "s0b"] },
  1: { text: "s1", schritte: [{ ziel: "#app .h-ziel", schlucken: true, vor: (a) => a.gehe("start") }] },
  2: { text: "s2", schritte: [
    { ziel: '#app .h-kacheln [data-wert="umsatzheute"]', vor: (a) => a.gehe("start") },
    { ziel: ['#app .ul-feld:has([data-f="ul-umsatz"])', '#app .ul-feld:has([data-f="ul-liefer"])'], fuellen: { "ul-umsatz": "800", "ul-liefer": "200" } }] },
  3: { text: "s3", schritte: [
    { ziel: ["#app .ul-team-kompakt", '#app .ul-feld:has([data-f="ul-team-satz"])'], fuellen: { "ul-team-pers": "3", "ul-team-std": "24", "ul-team-satz": "14" } },
    { ziel: '#app [data-a="ul-speichern"]', text: "s3b" }] },
  4: { text: "s4", schritte: [{ ziel: '.tableiste [data-wert="muell"]' }, { ziel: '#app [data-a="muell-tipp"]' }] },
  5: { text: "s5", schritte: [{ ziel: ['#app [data-a="muell-grund"][data-wert="personal"]', '#app [data-a="muell-grund"][data-wert="ausgegeben"]'], vor: (a) => a.gehe("muell", true) }] },
  6: { text: "s6", schritte: [{ ziel: '.tableiste [data-wert="kuehl"]' }, { ziel: '#app [data-a="kuehl-rundgang-los"]' },
    { ziel: ['#app [data-f="station-wert"]', '#app [data-a="station-speichern"]'], tipp: '[data-a="station-speichern"]', fuellen: { "station-wert": "4" } }] },
  7: { text: "s7", schritte: [{ ziel: '.tableiste [data-wert="putzplan"]' }, { ziel: '#app [data-a="pp-haken"]' }] },
  9: { schritte: [
    { ziel: '.tableiste [data-wert="karte"]', text: (a) => { const f = a.rezeptFrage(); return f ? `${t("waage.frage", mengenText(f.zutat), f.gericht, f.einheit)} ${M("s9aNur")}` : M("s9a", a.rezeptName()); } },
    { ziel: (a) => `#app .kl-zeile [data-a="kl-rezept"][data-id="${a.rezeptId()}"]`, text: "s9b", vor: (a) => a.rezeptMerken() },
    { ziel: [".schirm .inhalt", ".schirm .fuss"], frei: true, oben: true, text: () => M("s9c", t("waage.ok")), fertig: (a) => a.phase() === "app" }],
    nur: (a) => !!a.rezeptId(), nach: (a) => a.rezeptNachher() },
  10: { text: "s10", schritte: [{ ziel: '#app .kl-zeile [data-a="kl-auf"]', vor: (a) => a.gehe("karte", true) }] },
  8: { text: "s8weg", schritte: [
    { ziel: '#app [data-a="menue-auf"]', vor: (a) => a.gehe("karte", true) },
    { ziel: '#ebene-huelle [data-a="modus"][data-wert="buero"]' },
    { ziel: "#ebene-huelle .blatt-pin", fertig: (a) => a.modus() === "buero" },
    { ziel: '#app [data-a="nav"][data-wert="beleg"]', vor: () => aufklappen("ware") },
    { ziel: "#app label.fotoknopf", text: "s8", schlucken: true, beispiel: "beleg" }] },
  11: { text: "s11weg", schritte: [
    { ziel: "#app .ebene-kopf .zurueckzeile" },
    { ziel: '#app [data-a="nav"][data-wert="ordner-steuer"]' },
    { ziel: '#app [data-f="ordner-mail:steuer"]', text: "s11", fuellen: { "ordner-mail:steuer": BEISPIEL_MAIL } }] },
  12: { text: "s12", schritte: [{ ziel: '#app [data-a="ordner-schicken"][data-wert="steuer"]', nurZeigen: true, umschlag: true }] },
  13: { text: "s13", schritte: [{ ziel: "#app .ebene-kopf .zurueckzeile" }, { ziel: '#app details[data-bereich="geld"] > summary' }], lob: (a) => (a.kostenLeer() ? M("s13leer") : null) },
  14: { text: "s14", schritte: [{ ziel: ".appleiste .zeki-knopf", schlucken: true }] },
};
// Gespielte Reihenfolge: Station 8 (Rechnung) kommt nach 10, damit alle Büro-Stationen (8, 11, 12, 13) an einem Stück laufen –
// ein Weg ins Büro (Büro-Code höchstens einmal), kein Hin und Her zwischen Laden und Büro.
export const MITMACH_REIHE = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 8, 11, 12, 13, 14, 15, 16];
// Fortsetzen nach Abbruch/Neuladen: Stationen mitten in einem Ablauf beginnen bei dessen Anfang
const FORTSETZEN = { 3: 2, 5: 4, 10: 9, 11: 8, 12: 8, 13: 8 };

let huelle = null, api = null, doc = null;
let pos = 0, sub = 0, schritt = null, rect = null, folge = null, warte = null, fertigUhr = null, laeuft = 0, gesperrt = false, startZeit = 0;
const fuellen = (el, html) => el.replaceChildren(el.ownerDocument.createRange().createContextualFragment(html)); // nur Anzeige

export const rundgangOffen = () => !!huelle;
export const mitmachStation = () => (huelle ? MITMACH_REIHE[pos] ?? null : null);

// Station und Schritt stehen an der Hülle (für Vorlesehilfen und die Browser-Prüfung)
function marke(station, s) { huelle?.setAttribute("data-station", String(station)); huelle?.setAttribute("data-schritt", String(s)); }
function aufklappen(bereich) { doc?.querySelector(`#app details[data-bereich="${bereich}"]`)?.setAttribute("open", ""); }

export function rundgangStarten(d, rueck = {}) {
  if (!d || huelle) return false;
  doc = d; api = rueck;
  const ab = Number(api.fortsetzen?.()) || 0; const station = FORTSETZEN[ab] ?? ab;
  pos = Math.max(0, MITMACH_REIHE.indexOf(station)); if (MITMACH_REIHE[pos] >= 16) pos = 0;
  huelle = doc.createElement("div");
  huelle.setAttribute("class", "rg-huelle rg-mitmach"); huelle.setAttribute("role", "dialog"); huelle.setAttribute("aria-modal", "true"); huelle.setAttribute("aria-label", M("titel"));
  doc.body.appendChild(huelle); doc.body.classList.add("rg-aktiv");
  doc.addEventListener("click", klick, true);
  startZeit = Date.now();
  api.log?.({ art: "rundgang", inhalt: "start", station: MITMACH_REIHE[pos] });
  Promise.resolve(api.uebungStart?.()).finally(() => station0());
  return true;
}
function station0() { if (huelle) stationZeigen(); }

// ---------- Ablauf ----------
function stopp() { clearInterval(folge); clearTimeout(warte); clearInterval(fertigUhr); folge = warte = fertigUhr = null; }
function stationZeigen() {
  stopp(); laeuft++; gesperrt = false;
  const nr = MITMACH_REIHE[pos]; api.merken?.(nr); marke(nr, 0);
  if (nr === 15) return frage();
  if (nr === 16) return uebungEnde("verstanden");
  const st = STATIONEN[nr];
  if (st.nur && !st.nur(api)) return naechsteStation();
  if (st.blasen) return blasen(st.blasen, 0);
  sub = 0; schrittZeigen();
}
function naechsteStation() { const st = STATIONEN[MITMACH_REIHE[pos]]; try { st?.nach?.(api); } catch (e) { console.warn(e); } pos += 1; stationZeigen(); }
const zielListe = (s) => { const z = typeof s.ziel === "function" ? s.ziel(api) : s.ziel; return Array.isArray(z) ? z : [z]; };
function elemente(s) {
  const sichtbar = (el) => el.getClientRects().length && doc.defaultView.getComputedStyle(el).visibility !== "hidden";
  return zielListe(s).map((sel) => [...doc.querySelectorAll(sel)].find(sichtbar)).filter(Boolean);
}
function vereinigung(els) {
  if (!els.length) return null;
  const r = els.map((e) => e.getBoundingClientRect());
  const top = Math.min(...r.map((x) => x.top)), left = Math.min(...r.map((x) => x.left)), right = Math.max(...r.map((x) => x.right)), bottom = Math.max(...r.map((x) => x.bottom));
  return { top, left, right, bottom, width: right - left, height: bottom - top };
}
function schrittZeigen() {
  stopp(); const nr = MITMACH_REIHE[pos]; const st = STATIONEN[nr]; schritt = st.schritte[sub];
  if (!schritt) return stationFertig();
  const meins = ++laeuft; marke(nr, sub); gesperrt = false; huelle.classList.add("rg-sucht"); // bis das neue Ziel steht: keine alte Blase
  try { schritt.vor?.(api); } catch (e) { console.warn(e); }
  if (schritt.fertig && schritt.fertig(api)) return schrittFertig(); // z. B. Büro ohne Code: das Code-Blatt kommt gar nicht
  const ab = Date.now();
  const suchen = () => {
    if (meins !== laeuft || !huelle) return;
    if (schritt.fertig && schritt.fertig(api)) return schrittFertig();
    const els = elemente(schritt);
    if (!els.length) { if (Date.now() - ab > 3000) { api.log?.({ art: "rundgang", inhalt: "ziel-fehlt", station: nr, schritt: sub }); return schrittFertig(true); } warte = setTimeout(suchen, 150); return; }
    els[0].scrollIntoView({ block: "center", behavior: "instant" });
    if (schritt.fuellen) werteEintragen(schritt.fuellen);
    rect = vereinigung(els); zeichnen(st);
    folge = setInterval(() => folgen(meins), 200);
  };
  suchen();
}
function werteEintragen(werte) {
  const setzen = Object.getOwnPropertyDescriptor(doc.defaultView.HTMLInputElement.prototype, "value").set;
  for (const [f, w] of Object.entries(werte)) {
    const el = doc.querySelector(`#app [data-f="${f}"]`); if (!el) continue;
    setzen.call(el, w); el.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
  }
}
// Der Bildschirm darunter zeichnet sich neu (echte App) – der Lichtkegel folgt dem Ziel; ein Ziel mit fertig() wird hier geprüft.
function folgen(meins) {
  if (meins !== laeuft || !huelle || !schritt) return;
  if (schritt.fertig && schritt.fertig(api)) return schrittFertig();
  const r = vereinigung(elemente(schritt)); if (!r) return;
  if (!rect || Math.abs(r.top - rect.top) + Math.abs(r.left - rect.left) + Math.abs(r.height - rect.height) + Math.abs(r.width - rect.width) > 2) { rect = r; lage(); }
}
const PAD = 8;
function klick(ev) {
  if (!huelle || !schritt || gesperrt || !rect || schritt.nurZeigen || huelle.classList.contains("rg-pause")) return;
  if (ev.target.closest?.(".rg-karte, .rg-ueberspringen, .rg-ende")) return;
  const x = ev.clientX, y = ev.clientY;
  const drin = x >= rect.left - PAD && x <= rect.right + PAD && y >= rect.top - PAD && y <= rect.bottom + PAD;
  // F2 (Sonderauftrag 6b, 28.10.2026): auch ein Tipp direkt auf das Ziel zählt, selbst wenn der Lichtkegel auf dem Handy leicht verrutscht ist
  const aufZiel = zielListe(schritt).some((sel) => typeof sel === "string" && ev.target.closest?.(sel));
  if (!drin && !aufZiel) return;
  if (schritt.tipp && !ev.target.closest?.(schritt.tipp)) return;
  if (schritt.schlucken) { ev.preventDefault(); ev.stopPropagation(); }
  if (schritt.fertig) return; // fertig() entscheidet (z. B. Waage beendet)
  gesperrt = true; setTimeout(() => schrittFertig(), schritt.schlucken ? 0 : 380); // die App zeichnet erst ihren nächsten Bildschirm
}
function schrittFertig(still = false) {
  stopp(); const st = STATIONEN[MITMACH_REIHE[pos]];
  if (sub < st.schritte.length - 1) { sub += 1; return schrittZeigen(); }
  stationFertig(still);
}
function stationFertig(still = false) {
  stopp(); const st = STATIONEN[MITMACH_REIHE[pos]] || {}; const meins = ++laeuft;
  if (still || !huelle) return naechsteStation();
  marke(MITMACH_REIHE[pos], "lob");
  const lobText = st.lob?.(api) || (schritt?.beispiel === "beleg" ? M("s8beispiel") : M("lob")[pos % M("lob").length]);
  huelle.querySelector(".rg-blase p")?.replaceChildren(lobText);
  if (schritt?.beispiel === "beleg") huelle.querySelector(".rg-blase")?.insertAdjacentHTML("beforeend", `<div class="rg-beleg" aria-hidden="true"><b>${esc(M("beispiel"))}</b><i></i><i></i><i></i><i></i></div>`);
  huelle.querySelector(".rg-fuss")?.setAttribute("hidden", "");
  zeki(pos % 2 ? "freuen" : "nicken");
  setTimeout(() => { if (meins === laeuft) naechsteStation(); }, schritt?.beispiel ? 1500 : 850);
}

// ---------- Zeichnen ----------
const punkte = () => `<span class="rg-punkte" aria-hidden="true">${MITMACH_REIHE.slice(0, -2).map((_, i) => `<i class="${i === pos ? "an" : i < pos ? "da" : ""}"></i>`).join("")}</span>`;
const skip = () => `<button type="button" class="rg-ueberspringen" data-rg="ueberspringen">${esc(M("ueberspringen"))}</button>`;
const uebungPille = () => `<span class="rg-uebung">${esc(M("uebung"))}</span>`;
function textVon(st, s) { const x = s?.text || st.text; return typeof x === "function" ? x(api) : M(x); }
function zeichnen(st) {
  const s = schritt; const text = textVon(st, s);
  fuellen(huelle, `
    ${s.frei ? "" : `<div class="rg-loch">${s.nurZeigen || s.fertig ? "" : `<span class="rg-tipphier" dir="auto">${esc(M("tippHier"))}</span>`}</div>`}
    ${s.frei ? "" : `<div class="rg-sperre o"></div><div class="rg-sperre u"></div><div class="rg-sperre l"></div><div class="rg-sperre r"></div>`}
    ${s.nurZeigen ? `<div class="rg-deckel"></div>` : ""}
    ${skip()}
    <div class="rg-karte">
      <span class="rg-zeki">${mascotMarkup("hilfe", "none")}</span>
      <div class="rg-blase">${uebungPille()}<p dir="auto">${esc(text)}</p>
        ${s.umschlag ? umschlag() : ""}
        <div class="rg-fuss">${punkte()}${s.nurZeigen ? `<button type="button" class="knopf rg-weiter" data-rg="weiter">${esc(t("allgemein.weiter"))}</button>` : ""}</div></div>
    </div>`);
  huelle.classList.toggle("rg-frei", !!s.frei); huelle.classList.remove("rg-sucht");
  huelle.querySelector('[data-rg="ueberspringen"]').addEventListener("click", ueberspringen);
  huelle.querySelector('[data-rg="weiter"]')?.addEventListener("click", () => { if (!gesperrt) { gesperrt = true; stationFertig(); } });
  lage(true);
}
const umschlag = () => `<div class="rg-umschlag" aria-hidden="true"><span class="rg-blatt b1">${esc(M("blattListe"))}</span><span class="rg-blatt b2">PDF</span><span class="rg-blatt b3">CSV</span><span class="rg-kuvert"></span></div>`;
function px(el, werte) { el?.setAttribute("style", Object.entries(werte).map(([k, v]) => `${k}:${Math.round(v)}px`).join(";")); }
function lage(neu = false) {
  if (!huelle || !rect) return;
  const w = doc.defaultView.innerWidth, h = doc.defaultView.innerHeight, r = rect;
  const o = { top: Math.max(0, r.top - PAD), left: Math.max(0, r.left - PAD), right: Math.min(w, r.right + PAD), bottom: Math.min(h, r.bottom + PAD) };
  px(huelle.querySelector(".rg-loch"), { top: o.top, left: o.left, width: o.right - o.left, height: o.bottom - o.top });
  px(huelle.querySelector(".rg-deckel"), { top: o.top, left: o.left, width: o.right - o.left, height: o.bottom - o.top });
  px(huelle.querySelector(".rg-sperre.o"), { top: 0, left: 0, width: w, height: o.top });
  px(huelle.querySelector(".rg-sperre.u"), { top: o.bottom, left: 0, width: w, height: h - o.bottom });
  px(huelle.querySelector(".rg-sperre.l"), { top: o.top, left: 0, width: o.left, height: o.bottom - o.top });
  px(huelle.querySelector(".rg-sperre.r"), { top: o.top, left: o.right, width: w - o.right, height: o.bottom - o.top });
  const karte = huelle.querySelector(".rg-karte"); const kh = karte?.getBoundingClientRect().height || 140;
  const platzUnten = h - o.bottom, platzOben = o.top;
  let top;
  if (schritt?.oben) top = 8 + 52;
  else if (platzUnten >= kh + 24 && (o.top + o.bottom) / 2 < h * 0.55) top = o.bottom + 14;
  else if (platzOben >= kh + 24) top = o.top - kh - 14;
  else top = Math.max(60, Math.min(h - kh - 12, o.bottom + 14));
  if (karte) karte.setAttribute("style", `top:${Math.round(top)}px`);
  // „Überspringen“ steht oben rechts; liegt dort das Ziel (Zeki oben), rutscht es nach unten
  const sk = huelle.querySelector(".rg-ueberspringen"); if (sk) sk.classList.toggle("unten", o.top < 120 && o.right > w - 170);
  if (neu) zeigen(karte, r);
}
// Zeki zeigt in Richtung Ziel (Arm), bei nahen Zielen reicht ein Nicken
function zeigen(karte, r) {
  const z = karte?.querySelector(".rg-zeki")?.getBoundingClientRect(); if (!z) return;
  const dx = (r.left + r.right) / 2 - (z.left + z.right) / 2, dy = (r.top + r.bottom) / 2 - (z.top + z.bottom) / 2;
  zeki(Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "zeigen-oben" : "zeigen-unten") : dx > 0 ? "zeigen-rechts" : "zeigen-links");
}
function zeki(bewegung) { const el = huelle?.querySelector(".rg-zeki"); if (el) zekiSpielen(el, bewegung); }

// Station 0: zwei Blasen, groß in der Mitte, ohne Lichtkegel
function blasen(liste, i) {
  stopp(); rect = null; schritt = null; const meins = ++laeuft;
  fuellen(huelle, `<div class="rg-dunkel"></div>${skip()}
    <div class="rg-ende rg-mitte">
      <span class="rg-zeki gross">${mascotMarkup("freude", "none")}</span>
      <div class="rg-blase">${uebungPille()}<p dir="auto">${esc(M(liste[i]))}</p><div class="rg-fuss">${punkte()}<button type="button" class="knopf rg-weiter" data-rg="weiter">${esc(t("allgemein.weiter"))}</button></div></div>
    </div>`);
  huelle.classList.remove("rg-frei");
  huelle.querySelector('[data-rg="ueberspringen"]').addEventListener("click", ueberspringen);
  huelle.querySelector('[data-rg="weiter"]').addEventListener("click", () => { if (meins !== laeuft) return; if (i + 1 < liste.length) blasen(liste, i + 1); else naechsteStation(); });
  huelle.querySelector('[data-rg="weiter"]').focus();
  zeki(i ? "zwinkern" : "winken");
}

// Station 15: „Chef, alles verstanden?“ Ja / Nochmal / Frage
function frage() {
  stopp(); rect = null; schritt = null; laeuft++;
  fuellen(huelle, `<div class="rg-dunkel"></div>${skip()}
    <div class="rg-ende">
      <span class="rg-zeki gross">${mascotMarkup("frage", "none")}</span>
      <h2 dir="auto">${esc(t("rundgang.fertigFrage"))}</h2>
      <button type="button" class="knopf" data-rg="ja">${esc(t("rundgang.ja"))}</button>
      <button type="button" class="knopf zweit" data-rg="nochmal">${esc(t("rundgang.nochmal"))}</button>
      <button type="button" class="knopf zweit" data-rg="frage">${esc(t("rundgang.frage"))}</button>
    </div>`);
  huelle.querySelector('[data-rg="ueberspringen"]').addEventListener("click", ueberspringen);
  huelle.querySelector('[data-rg="ja"]').addEventListener("click", () => { api.log?.({ art: "rundgang", inhalt: "verstanden" }); pos += 1; stationZeigen(); });
  huelle.querySelector('[data-rg="nochmal"]').addEventListener("click", () => { api.log?.({ art: "rundgang", inhalt: "nochmal" }); api.gehe?.("start"); pos = 0; stationZeigen(); });
  huelle.querySelector('[data-rg="frage"]').addEventListener("click", fragen);
  zeki("nachdenken");
}
function fragen() {
  const liste = zekiFragenFuer("start", sprache(), 6);
  fuellen(huelle, `<div class="rg-dunkel"></div>
    <div class="rg-ende rg-fragen">
      <span class="rg-zeki">${mascotMarkup("hilfe", "none")}</span>
      <h2 dir="auto">${esc(t("rundgang.fragenTitel"))}</h2>
      <div class="zeki-fragen">${liste.map((q) => `<details class="zeki-frage" data-id="${esc(q.id)}"><summary>${esc(q.f)}</summary><p>${esc(q.a)}</p></details>`).join("")}</div>
      <textarea class="textfeld rg-text" rows="2" maxlength="300" placeholder="${esc(t("rundgang.fragePlatzhalter"))}" aria-label="${esc(t("rundgang.fragePlatzhalter"))}"></textarea>
      <p class="rg-danke" hidden>${esc(t("rundgang.danke"))}</p>
      <button type="button" class="knopf zweit" data-rg="senden">${esc(t("rundgang.abschicken"))}</button>
      <button type="button" class="knopf" data-rg="fertig">${esc(t("rundgang.schliessen"))}</button>
    </div>`);
  huelle.querySelectorAll("details.zeki-frage").forEach((d) => d.addEventListener("toggle", () => { if (d.open) api.log?.({ art: "frage-katalog", inhalt: d.dataset.id, ort: "rundgang" }); }));
  huelle.querySelector('[data-rg="senden"]').addEventListener("click", () => {
    const feld = huelle.querySelector(".rg-text"); const text = feld.value.trim(); if (!text) { feld.focus(); return; }
    api.log?.({ art: "frage-frei", inhalt: text, ort: "rundgang", sprache: sprache() });
    feld.setRangeText("", 0, feld.value.length, "end"); huelle.querySelector(".rg-danke").hidden = false;
  });
  huelle.querySelector('[data-rg="fertig"]').addEventListener("click", () => uebungEnde("frage"));
}

// ---------- Ende der Übung: zurücknehmen, ggf. „Behalten?“, ggf. „Achtung Chef“, dann Station 16 ----------
let ergebnis = "verstanden";
function ueberspringen() {
  if (!huelle) return;
  api.log?.({ art: "rundgang", inhalt: "uebersprungen", station: MITMACH_REIHE[pos] });
  uebungEnde("uebersprungen");
}
async function uebungEnde(erg) {
  stopp(); laeuft++; ergebnis = erg; rect = null; schritt = null;
  pos = MITMACH_REIHE.indexOf(16); api.merken?.(16);
  try { await api.uebungEnde?.(); } catch (e) { console.warn(e); }
  if (api.rezeptGeaendert?.()) return behaltenFrage();
  nachBehalten();
}
function nachBehalten() {
  if (ergebnis === "uebersprungen" && !api.hatRezept?.()) return achtung();
  pflicht();
}
function behaltenFrage() {
  marke("behalten", 0);
  fuellen(huelle, `<div class="rg-dunkel"></div>
    <div class="rg-ende">
      <span class="rg-zeki gross">${mascotMarkup("frage", "none")}</span>
      <h2 dir="auto">${esc(M("behaltenFrage"))}</h2>
      <button type="button" class="knopf glut" data-rg="behalten">${esc(M("behaltenJa"))}</button>
      <button type="button" class="knopf zweit" data-rg="verwerfen">${esc(M("behaltenNein"))}</button>
    </div>`);
  huelle.querySelector('[data-rg="behalten"]').addEventListener("click", async () => { await api.behalten?.(); nachBehalten(); });
  huelle.querySelector('[data-rg="verwerfen"]').addEventListener("click", () => nachBehalten());
  zeki("nachdenken");
}
function achtung() {
  marke("achtung", 0);
  fuellen(huelle, `<div class="rg-dunkel"></div>
    <div class="rg-ende rg-achtung" role="alertdialog">
      <span class="rg-zeki gross">${mascotMarkup("warnung", "none")}</span>
      <h2 dir="auto">${esc(M("achtung"))}</h2>
      <button type="button" class="knopf glut rg-gross" data-rg="rezept">${esc(M("rezeptJetzt"))}</button>
      <button type="button" class="leise rg-spaeter" data-rg="spaeter">${esc(M("spaeter"))}</button>
    </div>`);
  huelle.querySelector('[data-rg="rezept"]').addEventListener("click", () => {
    // Echtes Rezept (keine Übung mehr): Rundgang ruht unsichtbar, bis der Chef aus der Waage zurück ist – dann Station 16
    huelle.classList.add("rg-pause"); fuellen(huelle, ""); api.log?.({ art: "rundgang", inhalt: "rezept-jetzt" });
    api.rezeptEintragen?.();
    const meins = ++laeuft;
    fertigUhr = setInterval(() => { if (meins !== laeuft) return; if (api.phase?.() === "app") { clearInterval(fertigUhr); huelle.classList.remove("rg-pause"); pflicht(); } }, 300);
  });
  huelle.querySelector('[data-rg="spaeter"]').addEventListener("click", pflicht);
  zeki("kopfschuetteln");
}
// Station 16: Pflicht-Abschluss – kein Überspringen, kein Schließen; „Verstanden“ erst nach 3 Sekunden
function pflicht() {
  stopp(); const meins = ++laeuft; marke(16, 0);
  fuellen(huelle, `<div class="rg-dunkel"></div>
    <div class="rg-ende rg-pflicht">
      <span class="rg-zeki gross">${mascotMarkup("aufmerksam", "none")}</span>
      <div class="rg-blase"><p dir="auto">${esc(M("pflicht1"))}</p></div>
      <div class="rg-blase rg-blase2"><p dir="auto">${esc(M("pflicht2"))}</p></div>
      <button type="button" class="knopf glut rg-verstanden" data-rg="verstanden" disabled><span class="rg-uhr" aria-hidden="true"></span>${esc(M("verstanden"))}</button>
    </div>`);
  const k = huelle.querySelector('[data-rg="verstanden"]');
  warte = setTimeout(() => { if (meins === laeuft) k.removeAttribute("disabled"); }, 3000);
  k.addEventListener("click", () => { if (!k.hasAttribute("disabled")) schliessen(); });
  zeki("zeigen-unten");
}
function schliessen() {
  stopp(); laeuft++;
  const dauer = Math.round((Date.now() - startZeit) / 1000);
  api.log?.({ art: "rundgang", inhalt: ergebnis, dauer });
  doc.removeEventListener("click", klick, true);
  huelle?.remove(); huelle = null; doc.body.classList.remove("rg-aktiv");
  api.ende?.(ergebnis);
}
