// Bestand (17.10.2026): Büro-Bereich „Lager & Bestellen“. Oben ein Satz (bestandUhrzeit), darunter „Bestellen“ je Lieferant mit Teilen-Knopf,
// „Lager jetzt“ (Bestand, Reichweite, Wert, Sicherheit in einfachen Wörtern) und die Einstellungen (Tage, Puffer, Mindestbestand je Ware).
// Rechnen tut nur js/bestand.js; hier stehen Aufbau, Texte und data-Attribute. Nur vorhandene Klassen der Büro-Bildschirme, kein eigenes CSS.
// Personal-Modus: der Bereich ist dort nicht erreichbar (modus.js lässt nur Personal, Müll, Kühlung, Putzen zu).
import { t, einheitLabel, artikelText } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, parseZahl, wertAnzeige } from "../util.js";
import { bestandStand, bestellVorschlag, bestandUhrzeit, bestellText, lagerSetzen, mindestbestandSetzen } from "../bestand.js";
import { datumLesbar } from "./tag.js";
import { nav } from "./nav.js";
import { mengeBasisText, gebindeAnzahl, textTeilen } from "./bausteine.js"; // Trennung (17.10.2026)

let mindestOffen = false;  // Liste „Mindestbestand je Ware“ aufgeklappt
let entwurf = {};          // Mindestbestand: Warenname → getippter Text (bis „Speichern“)

export const bestandKennung = () => (mindestOffen ? "mindest" : "");
export function bestandZuruecksetzen() { mindestOffen = false; entwurf = {}; }
// Zurück-Geste: erst die Mindestbestand-Liste zu; false = den Bereich verlassen
export function bestandZurueck() { if (!mindestOffen) return false; mindestOffen = false; entwurf = {}; return true; }

export const TAGE_WAHL = [3, 5, 7, 10, 14];
export const PUFFER_WAHL = [0, 1, 2, 3, 5];

const was = (text) => `<p class="inv-was"><b>${esc(t("inventur.wasHeisst"))}</b> ${esc(text)}</p>`;
const euro = (v, ca = true) => (v === null || v === undefined ? t("inventur.preisFehlt") : (ca ? "≈ " : "") + fmtEuro(v, { dezimal: Math.abs(v) < 100 ? 2 : 0 }));
const kurz = (iso) => datumLesbar(iso).slice(0, 6);
// Trennung (17.10.2026): mengeText (jetzt mengeBasisText) und gebindeAnzahl wohnen in ./bausteine.js
const mengeText = (menge, basis) => mengeBasisText(menge, basis);
const gebindeText = (anzahl, art, menge, basis) => (anzahl !== null && art !== "lose" ? gebindeAnzahl(anzahl, art) : mengeText(menge, basis));
const reichtText = (w) => (w.schnitt === null ? t("bestand.verbrauchUnbekannt") : !(w.schnitt > 0) ? t("bestand.keinVerbrauch") : w.lange ? t("bestand.reichtLange") : (w.reichweite ?? 0) < 1 ? t("bestand.reichtKurz") : t("bestand.reicht", Math.floor(w.reichweite)));
const dringendText = (z) => (z.dringend === "spaeter" && z.bestellenAm ? t("bestand.dringend.spaeter", kurz(z.bestellenAm)) : t("bestand.dringend." + z.dringend));
function lueckeText(l) {
  if (l.art === "inventurAlt") return t("bestand.luecken.inventurAlt", l.tage);
  if (l.art === "verkaufFehlt") return t("bestand.luecken.verkaufFehlt", l.anzahl);
  return t("bestand.luecken." + l.art);
}

export function bestandView(stand) {
  const kopf = `<div class="kopfband"><h1>${esc(t("bestand.titel"))}</h1><div class="unter">${esc(t("bestand.unter"))}</div></div>`;
  const bs = bestandStand(stand);
  if (bs.ohneInventur) return `${kopf}<div class="inhalt"><div class="karte hinweisgelb"><p>${esc(t("bestand.ohneInventur"))}</p>
      <button type="button" class="knopf zweit" data-a="nav" data-wert="inventur">${esc(t("bestand.inventurKnopf"))}</button></div>${einstellungenView(stand, bs)}</div>${nav("bestand", { schnell: false })}`;
  const v = bestellVorschlag(stand, { bs }); const uhr = bestandUhrzeit(stand);
  const oben = uhr ? `<div class="karte ${uhr.ton === "rot" ? "hinweisrot" : "hinweisgelb"}"><h2>${esc(uhr.text)}</h2></div>` : `<div class="karte"><h2>${esc(t("bestand.allesGut"))}</h2></div>`;
  return `${kopf}<div class="inhalt">${oben}${bestellenView(stand, v)}${lagerView(bs)}${hinweiseView(bs)}${einstellungenView(stand, bs)}</div>${nav("bestand", { schnell: false })}`;
}

// ---------- Bestellen je Lieferant ----------
function bestellenView(stand, v) {
  const ue = `<h2 class="inv-ue">${esc(t("bestand.bestellenTitel"))}</h2><p class="hinweis">${esc(t("bestand.bestellenFuer", v.tage, v.puffer))}</p>`;
  if (!v.gruppen.length) return `${ue}<div class="karte leer"><div>${esc(t("bestand.nichtsBestellen"))}</div></div>`;
  const gruppe = (g, i) => `<div class="karte" data-lieferant="${i}"><h2>${esc(g.lieferant || t("bestand.ohneLieferant"))}</h2>
      ${g.zeilen.map((z) => `<div class="summenzeile"><span><b>${esc(artikelText(z.name))}</b><br><small>${esc(dringendText(z))}${z.mindestGewinnt ? " · " + esc(t("bestand.mindestGewinnt")) : ""}</small></span><span class="wert">${esc(gebindeText(z.gebinde, z.gebindeArt, z.menge, z.basis))}</span></div>`).join("")}
      <div class="summenzeile gesamt"><span>${esc(t("bestand.summe"))}</span><span class="wert">${esc(g.ohneWert === g.zeilen.length ? t("inventur.preisFehlt") : euro(g.wert))}</span></div>
      <button type="button" class="knopf glut" data-a="best-teilen" data-wert="${i}">${esc(t("bestand.teilen"))}</button></div>`;
  return `${ue}${v.gruppen.map(gruppe).join("")}${was(t("bestand.wasBestellen"))}`;
}

// ---------- Lager jetzt ----------
function lagerView(bs) {
  const mit = bs.waren.filter((w) => w.bestand === null || w.bestand > 0 || w.negativ);
  if (!mit.length) return "";
  const zeile = (w) => {
    const menge = w.bestand === null ? t("bestand.unbekannt") : "≈ " + gebindeText(w.bestandGebinde, w.gebinde, w.bestand, w.basis);
    const sicher = t("bestand.sicherheit." + w.sicherheit) + (w.sicherheit !== "gut" ? ` (${w.luecken.filter((l) => l.art !== "verbrauchUnbekannt").map(lueckeText).join(", ")})` : "");
    return `<div class="summenzeile"><span><b>${esc(artikelText(w.name))}</b><br><small>${esc(menge)} · ${esc(reichtText(w))} · ${esc(sicher.replace(/ \(\)$/, ""))}</small></span><span class="wert">${esc(w.wert === null ? (w.bestand === null ? "–" : t("inventur.preisFehlt")) : euro(w.wert))}</span></div>`;
  };
  const summe = mit.reduce((s, w) => s + (w.wert || 0), 0);
  return `<h2 class="inv-ue">${esc(t("bestand.lagerTitel"))}</h2><p class="hinweis">${esc(t("bestand.lagerStand", kurz(bs.inventur.datum)))}</p>
    <div class="karte">${mit.map(zeile).join("")}<div class="summenzeile gesamt"><span>${esc(t("bestand.lagerWert"))}</span><span class="wert">${esc(euro(summe))}</span></div></div>${was(t("bestand.wasLager"))}`;
}

function hinweiseView(bs) {
  const z = [];
  if (bs.wochentage) z.push(t("bestand.wochentage"));
  for (const h of bs.hinweise) { if (h.art === "ohneRezept") z.push(t("bestand.ohneRezept", h.namen.join(", "))); if (h.art === "ohneGericht") z.push(t("bestand.ohneGericht", fmtZahl(h.menge, 0))); }
  return z.map((x) => `<p class="hinweis">${esc(x)}</p>`).join("");
}

// ---------- Einstellungen ----------
function einstellungenView(stand, bs) {
  const { tage, puffer } = bs.einstellungen;
  const chips = (liste, wert, aktion) => `<div class="chips">${[...new Set([...liste, wert])].sort((a, b) => a - b).map((n) => `<button type="button" class="chip klein ${n === wert ? "an" : ""}" data-a="${aktion}" data-wert="${n}" aria-pressed="${n === wert}">${n}</button>`).join("")}</div>`;
  const waren = bs.waren.filter((w) => w.inhalt);
  const mindest = mindestOffen ? `${waren.map((w) => { const a = (stand.artikel || []).find((x) => x.name === w.name); const wert = w.name in entwurf ? entwurf[w.name] : a?.mindestbestand ? wertAnzeige(a.mindestbestand) : "";
      return `<div class="zeile ${a?.mindestbestand ? "an" : ""}"><div class="oben"><div class="name">${esc(artikelText(w.name))}<small>${esc(t("gebinde.arten." + w.gebinde))}</small></div><div class="betrag klein"><input inputmode="decimal" data-f="best-mindest:${esc(w.name)}" value="${esc(wert)}" placeholder="0" aria-label="${esc(t("bestand.mindest") + ": " + artikelText(w.name))}"></div></div></div>`; }).join("")}
      <p class="hinweis">${esc(t("bestand.mindestHinweis"))}</p>
      <button type="button" class="knopf glut" data-a="best-mindest-speichern">${esc(t("bestand.speichern"))}</button>
      <button type="button" class="leise" data-a="best-mindest-zu">${esc(t("bestand.zu"))}</button>`
    : waren.length ? `<button type="button" class="knopf zweit" data-a="best-mindest-auf">${esc(t("bestand.mindest"))}</button>` : "";
  return `<h2 class="inv-ue">${esc(t("bestand.einstellungenTitel"))}</h2>
    <div class="karte"><p><b>${esc(t("bestand.tage"))}</b></p>${chips(TAGE_WAHL, tage, "best-tage")}<p><b>${esc(t("bestand.puffer"))}</b></p>${chips(PUFFER_WAHL, puffer, "best-puffer")}</div>
    ${mindest}`;
}

// ---------- Teilen ----------
// Wie die App sonst teilt (Sicherung, Ordner): navigator.share, sonst Kopieren, sonst zum Abschreiben zeigen.
export async function bestandTeilen(stand, i) {
  const g = bestellVorschlag(stand).gruppen[Number(i)]; if (!g) return null;
  const text = bestellText(stand, g);
  return { text, weg: await textTeilen(text, t("bestand.teilen")) }; // Trennung (17.10.2026): gemeinsames Teilen (./bausteine.js)
}

// ---------- Aktionen ----------
// Rückgabe: false (nicht meine) | true (neu zeichnen) | { speichern?: true, meldung? }
export async function bestandAktion(name, el, stand) {
  if (name === "best-tage" || name === "best-puffer") { const ok = lagerSetzen(stand, name === "best-tage" ? "tage" : "puffer", Number(el.dataset.wert)); return ok ? { speichern: true, meldung: t("bestand.gespeichert") } : false; }
  if (name === "best-mindest-auf") { mindestOffen = true; entwurf = {}; return true; }
  if (name === "best-mindest-zu") { mindestOffen = false; entwurf = {}; return true; }
  if (name === "best-mindest-speichern") {
    let n = 0, falsch = 0;
    for (const [ware, text] of Object.entries(entwurf)) { const leer = String(text).trim() === ""; const m = leer ? null : parseZahl(text); if (!leer && m === null) { falsch += 1; continue; } if (mindestbestandSetzen(stand, ware, m)) n += 1; else falsch += 1; }
    entwurf = {}; mindestOffen = false;
    return { speichern: n > 0, meldung: falsch ? t("bestand.ungueltig") : n ? t("bestand.gespeichert") : t("bestand.nichtsGeaendert") };
  }
  if (name === "best-teilen") { const r = await bestandTeilen(stand, el.dataset.wert); if (!r || r.weg === "abgebrochen") return false; return { meldung: t(r.weg === "kopiert" ? "bestand.kopiert" : "bestand.geteilt") }; }
  return false;
}
export function bestandEingabe(feld, wert) {
  if (String(feld).startsWith("best-mindest:")) { entwurf[String(feld).slice(13)] = String(wert || "").slice(0, 8); return "entwurf"; }
  return false;
}
