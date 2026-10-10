// Etappe 3: „Heute" – Tagesumsatz, Weggeworfen eintragen, und die Listen (Schwund, Müll je Fraktion, Personalessen).
// Einträge werden nur angehängt, nie überschrieben. Rücknahme = storniert, der Eintrag bleibt sichtbar.
import { t, einheitLabel } from "../i18n.js";
import { esc, parseZahl, fmtEuro, fmtZahl, uid, heute, wertAnzeige } from "../util.js";
import { EINHEITEN } from "../data/katalog.js";
import { wertEintrag, schwundAuswertung, zeitraumTage, monatsZeitraum, tagesnotizSetzen, tagesnotizLoeschen, umsatzEintrag, umsatzKonflikte, umsatzZeitraum, wochenSoll, monatsLast, mengeUmrechnen, kuehlStatus, schwundWertSetzen, SCHWUND_ARTEN, FRAKTIONEN, SVEV_2026 } from "../engine.js";
import { nav } from "./nav.js";

const ARTEN = ["verderb", "bruch", "fehler", "nichtverkauft", "personal", "eigen"];
const EINHEITEN_JE_BASIS = { g: ["g", "kg"], ml: ["ml", "l"], stk: ["stk"] };
const basisVon = (einheit) => EINHEITEN[einheit]?.basis || "stk";

// Flüchtiger Zustand des Eingabeformulars (nicht gespeichert)
let form = null;
let listenZeitraum = "woche"; // "woche" | "monat"
let tagDatum = null;          // gewählter Tag auf „Heute" (null = heute); Vergangenheit = Nacherfassung, gekennzeichnet
export const tagGewaehlt = () => tagDatum || heute();
export function tagZuruecksetzen() { tagDatum = null; form = null; }
const letzteTage = (n) => { const out = []; for (let i = 0; i < n; i++) { const d = new Date(); d.setDate(d.getDate() - i); out.push(heute(d)); } return out; };

const leeresForm = () => ({ art: null, ref: null, menge: null, einheit: null, fraktion: "bio", mahlzeit: "mittag", person: "", grund: "", suche: "" });

export function tagView(stand) {
  const H = heute(); const D = tagGewaehlt(); const nach = D !== H;
  const heuteEintraege = (stand.schwund || []).filter((e) => e.datum === D).slice().reverse();
  const notiz = umsatzEintrag(stand, D);
  const woche = umsatzZeitraum(stand, zeitraumTage(7));
  const soll = wochenSoll(stand);
  const sw = schwundAuswertung(stand, { von: D, bis: D });
  const ks = kuehlStatus(stand);
  const konflikte = umsatzKonflikte(stand);
  return `
    <div class="kopfband"><h1>${esc(nach ? t("tag.nacherfassen") : t("tag.titel"))}</h1><div class="unter">${esc(stand.betrieb.name || t("start.hallo", ""))} · ${esc(datumLesbar(D))}</div></div>
    <div class="inhalt">
      <div class="chips">${letzteTage(7).map((d, i) => `<button type="button" class="chip klein ${D === d ? "an" : ""}" data-a="tag-datum" data-wert="${d}">${esc(i === 0 ? t("tag.titel") : i === 1 ? t("tag.gestern") : datumLesbar(d).slice(0, 5))}</button>`).join("")}</div>
      ${nach ? `<div class="tipp">${esc(t("tag.nacherfassenHinweis"))}</div>` : ""}
      ${ks.eingerichtet ? `<button type="button" class="zeileknopf ${ks.ueberfaellig || ks.letzteAbweichung ? "warn" : ""}" data-a="nav" data-wert="kuehl"><span><b>${esc(t("kuehl.titel"))}</b><small>${esc(ks.bereit ? t("kuehl.kurz", ks.heuteGemessen, ks.stellen) : t("kuehl.grenzenFehlenKurz"))}${ks.nachkontrollen ? ` · ${esc(t("kuehl.nachkontrollenKurz", ks.nachkontrollen))}` : ""}${ks.fehlt7 ? ` · ${esc(t("kuehl.luecken7", ks.fehlt7))}` : ""}</small></span><span class="pfeil">›</span></button>`
        : `<button type="button" class="zeileknopf" data-a="nav" data-wert="kuehl"><span><b>${esc(t("kuehl.titel"))}</b><small>${esc(t("kuehl.nochNicht"))}</small></span><span class="pfeil">›</span></button>`}
      ${konflikte.length ? `<div class="karte hinweisgelb"><h2>${esc(t("tag.konfliktTitel"))}</h2><div>${esc(t("tag.konfliktText", konflikte.map(datumLesbar).join(", ")))}</div></div>` : ""}
      <div class="karte">
        <h2>${esc(t("tag.umsatz"))}${nach ? ` <span class="marke">${esc(datumLesbar(D))}</span>` : ""}</h2>
        <div class="zahlfeld klein"><input inputmode="decimal" data-f="umsatz" value="${esc(wertAnzeige(notiz?.umsatz ?? null))}" placeholder="" aria-label="${esc(t("tag.umsatz"))}"><span class="einheit">€</span></div>
        <span class="marke">${esc(t("tag.umsatzHinweis"))}</span>
        ${woche.tage ? `<div class="summenzeile"><span>${esc(t("tag.woche", woche.tage))}</span><span class="wert">${fmtEuro(woche.summe)}</span></div>
        <div class="summenzeile"><span>${esc(t("tag.wochenSoll"))}</span><span class="wert">${fmtEuro(soll)}${monatsLast(stand).offen ? ` <span class="abzeichen">${esc(t("zusammenfassung.unvollstaendig"))}</span>` : ""}</span></div>` : ""}
      </div>

      ${form ? formular(stand) : `
      <div class="karte">
        <h2>${esc(nach ? t("tag.eintraegeAm", datumLesbar(D)) : t("tag.eintraege"))}</h2>
        ${heuteEintraege.length ? `<div class="liste eng">${heuteEintraege.map((e) => eintragZeile(e, stand)).join("")}</div>
          <div class="summenzeile"><span>${esc(t("tag.heuteWert"))}</span><span class="wert">${fmtEuro(sw.muellwert, { dezimal: 2 })}${sw.ohneWert ? ` <span class="marke offen">+${sw.ohneWert} ${esc(t("tag.ohneWert"))}</span>` : ""}</span></div>` : `<div class="hinweis">${esc(t("tag.nochNichts"))}</div>`}
        <button type="button" class="knopf glut" data-a="schwund-neu">${esc(t("tag.eintragen"))}</button>
      </div>`}

      <button type="button" class="zeileknopf" data-a="nav" data-wert="listen"><span><b>${esc(t("listen.titel"))}</b><small>${esc(t("listen.unter"))}</small></span><span class="pfeil">›</span></button>
    </div>
    ${nav("tag")}`;
}

// Name des Eintrags: zuerst der gemerkte Name (überlebt das Löschen des Gerichts), sonst aus der Karte.
export function eintragName(e, stand) {
  if (e.ref?.typ === "gericht") return stand.gerichte.find((g) => g.id === e.ref.id)?.name || e.ref.name || "?";
  return e.ref?.name || "?";
}
export function eintragMenge(e) {
  if (e.ref?.typ === "gericht") return `${fmtZahl(e.menge, 0)} ${t("tag.portionen")}`;
  return `${fmtZahl(e.menge, e.einheit === "stk" ? 0 : 2)} ${einheitLabel(e.einheit)}`;
}
// Was ein Eintrag „wert" ist: Vorgang 1 zum Einkaufspreis, Personalessen zum Sachbezugswert (mit Wareneinsatz als Nebensatz), Eigenverbrauch zum Wareneinsatz.
function eintragBetrag(e, stand) {
  const waren = "wert" in e ? (typeof e.wert === "number" ? e.wert : null) : wertEintrag(e, stand);
  if (e.wertOffen && waren === null && !e.storniert) return `<span class="packung"><input inputmode="decimal" data-f="wert:${esc(e.id)}" placeholder="${esc(t("tag.wertNachtragen"))}" aria-label="${esc(t("tag.wertNachtragen"))}"><span class="einheit">€</span></span>`;
  if (e.art === "personal") return `<b>${fmtEuro((Number(e.menge) || 0) * (SVEV_2026[e.mahlzeit] ?? SVEV_2026.mittag), { dezimal: 2 })}</b><small class="marke">${esc(t("tag.sachbezug"))}${waren !== null ? ` · ${esc(t("tag.warenKurz"))} ${fmtEuro(waren, { dezimal: 2 })}` : ""}</small>`;
  return `<b>${waren === null ? `<span class="marke offen">${esc(t("tag.keinPreis"))}</span>` : fmtEuro(waren, { dezimal: 2 })}</b>`;
}

function eintragZeile(e, stand) {
  const name = eintragName(e, stand); const menge = eintragMenge(e);
  return `<div class="zeile ${e.storniert ? "storno" : ""}">
    <div class="oben"><div class="name">${esc(name)}<small>${e.nacherfasst ? `<span class="abzeichen">${esc(t("kuehl.nacherfasst"))}</span> ` : ""}${esc(t("tag.arten." + e.art))} · ${esc(menge)}${e.fraktion && SCHWUND_ARTEN[e.art] === 1 ? ` · ${esc(t("tag.fraktionen." + e.fraktion))}` : ""}${e.mahlzeit && e.art === "personal" ? ` · ${esc(t("tag.mahlzeiten." + e.mahlzeit))}` : ""}${e.person ? ` · ${esc(e.person)}` : ""}</small></div>
      <div style="text-align:right">${eintragBetrag(e, stand)}
      ${e.storniert ? `<small class="marke">${esc(t("tag.storniert"))}</small>` : `<button type="button" class="leise" data-a="schwund-storno" data-id="${esc(e.id)}">${esc(t("tag.zuruecknehmen"))}</button>`}</div></div>
  </div>`;
}

function formular(stand) {
  const f = form; const vorgang = f.art ? SCHWUND_ARTEN[f.art] : null;
  const q = f.suche.trim().toLowerCase();
  // Personalessen und Eigenverbrauch sind Mahlzeiten: nur Gerichte wählbar, sonst würden Gramm als Mahlzeiten gezählt.
  const artikelTreffer = vorgang === 1 ? (stand.artikel || []).filter((a) => a.benutzt !== false && (!q || a.name.toLowerCase().includes(q))).slice(0, 12) : [];
  const gerichtTreffer = (stand.gerichte || []).filter((g) => !q || g.name.toLowerCase().includes(q)).slice(0, 12);
  const wahl = f.ref ? (f.ref.typ === "gericht" ? stand.gerichte.find((g) => g.id === f.ref.id)?.name : f.ref.name) : null;
  const probe = f.ref && f.menge > 0 ? wertEintrag({ ...f, datum: tagGewaehlt() }, stand) : null;
  return `
    <div class="karte formular">
      <h2>${esc(t("tag.wasPassiert"))}</h2>
      <div class="chips">${ARTEN.map((a) => `<button type="button" class="chip ${f.art === a ? "an" : ""}" data-a="schwund-art" data-wert="${a}">${esc(t("tag.arten." + a))}</button>`).join("")}</div>
      ${vorgang === 2 ? `<span class="marke">${esc(t("tag.personalHinweis"))}</span>` : vorgang === 3 ? `<span class="marke">${esc(t("tag.eigenHinweis"))}</span>` : ""}
      ${f.art ? `
      <h2>${esc(t("tag.was"))}</h2>
      ${wahl ? `<div class="zeile an"><div class="oben"><div class="name">${esc(wahl)}</div><button type="button" class="leise" data-a="schwund-ref-weg">${esc(t("tag.andere"))}</button></div></div>` : `
        <input class="textfeld" data-f="schwund-suche" value="${esc(f.suche)}" placeholder="${esc(t(vorgang === 1 ? "tag.suchen" : "tag.suchenGericht"))}" autocomplete="off">
        ${vorgang !== 1 && !gerichtTreffer.length && !q ? `<div class="hinweis">${esc(t("tag.keineGerichte"))}</div>` : ""}
        <div class="liste eng">
          ${(vorgang === 1 ? [] : gerichtTreffer).map((g) => `<button type="button" class="wahl" data-a="schwund-ref" data-typ="gericht" data-id="${esc(g.id)}"><span class="haken"></span><span>${esc(g.name)} <small>${esc(t("tag.gericht"))}</small></span></button>`).join("")}
          ${artikelTreffer.map((a) => `<button type="button" class="wahl" data-a="schwund-ref" data-typ="artikel" data-name="${esc(a.name)}"><span class="haken"></span><span>${esc(a.name)}</span></button>`).join("")}
          ${vorgang === 1 ? gerichtTreffer.map((g) => `<button type="button" class="wahl" data-a="schwund-ref" data-typ="gericht" data-id="${esc(g.id)}"><span class="haken"></span><span>${esc(g.name)} <small>${esc(t("tag.gericht"))}</small></span></button>`).join("") : ""}
        </div>`}` : ""}
      ${f.ref ? `
      <h2>${esc(t("tag.wieViel"))}</h2>
      <div class="betrag">
        ${f.ref.typ === "gericht" ? "" : `<div class="periode">${EINHEITEN_JE_BASIS[basisVon(f.einheit)].map((e) => `<button type="button" class="${f.einheit === e ? "an" : ""}" data-a="schwund-einheit" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div>`}
        <input inputmode="decimal" data-f="schwund-menge" value="${esc(wertAnzeige(f.menge))}" placeholder="" aria-label="${esc(t("tag.wieViel"))}">
        ${f.ref.typ === "gericht" ? `<span class="einheit">${esc(t("tag.portionen"))}</span>` : ""}
      </div>
      ${probe !== null ? `<span class="marke">${esc(t("tag.wert"))} <b>${fmtEuro(probe, { dezimal: 2 })}</b></span>` : f.menge > 0 ? `<span class="marke offen">${esc(t("tag.keinPreisLang"))}</span>` : ""}
      ${vorgang === 1 ? `<h2>${esc(t("tag.wohin"))}</h2><div class="chips">${FRAKTIONEN.map((x) => `<button type="button" class="chip klein ${f.fraktion === x ? "an" : ""}" data-a="schwund-fraktion" data-wert="${x}">${esc(t("tag.fraktionen." + x))}</button>`).join("")}</div>` : ""}
      ${vorgang === 2 ? `<h2>${esc(t("tag.mahlzeit"))}</h2><div class="chips">${["fruehstueck", "mittag", "abend"].map((m) => `<button type="button" class="chip klein ${f.mahlzeit === m ? "an" : ""}" data-a="schwund-mahlzeit" data-wert="${m}">${esc(t("tag.mahlzeiten." + m))}</button>`).join("")}</div>` : ""}
      ${vorgang === 3 ? `<div class="feldzeile"><label>${esc(t("tag.wer"))}</label><input class="textfeld" data-f="schwund-person" value="${esc(f.person)}" placeholder="${esc(t("tag.werPlatzhalter"))}" autocomplete="off"></div>` : ""}
      ${vorgang === 1 ? `<div class="feldzeile"><label>${esc(t("tag.grund"))}</label><input class="textfeld" data-f="schwund-grund" value="${esc(f.grund)}" placeholder="${esc(t("tag.grundPlatzhalter"))}" autocomplete="off"></div>` : ""}
      <button type="button" class="knopf glut" data-a="schwund-speichern" ${f.menge > 0 ? "" : "disabled"}>${esc(t("tag.speichern"))}</button>` : ""}
      <button type="button" class="leise" data-a="schwund-abbruch">${esc(t("allgemein.abbrechen"))}</button>
    </div>`;
}

export function listenView(stand) {
  const z = listenZeitraum === "monat" ? monatsZeitraum() : zeitraumTage(7);
  const a = schwundAuswertung(stand, z);
  const eintraege = (stand.schwund || []).filter((e) => e.datum >= z.von && e.datum <= z.bis).slice().reverse();
  return `
    <div class="kopfband"><h1>${esc(t("listen.titel"))}</h1><div class="unter">${esc(stand.betrieb.name)}</div></div>
    <div class="inhalt">
      <div class="chips"><button type="button" class="chip ${listenZeitraum === "woche" ? "an" : ""}" data-a="listen-zeitraum" data-wert="woche">${esc(t("listen.woche"))}</button><button type="button" class="chip ${listenZeitraum === "monat" ? "an" : ""}" data-a="listen-zeitraum" data-wert="monat">${esc(t("listen.monat"))}</button></div>
      <div class="karte">
        <h2>${esc(t("listen.muell"))}</h2>
        <div class="gross">${fmtEuro(a.muellwert, { dezimal: 2 })}</div>
        ${a.portionen !== null ? `<div class="hinweis">${esc(t("listen.portionen", fmtZahl(a.portionen, a.portionen < 10 ? 1 : 0), fmtEuro(a.dbJePortion, { dezimal: 2 })))}</div>` : `<div class="hinweis">${esc(t("listen.portionenFehlen"))}</div>`}
        ${a.ohneWert ? `<span class="marke offen">${esc(t("listen.ohneWert", a.ohneWert))}</span>` : ""}
        ${Object.keys(a.jeArt).map((k) => `<div class="summenzeile"><span>${esc(t("tag.arten." + k))}</span><span class="wert">${fmtEuro(a.jeArt[k], { dezimal: 2 })}</span></div>`).join("")}
      </div>
      <div class="karte">
        <h2>${esc(t("listen.fraktionen"))}</h2>
        ${Object.keys(a.jeFraktion).length ? Object.keys(a.jeFraktion).map((k) => `<div class="summenzeile"><span>${esc(t("tag.fraktionen." + k))} <span class="marke">(${a.jeFraktion[k].anzahl})</span></span><span class="wert">${fmtEuro(a.jeFraktion[k].wert, { dezimal: 2 })}</span></div>`).join("") : `<div class="hinweis">${esc(t("listen.leer"))}</div>`}
      </div>
      <div class="karte">
        <h2>${esc(t("listen.personal"))}</h2>
        <div class="summenzeile"><span>${esc(t("listen.personalAnzahl"))}</span><span class="wert">${fmtZahl(a.personal.anzahl)}</span></div>
        <div class="summenzeile"><span>${esc(t("listen.personalSvev"))}</span><span class="wert">${fmtEuro(a.personal.svev, { dezimal: 2 })}</span></div>
        <div class="summenzeile"><span>${esc(t("listen.personalWaren"))}</span><span class="wert">${fmtEuro(a.personal.waren, { dezimal: 2 })}</span></div>
        <span class="marke">${esc(t("listen.svevStand", fmtEuro(SVEV_2026.tag, { dezimal: 2 })))}</span>
        ${a.eigen.anzahl ? `<div class="summenzeile"><span>${esc(t("listen.eigen"))}</span><span class="wert">${fmtZahl(a.eigen.anzahl)} · ${fmtEuro(a.eigen.waren, { dezimal: 2 })}</span></div><span class="marke">${esc(t("listen.eigenHinweis"))}</span>` : ""}
      </div>
      <div class="karte">
        <h2>${esc(t("listen.schwundliste"))}</h2>
        ${eintraege.length ? `<div class="liste eng">${eintraege.map((e) => `<div class="zeile ${e.storniert ? "storno" : ""}"><div class="oben"><div class="name">${esc(datumLesbar(e.datum))}<small>${esc(eintragText(e, stand))}</small></div><div style="text-align:right">${eintragBetrag(e, stand)}</div></div></div>`).join("")}</div>` : `<div class="hinweis">${esc(t("listen.leer"))}</div>`}
        <span class="marke">${esc(t("listen.amtHinweis"))}</span>
      </div>
    </div>
    ${nav("tag")}`;
}

function eintragText(e, stand) {
  const name = eintragName(e, stand); const menge = eintragMenge(e);
  return `${t("tag.arten." + e.art)} · ${name} · ${menge}${e.storniert ? ` · ${t("tag.storniert")}` : ""}`;
}

export function datumLesbar(iso) {
  const [j, m, d] = iso.split("-"); return `${d}.${m}.${j}`;
}

// ---------- Aktionen und Eingaben (von app.js aufgerufen) ----------
export function tagAktion(name, el, stand) {
  if (name === "schwund-neu") { form = leeresForm(); return true; }
  if (name === "tag-datum") { tagDatum = el.dataset.wert === heute() ? null : el.dataset.wert; form = null; return true; }
  if (name === "schwund-abbruch") { form = null; return true; }
  if (name === "listen-zeitraum") { listenZeitraum = el.dataset.wert; return true; }
  if (name === "schwund-storno") {
    const e = stand.schwund.find((x) => x.id === el.dataset.id); if (!e || e.storniert) return false;
    if (!confirm(t("tag.stornoFrage"))) return false;
    e.storniert = true; e.storniertZeit = new Date().toISOString(); return true; // nie löschen, nur kennzeichnen
  }
  if (!form) return false;
  if (name === "schwund-art") { form.art = el.dataset.wert; if (SCHWUND_ARTEN[form.art] !== 1 && form.ref?.typ === "artikel") form.ref = null; return true; }
  if (name === "schwund-ref") {
    if (el.dataset.typ === "artikel" && SCHWUND_ARTEN[form.art] !== 1) return false;
    if (el.dataset.typ === "gericht") form.ref = { typ: "gericht", id: el.dataset.id, name: stand.gerichte.find((g) => g.id === el.dataset.id)?.name || "" };
    else { const a = stand.artikel.find((x) => x.name === el.dataset.name); form.ref = { typ: "artikel", name: el.dataset.name }; form.einheit = a?.packung?.einheit || a?.einheit || "stk"; }
    form.suche = ""; return true;
  }
  if (name === "schwund-ref-weg") { form.ref = null; form.menge = null; return true; }
  if (name === "schwund-einheit") { form.menge = mengeUmrechnen(form.menge, form.einheit, el.dataset.wert); form.einheit = el.dataset.wert; return true; }
  if (name === "schwund-fraktion") { form.fraktion = el.dataset.wert; return true; }
  if (name === "schwund-mahlzeit") { form.mahlzeit = el.dataset.wert; return true; }
  if (name === "schwund-speichern") {
    if (!(form.menge > 0) || !form.ref || !form.art) return false;
    const vorgang = SCHWUND_ARTEN[form.art];
    if (vorgang !== 1 && form.ref.typ !== "gericht") return false;
    const gehoertDazu = form.ref.typ === "gericht" ? stand.gerichte.some((g) => g.id === form.ref.id) : stand.artikel.some((a) => a.name === form.ref.name);
    if (!gehoertDazu) { form = null; return true; } // Formular stammt aus einem anderen Laden – verwerfen
    const D = tagGewaehlt();
    const e = { id: uid(), datum: D, erfasst: new Date().toISOString(), art: form.art, vorgang, ref: form.ref, menge: form.menge,
      einheit: form.ref.typ === "gericht" ? "portion" : form.einheit, nacherfasst: D !== heute(), storniert: false };
    if (vorgang === 1) { e.fraktion = form.fraktion; if (form.grund.trim()) e.grund = form.grund.trim(); }
    if (vorgang === 2) e.mahlzeit = form.mahlzeit;
    if (vorgang === 3 && form.person.trim()) e.person = form.person.trim();
    e.wert = wertEintrag(e, stand); // Momentaufnahme zum Einkaufspreis von heute; spätere Preisänderungen ändern alte Einträge nicht
    stand.schwund.push(e); form = null; return "gespeichert";
  }
  return false;
}

export function tagEingabe(feld, wert, stand, wurzel = null) {
  if (feld === "umsatz") {
    const n = parseZahl(wert); const D = tagGewaehlt();
    // Ungültig oder leer: Notiz weg – eine halbe Zahl darf nie stehen bleiben (die Meldung kommt beim Verlassen des Feldes)
    if (n === null) tagesnotizLoeschen(stand, D, wurzel?.geraet || null);
    else tagesnotizSetzen(stand, D, n, { nacherfasst: D !== heute(), geraet: wurzel?.geraet || null });
    return false;
  }
  if (feld.startsWith("wert:")) return false; // wird erst beim Verlassen des Feldes übernommen (einmalig setzbar)
  if (!form) return false;
  if (feld === "schwund-suche") { form.suche = wert; return true; }
  if (feld === "schwund-menge") { const n = parseZahl(wert); form.menge = n !== null && n <= 100000 ? n : null; return false; }
  if (feld === "schwund-person") form.person = wert;
  if (feld === "schwund-grund") form.grund = wert;
  return false;
}
export const tagFormOffen = () => !!form;
export const tagFormVerwerfen = () => { form = null; };
export const tagFormGueltig = () => !!(form && form.menge > 0 && form.ref && form.art);

// Wert eines offenen Schwund-Eintrags nachtragen – beim Verlassen des Feldes, einmalig.
export function tagWertUebernehmen(feld, wert, stand) {
  if (!feld.startsWith("wert:")) return false;
  const e = stand.schwund.find((x) => x.id === feld.slice(5)); const n = parseZahl(wert);
  if (e && n !== null && n > 0) return schwundWertSetzen(e, n);
  return false;
}
