// Menütafel (18.10.2026), Stufe 2 ohne Server (Variante D der Serverfrage): Aus der Karte und den übernommenen Aktionen wird eine Tafel für einen
// Fernseher oder ein Tablet im Laden. Innen Uhrwerk: hier wird beschrieben, gerechnet und die Datei gebaut; die Bildschirme zeigen nur an.
//
// Ablauf: tafelBeschreibung(stand) → Seiten und Spalten nach Gruppen (Speisen, Beilagen, Getränke), Aktionen mit Laufzeit, Hinweise fürs Büro
//         tafelHtml(beschreibung) → EINE HTML-Datei, alles eingebettet (Texte, Fotos als data-URI, Systemschrift), Querformat 16:9
// Pflicht nach § 13 PAngV (Gaststätten): Endpreise (inkl. Umsatzsteuer; Gerichte tragen in der App den Bruttopreis), bei Getränken die
// Ausschankmenge. Getränke (18.10.2026): Die Menge kommt aus dem Feld getraenk.menge (js/getraenk_feld.js) – nicht mehr aus dem Namen; der Name
// liefert sie nur noch einmal bei der Migration. Fehlt sie, rät die App nicht – Hinweis im Büro.
// Gültigkeit: unten steht „Stand: Datum Uhrzeit“; abgelaufene Aktionen blendet die Datei anhand der Uhr des Anzeigegeräts selbst aus
// (tafelAktionSichtbar wird so, wie sie hier steht, in die Datei eingebettet – darum ES5 ohne Bezüge nach außen, für alte Fernseh-Browser).
import { esc, fmtEuro, heute, heuteGeschaeft, GESCHAEFTSTAG_BIS_STUNDE, uid } from "./util.js";
import { tIn, RTL, SPRACHEN } from "./i18n.js";
import { gerichtBildQuelle } from "./bilder.js";
import { tagPlus, wochentag } from "./engine.js";
import { kurzName } from "./haltbar.js";
import { getraenkVon, literAusText, literText, nameMitMenge } from "./getraenk_feld.js"; // Getränke (18.10.2026): Ausschankmenge aus dem Feld
import { aktionVorschlag, aktionBilanz, PLAN_TAGE } from "./aktion_plan.js"; // Aktion planen (18.10.2026): Zeitraum-Vorschlag und Bilanz

export const TAFEL_GRUPPEN = ["speisen", "beilagen", "getraenke"];
export const TAFEL_SEKUNDEN = [8, 12, 20, 30];   // Auswahl im Büro (gespeichert werden 5–120 s, store.js)
export const ZEILEN_JE_SPALTE = 6;                // so viele Gerichte stehen in einer Spalte (lesbar aus 3–4 m auf 40–55 Zoll, Annahme)
export const SPALTEN_JE_SEITE = 2;
export const AKTIONEN_JE_SEITE = 3;
const GRUPPE_JE_KLASSE = { haupt: "speisen", gross: "speisen", kleinigkeit: "beilagen", getraenk: "getraenke" };

// ---------- Einstellungen ----------
export function tafelEinstellung(stand) {
  const t = stand?.tafel || {};
  const gruppen = TAFEL_GRUPPEN.filter((g) => Array.isArray(t.gruppen) && t.gruppen.includes(g));
  return { sekunden: Number.isInteger(t.sekunden) && t.sekunden >= 5 && t.sekunden <= 120 ? t.sekunden : 12, gruppen: gruppen.length ? gruppen : [...TAFEL_GRUPPEN],
    aktionen: t.aktionen !== false, sprache: SPRACHEN.includes(t.sprache) ? t.sprache : "de" };
}
// Schreiben (Büro): feld „sekunden“ (Zahl), „gruppe“ (an/aus, mindestens eine bleibt), „aktionen“ (an/aus), „sprache“ (Code). Rückgabe: geändert?
export function tafelSetzen(stand, feld, wert) {
  const e = tafelEinstellung(stand); const vorher = JSON.stringify(e);
  if (feld === "sekunden") { const n = Math.round(Number(wert)); if (n >= 5 && n <= 120) e.sekunden = n; }
  else if (feld === "gruppe" && TAFEL_GRUPPEN.includes(wert)) { const an = e.gruppen.includes(wert); if (!an) e.gruppen = TAFEL_GRUPPEN.filter((g) => g === wert || e.gruppen.includes(g)); else if (e.gruppen.length > 1) e.gruppen = e.gruppen.filter((g) => g !== wert); }
  else if (feld === "aktionen") e.aktionen = typeof wert === "boolean" ? wert : !e.aktionen;
  else if (feld === "sprache" && SPRACHEN.includes(wert)) e.sprache = wert;
  if (JSON.stringify(e) === vorher && stand.tafel) return false;
  stand.tafel = e; return true;
}

// ---------- Gerichte ----------
export const tafelGruppe = (g) => GRUPPE_JE_KLASSE[g?.klasse] || "speisen";
// Ausschankmenge aus Text: „Cola 0,33 l“, „Wasser 0.5l“, „Bier 500 ml“, „Saft 20 cl“, „Ayran 0,25 Liter“ → „0,33 l“ … (wie geschrieben, Komma, kleine Einheit)
const MENGE_RE = /(\d+(?:[.,]\d+)?)\s*(ml|cl|liter|l)(?![a-zäöüß])/i;
export function mengeAusText(text) {
  const m = MENGE_RE.exec(String(text || "")); if (!m) return null;
  const zahl = m[1].replace(".", ","); if (!(Number(m[1].replace(",", ".")) > 0)) return null;
  const e = m[2].toLowerCase(); return `${zahl} ${e === "liter" ? "l" : e}`;
}
// Getränke (18.10.2026): { menge, imNamen, anders } aus dem Feld getraenk.menge. imNamen: der Name nennt dieselbe Menge (dann nicht doppelt
// anschreiben); anders: der Name nennt eine andere Menge als das Feld (das Feld gilt, Hinweis im Büro). menge null = fehlt.
export function ausschankMenge(g) {
  const x = getraenkVon(g); const feld = x?.menge ?? null; const imName = literAusText(g?.name);
  if (!feld) return { menge: null, imNamen: false, anders: false };
  return { menge: literText(feld), imNamen: imName !== null && Math.abs(imName - feld) < 1e-6, anders: imName !== null && Math.abs(imName - feld) >= 1e-6 };
}

// ---------- Aktionen ----------
// Gerichte einer Aktion, die es (noch) gibt; Name = Kurznamen mit „+“ (wie der Teilen-Text), Getränke mit Ausschankmenge (§ 13 PAngV)
const aktionGerichte = (stand, a) => (a.gerichte || []).map((id) => (stand.gerichte || []).find((g) => g.id === id)).filter(Boolean);
export const aktionName = (stand, a) => aktionGerichte(stand, a).map((g) => nameMitMenge(g, kurzName(g.name))).join(" + ");
// Läuft (oder kommt noch): nicht beendet, Ende nicht vorbei (oder „bis Ware weg“ ohne Datum), alle Gerichte da
const laeuftNoch = (a, heuteTag) => !a.entfernt && (!a.bis || a.bis >= heuteTag);
export function aktiveAktionen(stand, { heuteTag = heuteGeschaeft() } = {}) {
  return (stand.aktionen || []).filter((a) => laeuftNoch(a, heuteTag) && aktionGerichte(stand, a).length === (a.gerichte || []).length && a.preis > 0)
    .sort((x, y) => x.von.localeCompare(y.von) || String(x.bis || "9999").localeCompare(String(y.bis || "9999")) || String(x.erfasst || "").localeCompare(String(y.erfasst || "")));
}
// Übernehmen (Büro „Aktionen & Haltbarkeit“): art „abverkauf“ (ein Gericht) oder „kombi“ (2–4 Gerichte).
// Aktion planen (18.10.2026): KEINE feste Laufzeit mehr. Der Zeitraum kommt vom Wirt (von, bis, ende "datum" | "ware" = bis Ware weg) – er hat
// den Vorschlag der App gesehen (plan: Vorschlag und Begründung, wie gezeigt). Ohne Angabe gilt der Vorschlag (aktionVorschlag); lässt er sich nicht
// rechnen (Gericht ohne Rezept), eine Woche ab sofort. Nie eine Aktion für Ware mit Verbrauchsdatum (Rückgabe null).
// Gleiche laufende Aktion (gleiche Gerichte, gleicher Preis) wird nicht doppelt angelegt – Rückgabe dann die vorhandene.
export function aktionUebernehmen(stand, { art, gerichte, preis, statt = null, von = null, bis = null, ende = null, ware = null, plan = null }, { heuteTag = heuteGeschaeft(), jetzt = new Date().toISOString() } = {}) {
  const ids = [...new Set((gerichte || []).filter((id) => (stand.gerichte || []).some((g) => g.id === id)))];
  if (!ids.length || !(preis > 0)) return null;
  const artSauber = art === "abverkauf" ? "abverkauf" : "kombi";
  const vs = aktionVorschlag(stand, { art: artSauber, gerichte: ids, preis, ware }, { heuteTag });
  if (!vs.moeglich && vs.grund === "verbrauch") return null;
  const v = von && von >= heuteTag ? von : vs.moeglich ? vs.von : heuteTag;
  const e = ende === "ware" || ende === "datum" ? ende : vs.moeglich ? vs.ende : "datum";
  let b = bis && bis >= v ? bis : null;
  if (!b && !(e === "ware" && bis === "")) b = vs.moeglich && vs.bis >= v ? vs.bis : tagPlus(v, PLAN_TAGE - 1); // bis "" + „bis Ware weg“ = ohne letztes Datum
  const p = Math.round(preis * 100) / 100; const schluessel = [...ids].sort().join("|");
  const da = aktiveAktionen(stand, { heuteTag }).find((a) => [...a.gerichte].sort().join("|") === schluessel && a.preis === p);
  if (da) return da;
  const vorschlag = plan && plan.von ? plan : vs.moeglich ? { von: vs.von, bis: vs.bis, ende: vs.ende, satz: vs.satz, erwartung: Math.round(vs.erwartung.mehrAnteil * 10000) / 10000, quelle: vs.erwartung.quelle } : null;
  const a = { id: "akt-" + uid(), art: artSauber, gerichte: ids, preis: p, statt: statt > p ? Math.round(statt * 100) / 100 : null, von: v, bis: b, ende: e,
    ...(ware ? { ware: String(ware) } : {}), ...(vorschlag ? { plan: { ...vorschlag, erstellt: jetzt } } : {}), erfasst: jetzt, entfernt: false };
  stand.aktionen = [...(stand.aktionen || []), a];
  return a;
}
// Aktion planen (18.10.2026): Zeitraum einer laufenden oder kommenden Aktion ändern (der Wirt bespricht und entscheidet). Läuft sie schon, bleibt der
// Start; sonst frühestens heute. bis ≥ von (und nicht vor heute); „bis Ware weg“ darf ohne Datum sein. Rückgabe: die neue Aktion oder null (ungültig/unverändert).
export function aktionZeitraumSetzen(stand, id, { von, bis, ende }, { heuteTag = heuteGeschaeft(), jetzt = new Date().toISOString() } = {}) {
  const i = (stand.aktionen || []).findIndex((a) => a.id === id && laeuftNoch(a, heuteTag)); if (i < 0) return null;
  const a = stand.aktionen[i]; const TAG = /^\d{4}-\d{2}-\d{2}$/;
  const e = ende === "ware" ? "ware" : "datum";
  const v = a.von <= heuteTag ? a.von : TAG.test(von || "") && von >= heuteTag ? von : a.von;
  const b = TAG.test(bis || "") ? bis : null;
  if (!b && e !== "ware") return null;
  if (b && (b < v || b < heuteTag)) return null;
  if (v === a.von && b === a.bis && e === a.ende) return null;
  const neu = { ...a, von: v, bis: b, ende: e, geaendertZeit: jetzt };
  stand.aktionen = stand.aktionen.map((x, j) => (j === i ? neu : x));
  return neu;
}
// Beenden: bleibt in der Liste (beim Zusammenführen gewinnt „beendet“), steht nicht mehr auf der Tafel. Aktion planen (18.10.2026): mit Bilanz.
export function aktionBeenden(stand, id, { jetzt = new Date().toISOString(), heuteTag = heuteGeschaeft(new Date(jetzt)) } = {}) {
  const i = (stand.aktionen || []).findIndex((a) => a.id === id && !a.entfernt); if (i < 0) return false;
  const beendet = { ...stand.aktionen[i], entfernt: true, entferntZeit: jetzt };
  let bilanz = null; try { bilanz = aktionBilanz(stand, beendet, { heuteTag, jetzt }); } catch (e) { console.warn("Bilanz:", e); }
  stand.aktionen = stand.aktionen.map((a, j) => (j === i ? { ...beendet, ...(bilanz ? { bilanz } : {}) } : a));
  return true;
}

// Eingebettet in die Tafel-Datei: Ist die Aktion an diesem Gerät gerade gültig? Geschäftstag bis 4 Uhr (wie die App, util.js).
// ES5, keine Bezüge nach außen – der Text dieser Funktion steht 1:1 in der Datei.
export function tafelAktionSichtbar(a, jetzt) {
  var d = new Date(jetzt);
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  var z = function (n) { return (n < 10 ? "0" : "") + n; };
  var tag = d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  return (!a.von || a.von <= tag) && (!a.bis || tag <= a.bis);
}
export const TAFEL_STUNDE = 4; // muss GESCHAEFTSTAG_BIS_STUNDE (util.js) sein – geprüft in tests/tafel.test.mjs
export const tafelStundeStimmt = () => TAFEL_STUNDE === GESCHAEFTSTAG_BIS_STUNDE;

// ---------- Beschreibung ----------
const euro = (n) => fmtEuro(n, { dezimal: 2 });
const z2 = (n) => String(n).padStart(2, "0");
export const tafelDatum = (sprache, iso) => { const l = tIn(sprache, "aktionen.wt"); return `${(Array.isArray(l) && l[wochentag(iso)]) || ""} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`.trim(); };
export const tafelStandText = (jetzt) => { const d = new Date(jetzt); return `${z2(d.getDate())}.${z2(d.getMonth() + 1)}.${d.getFullYear()} ${z2(d.getHours())}:${z2(d.getMinutes())}`; };
// Gleichmäßig auf Spalten verteilen: 9 → 5 + 4 (nicht 6 + 3)
function stuecke(liste, max) { const n = Math.ceil(liste.length / max); const out = []; let i = 0; for (let k = 0; k < n; k++) { const g = Math.ceil((liste.length - i) / (n - k)); out.push(liste.slice(i, i + g)); i += g; } return out; }

// Laufzeit auf der Tafel: „bis Sa 24.10.“, „Di 20.10. – So 25.10.“; bis Ware weg: „solange Vorrat, längstens bis …“ / „solange Vorrat reicht“ (+ „ab …“)
function laufText(T, sp, a, heuteTag) {
  const kommt = a.von > heuteTag;
  if (a.ende === "ware") { const r = a.bis ? T("solangeBis", tafelDatum(sp, a.bis)) : T("solange"); return kommt ? `${T("ab", tafelDatum(sp, a.von))}, ${r}` : r; }
  return kommt ? T("abBis", tafelDatum(sp, a.von), tafelDatum(sp, a.bis)) : T("bis", tafelDatum(sp, a.bis));
}
export function tafelBeschreibung(stand, { heuteTag = heuteGeschaeft(), jetzt = new Date().toISOString(), einstellung = tafelEinstellung(stand) } = {}) {
  const sp = einstellung.sprache; const T = (k, ...a) => tIn(sp, "tafel.inhalt." + k, ...a);
  const hinweise = [];
  const bild = (g) => { const q = gerichtBildQuelle(g); return q.eigen ? { ...q, meta: g.fotoMeta || null } : q; };
  const gruppen = einstellung.gruppen.map((gruppe) => {
    const eintraege = [];
    for (const g of stand.gerichte || []) {
      if (tafelGruppe(g) !== gruppe) continue;
      if (!(typeof g.preis === "number" && g.preis > 0)) { hinweise.push({ art: "ohnePreis", id: g.id, name: g.name }); continue; }
      const m = gruppe === "getraenke" ? ausschankMenge(g) : { menge: null, imNamen: false };
      if (gruppe === "getraenke" && !m.menge) hinweise.push({ art: "mengeFehlt", id: g.id, name: g.name });
      if (gruppe === "getraenke" && m.anders) hinweise.push({ art: "mengeAnders", id: g.id, name: g.name }); // Getränke (18.10.2026): Feld gilt, Name sagt etwas anderes
      eintraege.push({ id: g.id, name: String(g.name || ""), preis: g.preis, preisText: euro(g.preis), menge: m.imNamen ? null : m.menge, bild: bild(g) });
    }
    return { gruppe, titel: T("gruppen." + gruppe), eintraege };
  }).filter((x) => x.eintraege.length);
  const aktionen = !einstellung.aktionen ? [] : aktiveAktionen(stand, { heuteTag }).map((a) => {
    const gs = aktionGerichte(stand, a);
    const statt = a.statt > a.preis ? a.statt : null;
    return { id: a.id, art: a.art, name: aktionName(stand, a), preis: a.preis, preisText: euro(a.preis), statt, stattText: statt ? T("statt", euro(statt)) : "",
      von: a.von, bis: a.bis || "", laufText: laufText(T, sp, a, heuteTag),
      gerichte: gs.map((g) => ({ id: g.id, name: g.name, bild: bild(g) })) };
  });
  for (const a of stand.aktionen || []) if (laeuftNoch(a, heuteTag) && aktionGerichte(stand, a).length !== (a.gerichte || []).length) hinweise.push({ art: "aktionOhneGericht", id: a.id, name: aktionName(stand, a) });
  const seiten = [];
  for (const teil of stuecke(aktionen, AKTIONEN_JE_SEITE)) seiten.push({ art: "aktionen", aktionen: teil });
  const spalten = []; for (const g of gruppen) for (const teil of stuecke(g.eintraege, ZEILEN_JE_SPALTE)) spalten.push({ gruppe: g.gruppe, titel: g.titel, eintraege: teil });
  for (let i = 0; i < spalten.length; i += SPALTEN_JE_SEITE) seiten.push({ art: "karte", spalten: spalten.slice(i, i + SPALTEN_JE_SEITE) });
  const klein = stand.betrieb?.kleinunternehmer === true;
  return { laden: String(stand.betrieb?.name || "").trim(), beispiel: stand.beispiel === true, sprache: sp, rtl: RTL.has(sp), sekunden: einstellung.sekunden,
    jetzt, heuteTag, standText: T("stand", tafelStandText(jetzt)), endpreise: T(klein ? "endpreiseOhne" : "endpreise"), aktionTitel: T("aktion"),
    beispielText: stand.beispiel === true ? tIn(sp, "beispiel.export") : "", gruppen, aktionen, seiten, hinweise, leer: !seiten.length, leerText: T("leer") };
}

// ---------- Datei ----------
// Bild-Schlüssel: gleiche Quelle = ein eingebettetes Bild (ein Foto für mehrere Gerichte nur einmal in der Datei)
export const bildSchluessel = (b) => (!b ? null : b.eigen ? "eigen:" + b.eigen : b.foto ? "foto:" + b.foto : b.pikto ? "pikto:" + b.pikto : null);
const bildPfad = (b) => (b?.foto ? `foto/${b.foto}.webp` : b?.pikto ? `bilder/${b.pikto}.svg` : null);
// Alle Bilder, die die Tafel braucht (je Schlüssel einmal), mit Quelle – für tafelBilder
export function tafelBildListe(b) {
  const m = new Map(); const dazu = (x) => { const k = bildSchluessel(x); if (k && !m.has(k)) m.set(k, x); };
  for (const g of b.gruppen) for (const e of g.eintraege) dazu(e.bild);
  for (const a of b.aktionen) for (const g of a.gerichte) dazu(g.bild);
  return [...m.entries()].map(([schluessel, bild]) => ({ schluessel, bild }));
}

const CSS = (farben) => `*{box-sizing:border-box;margin:0;padding:0}html{font-size:1vw;background:${farben.tinte}}@media (min-aspect-ratio:16/9){html{font-size:1.7778vh}}
body{background:${farben.tinte};color:${farben.weiss};font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",Arial,sans-serif;overflow:hidden;height:100vh;cursor:none}
[hidden]{display:none!important}
#tafel{position:absolute;left:50%;top:50%;width:100rem;height:56.25rem;-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);background:${farben.salbeiTief};overflow:hidden}
.seite{display:none;position:absolute;left:0;top:0;right:0;bottom:0;padding:3rem 3.5rem 0}.seite.an{display:block}
.kopf{display:-webkit-box;display:flex;-webkit-box-align:center;align-items:center;-webkit-box-pack:justify;justify-content:space-between;height:5rem;border-bottom:.25rem solid ${farben.holzTief}}
.kopf h1{font-size:3.4rem;font-weight:800;letter-spacing:-.02em}.kopf .laden{font-size:2rem;color:${farben.holz};font-weight:700}
.marke{background:${farben.glut};color:${farben.tinteDunkel};border-radius:1rem;padding:.4rem 1.6rem;font-size:3rem;font-weight:900}
.spalten{display:-webkit-box;display:flex;height:42.5rem;padding-top:1.5rem}.spalte{-webkit-box-flex:1;flex:1 1 0;min-width:0;padding:0 1.5rem}.spalte{max-width:60rem}.spalte+.spalte{border-left:.15rem solid ${farben.lehm}}
[dir=rtl] .spalte+.spalte{border-left:0;border-right:.15rem solid ${farben.lehm}}
.spalte h2{font-size:2.6rem;color:${farben.holz};font-weight:800;margin-bottom:.8rem}
.zeile{display:-webkit-box;display:flex;-webkit-box-align:center;align-items:center;height:6.1rem;border-bottom:.1rem solid rgba(255,253,248,.18)}
.zeile img,.zeile .ohne{width:7.2rem;height:5.4rem;border-radius:.8rem;-o-object-fit:cover;object-fit:cover;background:${farben.papier};-webkit-box-flex:0;flex:none}
.zeile .name{-webkit-box-flex:1;flex:1 1 auto;min-width:0;font-size:2.35rem;font-weight:700;line-height:1.15;padding:0 1.4rem;overflow:hidden}
.zeile .menge{display:block;font-size:1.7rem;font-weight:600;color:${farben.holz}}
.preis{font-size:2.7rem;font-weight:900;color:${farben.gelbHell};white-space:nowrap;font-variant-numeric:tabular-nums}
.aktionen{display:-webkit-box;display:flex;height:42.5rem;padding-top:2rem}
.aktion{-webkit-box-flex:1;flex:1 1 0;min-width:0;margin:0 1.2rem;background:${farben.papier};color:${farben.tinte};border-radius:2rem;border:.5rem solid ${farben.glut};padding:1.8rem;display:-webkit-box;display:flex;-webkit-box-orient:vertical;flex-direction:column}
.aktion .bilder{display:-webkit-box;display:flex;height:15rem}.aktion .bilder img{-webkit-box-flex:1;flex:1 1 0;min-width:0;height:15rem;-o-object-fit:cover;object-fit:cover;border-radius:1rem;background:${farben.weiss}}.aktion .bilder img+img{margin-left:.8rem}.aktion .bilder img:only-child{-o-object-fit:contain;object-fit:contain}
.aktion h2{font-size:2.8rem;font-weight:800;line-height:1.15;margin-top:1.4rem;-webkit-box-flex:1;flex:1 1 auto}
.aktion .preis{color:${farben.kupferDunkel};font-size:5rem}.aktion .statt{font-size:2rem;color:${farben.tinteWeich};text-decoration:line-through}
.aktion .lauf{margin-top:.8rem;font-size:2.4rem;font-weight:800;background:${farben.salbeiTief};color:${farben.weiss};border-radius:.8rem;padding:.4rem 1.2rem;-ms-flex-item-align:start;align-self:flex-start}
.aktionen.eins .aktion{-webkit-box-orient:horizontal;flex-direction:row;-webkit-box-align:center;align-items:center}.aktionen.eins .bilder{width:52rem;height:34rem;-webkit-box-flex:0;flex:none}.aktionen.eins .bilder img{height:34rem}
.aktionen.eins .text{padding-left:2.4rem;-webkit-box-flex:1;flex:1 1 auto;min-width:0}.aktionen.eins h2{font-size:3.6rem;margin-top:0}.aktionen.eins .preis{font-size:7rem}
.fuss{position:absolute;left:3.5rem;right:3.5rem;bottom:1.6rem;font-size:1.45rem;color:${farben.holz};display:-webkit-box;display:flex;-webkit-box-pack:justify;justify-content:space-between}
.beispiel{color:${farben.gelbHell};font-weight:800}.leer{font-size:3rem;padding-top:10rem;text-align:center}`;
// Farben aus css/tokens.css (Kräuter & Kupfer, Sanji 15.10.2026) – fest übernommen, weil die Datei ohne die App läuft.
// Kontrast (WCAG): Weiß auf Salbei-tief 10,6:1; Preis-Gelb (Kurve Prognose) auf Salbei-tief 8,5:1; Kupfer-dunkel auf Papier 6,3:1.
export const TAFEL_FARBEN = { tinte: "#1F2A24", tinteDunkel: "#1F2A24", tinteWeich: "#55604F", weiss: "#FFFDF8", salbeiTief: "#2E4034", holz: "#DDC9AD", holzTief: "#C9A87C",
  lehm: "#78583F", glut: "#C97A3E", papier: "#F5EBDD", kupferDunkel: "#8A4C20", gelbHell: "#F6D686" };

// Seitenwechsel, Ablauf der Aktionen, Vollbild per Tipp. ES5 für alte Fernseh-Browser. Der Text von tafelAktionSichtbar wird eingesetzt.
const SKRIPT = (sichtbar) => `(function(){var sichtbar=${sichtbar};var T=document.getElementById("tafel");var sek=Number(T.getAttribute("data-sekunden"))||12;var i=0;
var alle=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
function pruefen(){var j=Date.now();alle(".aktion").forEach(function(a){a.hidden=!sichtbar({von:a.getAttribute("data-von"),bis:a.getAttribute("data-bis")},j)});
alle('.seite[data-art="aktionen"]').forEach(function(s){var leer=!s.querySelector(".aktion:not([hidden])");s.setAttribute("data-leer",leer?"1":"")})}
function zeigen(){var S=alle(".seite").filter(function(s){return s.getAttribute("data-leer")!=="1"});if(!S.length)S=alle(".seite").slice(-1);i=i%S.length;alle(".seite").forEach(function(s){if(s===S[i])s.className+=/\\ban\\b/.test(s.className)?"":" an";else s.className=s.className.replace(/\\s*\\ban\\b/g,"")})}
pruefen();zeigen();setInterval(function(){i++;pruefen();zeigen()},sek*1000);
document.addEventListener("click",function(){var d=document.documentElement,f=d.requestFullscreen||d.webkitRequestFullscreen;if(f&&!(document.fullscreenElement||document.webkitFullscreenElement)){try{var p=f.call(d);if(p&&p.catch)p.catch(function(){})}catch(e){}}})})();`;

// HTML der Tafel. bilder: { schluessel: data-URI }. eingebettet: true = nur data-URIs (Datei zum Teilen, keine Verweise nach außen);
// false = fehlende Bilder als Pfad der App (Vorschau im Büro). skript: false für die Vorschau (die App erlaubt kein eingebettetes Skript).
// nurSeite: Nummer der Seite (Vorschau einer Seite) oder null (alle Seiten, die erste ist zu sehen).
export function tafelHtml(b, { bilder = {}, eingebettet = true, skript = true, nurSeite = null } = {}) {
  const src = (bild) => { const k = bildSchluessel(bild); const d = k ? bilder[k] : null; if (d && /^data:/.test(d)) return d; return eingebettet ? null : bildPfad(bild); };
  const img = (bild, alt = "") => { const s = src(bild); return s ? `<img src="${esc(s)}" alt="${esc(alt)}">` : `<span class="ohne"></span>`; };
  const fuss = `<div class="fuss"><span>${esc(b.endpreise)}${b.beispielText ? ` · <b class="beispiel">${esc(b.beispielText)}</b>` : ""}</span><span>${esc(b.standText)}</span></div>`;
  const kopf = (links, rechts = "") => `<div class="kopf">${links}${rechts}</div>`;
  const seite = (s, i, an) => {
    if (s.art === "aktionen") {
      const karte = (a) => `<article class="aktion" data-von="${esc(a.von)}" data-bis="${esc(a.bis)}"><div class="bilder">${a.gerichte.slice(0, 3).map((g) => img(g.bild, g.name)).join("")}</div>
<div class="text"><h2>${esc(a.name)}</h2><p class="preis">${esc(a.preisText)}</p>${a.stattText ? `<p class="statt">${esc(a.stattText)}</p>` : ""}<p class="lauf">${esc(a.laufText)}</p></div></article>`;
      return `<section class="seite${an ? " an" : ""}" data-art="aktionen" data-seite="${i}">${kopf(`<span class="marke">${esc(b.aktionTitel)}</span>`, `<span class="laden">${esc(b.laden)}</span>`)}<div class="aktionen${s.aktionen.length === 1 ? " eins" : ""}">${s.aktionen.map(karte).join("")}</div>${fuss}</section>`;
    }
    const zeile = (e) => `<div class="zeile">${img(e.bild, e.name)}<span class="name">${esc(e.name)}${e.menge ? `<span class="menge">${esc(e.menge)}</span>` : ""}</span><span class="preis">${esc(e.preisText)}</span></div>`;
    return `<section class="seite${an ? " an" : ""}" data-art="karte" data-seite="${i}">${kopf(`<h1>${esc(b.laden)}</h1>`)}<div class="spalten">${s.spalten.map((sp) => `<div class="spalte"><h2>${esc(sp.titel)}</h2>${sp.eintraege.map(zeile).join("")}</div>`).join("")}</div>${fuss}</section>`;
  };
  const liste = nurSeite === null ? b.seiten.map((s, i) => seite(s, i, i === 0)) : b.seiten[nurSeite] ? [seite(b.seiten[nurSeite], nurSeite, true)] : [];
  const inhalt = liste.length ? liste.join("\n") : `<section class="seite an" data-art="leer">${kopf(`<h1>${esc(b.laden)}</h1>`)}<p class="leer">${esc(b.leerText)}</p>${fuss}</section>`;
  return `<!doctype html>
<html lang="${esc(b.sprache)}" dir="${b.rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(b.laden || b.aktionTitel)}</title><style>${CSS(TAFEL_FARBEN)}</style></head>
<body><main id="tafel" data-sekunden="${b.sekunden}" data-stand="${esc(b.jetzt)}">
${inhalt}
</main>${skript ? `<script>${SKRIPT(tafelAktionSichtbar.toString())}</script>` : ""}</body></html>`;
}

// Dateiname: menuetafel-<laden>-JJJJ-MM-TT.html
export function tafelDateiName(b) {
  const slug = String(b.laden || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  return `menuetafel-${slug ? slug + "-" : ""}${heute(new Date(b.jetzt))}.html`;
}
// Die Datei zum Teilen: { name, text, typ } – eine einzige HTML-Datei, alles eingebettet
export const tafelDatei = (b, bilder) => ({ name: tafelDateiName(b), text: tafelHtml(b, { bilder, eingebettet: true, skript: true }), typ: "text/html;charset=utf-8" });

// ---------- Bilder einbetten ----------
// lesen(bild) → Promise<data-URI | null>. Im Browser: Fotos und Piktogramme der App über fetch, eigene Fotos aus der Ablage (verkleinert).
// Fehlt ein Bild, bleibt der Platz leer – die Tafel funktioniert trotzdem.
export async function tafelBilder(b, { lesen = tafelBildLesen } = {}) {
  const out = {};
  for (const { schluessel, bild } of tafelBildListe(b)) { try { const d = await lesen(bild); if (typeof d === "string" && d.startsWith("data:")) out[schluessel] = d; } catch (_) { /* Platz bleibt leer */ } }
  return out;
}
const alsDataUri = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
async function verkleinert(blob, max = 640) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return alsDataUri(blob);
  const bm = await createImageBitmap(blob); const f = Math.min(1, max / Math.max(bm.width, bm.height));
  const c = document.createElement("canvas"); c.width = Math.round(bm.width * f); c.height = Math.round(bm.height * f);
  c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height); bm.close?.(); return c.toDataURL("image/jpeg", 0.82);
}
export async function tafelBildLesen(bild) {
  if (bild?.eigen) { const { holen } = await import("./ablage.js"); const blob = bild.meta ? await holen(bild.meta) : null; if (blob) return verkleinert(blob); if (!bild.pikto) return null; bild = { pikto: bild.pikto }; }
  const pfad = bildPfad(bild); if (!pfad || typeof fetch !== "function") return null;
  const r = await fetch(pfad); if (!r.ok) return null;
  return alsDataUri(await r.blob());
}
