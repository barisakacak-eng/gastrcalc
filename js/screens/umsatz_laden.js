// Laden-Umbau (20.10.2026): „Umsatz heute“ im Laden – eine Zahl aus der Kasse, ein Knopf. Vorher führte die Kachel ins Büro (umsatz.js).
// Gespeichert wird wie die Tagesumsatz-Eingabe im Büro (js/laden_zahlen.js umsatzHeuteSpeichern: Geschäftstag bis 4 Uhr, festgeschrieben).
// brutto/netto, Vortage und Korrekturen bleiben im Büro. Über 100.000 € fragt der Bildschirm einmal nach („Stimmt das?“), ohne alert().
import { t } from "../i18n.js";
import { esc, fmtEuro, heuteGeschaeft, wertAnzeige } from "../util.js";
import { umsatzEintrag } from "../engine.js";
import { umsatzHeutePruefen, umsatzHeuteSpeichern } from "../laden_zahlen.js";
import { nav } from "./nav.js";
import { teamTag, teamTagSetzen, teamTagLohn } from "../stamm.js";
import { sym } from "../symbole.js";

let entwurf = null;   // getippter Text (null = noch nichts getippt, Feld zeigt den gespeicherten Wert)
let rueckfrage = null; // Betrag, nach dem gerade gefragt wird (über der Grenze)
// Mitarbeiter heute (Baris 27.10.2026, 11:14): nach dem Umsatz fragt Zeki „Waren heute Mitarbeiter da?“. schritt: "feld" | "frage" | "liste"
let schritt = "feld"; let team = null; const satzEntwuerfe = new Map(); // team: [{ person, name, stunden, satz, an }]

export const umsatzLadenKennung = () => (rueckfrage !== null ? "frage" : schritt);
export function umsatzLadenZuruecksetzen() { entwurf = null; rueckfrage = null; schritt = "feld"; team = null; }

function teamStart(stand, H) {
  const alt = teamTag(stand, H);
  const leute = (stand.personen || []).filter((p) => !p.entfernt && p.aktiv !== false);
  const basis = leute.length ? leute.map((p) => ({ person: p.id, name: p.kuerzel, satz: p.stundenlohn || null })) : [{ person: null, name: t("teamTag.person", 1), satz: null }];
  return basis.map((b) => { const v = alt?.eintraege.find((x) => (x.person || x.name) === (b.person || b.name)); return { ...b, stunden: v ? v.stunden : 8, satz: v?.satz || b.satz, an: !!v || !alt }; });
}
function teamView(stand) {
  if (schritt === "frage") return `
    <div class="inhalt umsatz-laden team-tag">
      <p class="zeki-zeile">${esc(t("teamTag.frage"))}</p>
      <div class="team-wahl"><button type="button" class="knopf glut" data-a="ul-team-ja">${esc(t("allgemein.ja"))}</button><button type="button" class="knopf zweit" data-a="ul-team-nein">${esc(t("allgemein.nein"))}</button></div>
    </div>${nav("start")}`;
  const lohn = teamTagLohn({ eintraege: team.filter((x) => x.an) }); const offen = team.some((x) => x.an && !x.satz);
  return `
    <div class="inhalt umsatz-laden team-tag">
      <p class="zeki-zeile">${esc(t("teamTag.wer"))}</p>
      <div class="team-liste">${team.map((x, i) => `
        <div class="karte team-zeile ${x.an ? "an" : ""}">
          <button type="button" class="team-name" data-a="ul-team-wer" data-i="${i}" aria-pressed="${x.an}"><span class="team-haken">${x.an ? sym("check") : ""}</span><b>${esc(x.name)}</b></button>
          ${x.an ? `<div class="stepper team-std"><button type="button" data-a="ul-team-std" data-i="${i}" data-d="-0.5" aria-label="−">−</button><div class="wert"><b>${esc(String(x.stunden).replace(".", ","))}</b><small>${esc(t("teamTag.std"))}</small></div><button type="button" data-a="ul-team-std" data-i="${i}" data-d="0.5" aria-label="+">+</button></div>
          ${x.satz ? "" : `<label class="team-satz"><span>${esc(t("teamTag.satz"))}</span><input inputmode="decimal" data-f="ul-team-satz:${i}" placeholder="0,00" autocomplete="off"><span>€</span></label>`}` : ""}
        </div>`).join("")}</div>
      ${(stand.personen || []).some((p) => !p.entfernt) ? "" : `<button type="button" class="leise" data-a="ul-team-plus">+ ${esc(t("teamTag.weitere"))}</button>`}
      <p class="team-summe">${esc(offen ? t("teamTag.summeOffen") : t("teamTag.summe", fmtEuro(lohn, { dezimal: 2 })))}</p>
      <button type="button" class="knopf glut" data-a="ul-team-fertig">${esc(t("teamTag.fertig"))}</button>
    </div>${nav("start")}`;
}

export function umsatzLadenView(stand) {
  if (schritt !== "feld") return teamView(stand);
  const H = heuteGeschaeft(); const u = umsatzEintrag(stand, H);
  const wert = entwurf ?? (u ? wertAnzeige(u.umsatz) : "");
  return `
    <div class="inhalt umsatz-laden">
      <div class="ul-kopf"><h1>${esc(t("heute.kachel.umsatz"))}</h1><small>${esc(t("abschluss.umsatzKurz"))}</small></div>
      ${rueckfrage !== null ? `
      <div class="karte ul-frage" role="alertdialog" aria-live="assertive">
        <b>${esc(t("ladenSchirm.stimmt", fmtEuro(rueckfrage, { dezimal: 2 })))}</b>
        <button type="button" class="knopf glut" data-a="ul-ja">${esc(t("ladenSchirm.ja"))}</button>
        <button type="button" class="knopf zweit" data-a="ul-aendern">${esc(t("ladenSchirm.aendern"))}</button>
      </div>` : `
      <label class="ul-feld"><input inputmode="decimal" enterkeyhint="done" autocomplete="off" data-f="ul-umsatz" value="${esc(wert)}" placeholder="0,00" aria-label="${esc(t("heute.kachel.umsatz"))}"><span class="einheit">€</span></label>
      <button type="button" class="knopf glut" data-a="ul-speichern">${esc(t("kartelaeden.speichern"))}</button>`}
    </div>
    ${nav("start")}`;
}

// Eingabe merken, nicht neu zeichnen (Tastatur bleibt oben)
export function umsatzLadenEingabe(feld, wert) {
  if (feld.startsWith("ul-team-satz:") && team) { const v = Number(String(wert).replace(",", ".")); satzEntwuerfe.set(Number(feld.slice(13)), v > 0 ? v : null); return "entwurf"; }
  if (feld !== "ul-umsatz") return false; entwurf = wert; return "entwurf"; }

// Rückgabe: false (nicht meine) | "zeichnen" | { gespeichert: true, betrag } | { meldung }
export function umsatzLadenAktion(name, el, stand, wurzel) {
  if (name === "ul-aendern") { rueckfrage = null; return "zeichnen"; }
  const H = heuteGeschaeft();
  if (name === "ul-team-nein") { teamTagSetzen(stand, H, []); schritt = "feld"; team = null; return { fertig: true }; }
  if (name === "ul-team-ja") { team = teamStart(stand, H); schritt = "liste"; return "zeichnen"; }
  if (team && name.startsWith("ul-team-")) {
    team = team.map((y, i) => (satzEntwuerfe.get(i) ? { ...y, satz: satzEntwuerfe.get(i) } : y)); satzEntwuerfe.clear();
    const x = team[Number(el.dataset.i)];
    if (name === "ul-team-wer" && x) { team = team.map((y) => (y === x ? { ...y, an: !y.an } : y)); return "zeichnen"; }
    if (name === "ul-team-std" && x) { team = team.map((y) => (y === x ? { ...y, stunden: Math.max(0.5, Math.min(16, y.stunden + Number(el.dataset.d))) } : y)); return "zeichnen"; }
    if (name === "ul-team-plus") { team = [...team, { person: null, name: t("teamTag.person", team.length + 1), stunden: 8, satz: team[team.length - 1]?.satz || null, an: true }]; return "zeichnen"; }
    if (name === "ul-team-fertig") { teamTagSetzen(stand, H, team.filter((y) => y.an)); schritt = "feld"; team = null; return { fertig: true }; }
  }
  if (name !== "ul-speichern" && name !== "ul-ja") return false;
  const text = entwurf ?? (umsatzEintrag(stand, heuteGeschaeft()) ? wertAnzeige(umsatzEintrag(stand, heuteGeschaeft()).umsatz) : "");
  const p = umsatzHeutePruefen(name === "ul-ja" ? String(rueckfrage ?? "") : text, { bestaetigt: name === "ul-ja" });
  if (p.status === "leer") return false;
  if (p.status === "ungueltig") return { meldung: t("allgemein.zahlUngueltig", String(text).trim().slice(0, 20)) };
  if (p.status === "rueckfrage") { rueckfrage = p.betrag; return "zeichnen"; }
  umsatzHeuteSpeichern(stand, p.betrag, { geraet: wurzel?.geraet || null });
  entwurf = null; rueckfrage = null;
  schritt = "frage"; // gleich danach: Waren heute Mitarbeiter da?
  return { gespeichert: true, betrag: p.betrag, weiter: true };
}
