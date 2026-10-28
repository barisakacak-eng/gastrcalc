// Laden-Umbau (20.10.2026): „Umsatz heute“ im Laden – eine Zahl aus der Kasse, ein Knopf. Vorher führte die Kachel ins Büro (umsatz.js).
// Gespeichert wird wie die Tagesumsatz-Eingabe im Büro (js/laden_zahlen.js umsatzHeuteSpeichern: Geschäftstag bis 4 Uhr, festgeschrieben).
// brutto/netto, Vortage und Korrekturen bleiben im Büro. Über 100.000 € fragt der Bildschirm einmal nach („Stimmt das?“), ohne alert().
import { t } from "../i18n.js";
import { esc, fmtEuro, heuteGeschaeft, wertAnzeige, parseZahl } from "../util.js";
import { umsatzEintrag } from "../engine.js";
import { umsatzHeutePruefen, umsatzHeuteSpeichern } from "../laden_zahlen.js";
import { nav } from "./nav.js";
import { teamTag, teamTagSetzen, teamTagLohn, teamTagKosten, abwesendMonat, abwesendSetzen, stundenJeTag, lieferTag, lieferTagSetzen, lieferProvision, normalFrageNoetig, normalTagSetzen, teamStundenlohnSetzen } from "../stamm.js";
import { sym } from "../symbole.js";

let teamEntwurf = { pers: null, std: null, satz: null }; let satzAuf = false; // Baris 27.10.2026 18:10: Mitarbeiter kompakt unter dem Umsatz (Personen, Stunden zusammen, Lohn je Stunde einmal)
let lieferEntwurf = null; // „davon Lieferdienst“ (27.10.2026), nur wenn ein Portal mit Provision eingerichtet ist
let entwurf = null;   // getippter Text (null = noch nichts getippt, Feld zeigt den gespeicherten Wert)
let rueckfrage = null; // Betrag, nach dem gerade gefragt wird (über der Grenze)
// Mitarbeiter heute (Baris 27.10.2026, 11:14): nach dem Umsatz fragt Zeki „Waren heute Mitarbeiter da?“. schritt: "feld" | "frage" | "liste"
let schritt = "feld"; let team = null; const satzEntwuerfe = new Map(); const monatEntwuerfe = new Map(); // team: [{ person, name, stunden, satz, an }]

export const umsatzLadenKennung = () => (rueckfrage !== null ? "frage" : schritt);
export function umsatzLadenZuruecksetzen() { entwurf = null; lieferEntwurf = null; teamEntwurf = { pers: null, std: null, satz: null }; satzAuf = false; rueckfrage = null; schritt = "feld"; team = null; abwesend = null; }

function teamStart(stand, H) {
  const alt = teamTag(stand, H);
  // 27.10.2026 (Baris 13:02): Personen mit festem Monatslohn stehen nicht in der täglichen Frage – ihr Lohn ist feste Kosten.
  const leute = (stand.personen || []).filter((p) => !p.entfernt && p.aktiv !== false && p.lohnModell !== "monat");
  const basis = leute.length ? leute.map((p) => ({ person: p.id, name: p.kuerzel, satz: p.stundenlohn || null, art: p.lohnArt || null, modell: p.lohnModell || null })) : [{ person: null, name: t("teamTag.person", 1), satz: null, art: null, modell: "stunde" }];
  return basis.map((b) => { const v = alt?.eintraege.find((x) => (x.person || x.name) === (b.person || b.name)); return { ...b, stunden: v ? v.stunden : 8, satz: v?.satz || b.satz, art: v?.art || b.art, an: !!v }; }); // 27.10.2026 (Prüfung F5): nichts vorauswählen – sonst zählt der Inhaber als Mitarbeiter doppelt
}
// Gibt es überhaupt jemanden mit Stundenlohn (oder noch ohne Lohnart)? Sonst entfällt die Frage „Waren heute Mitarbeiter da?“.
export const teamFrageNoetig = (stand) => { const p = (stand.personen || []).filter((x) => !x.entfernt && x.aktiv !== false); return !p.length || p.some((x) => x.lohnModell !== "monat"); };
function zeileLohn(x, i) {
  const modellWahl = x.person && !x.modell ? `<div class="team-art">${["stunde", "monat"].map((m) => `<button type="button" class="chip ${x.modellNeu === m ? "an" : ""}" data-a="ul-team-modell" data-i="${i}" data-wert="${m}">${esc(t("teamTag.modell." + m))}</button>`).join("")}</div>` : "";
  const modell = x.modell || x.modellNeu;
  if (x.person && !modell) return modellWahl;
  const art = `<div class="team-art">${["angestellt", "minijob"].map((a) => `<button type="button" class="chip ${x.art === a ? "an" : ""}" data-a="ul-team-art" data-i="${i}" data-wert="${a}">${esc(t("teamTag.art." + a))}</button>`).join("")}</div>`;
  if (modell === "monat") return `${modellWahl}<label class="team-satz"><span>${esc(t("teamTag.monatBrutto"))}</span><input inputmode="decimal" data-f="ul-team-monat:${i}" value="${x.monatsBrutto ? esc(String(x.monatsBrutto).replace(".", ",")) : ""}" placeholder="0" autocomplete="off"><span>€</span></label>${art}<p class="team-hinweis">${esc(t("teamTag.monatHinweis"))}</p>`;
  return `${modellWahl}<div class="stepper team-std"><button type="button" data-a="ul-team-std" data-i="${i}" data-d="-0.5" aria-label="−">−</button><div class="wert"><b>${esc(String(x.stunden).replace(".", ","))}</b><small>${esc(t("teamTag.std"))}</small></div><button type="button" data-a="ul-team-std" data-i="${i}" data-d="0.5" aria-label="+">+</button></div>
          ${x.satz && x.art ? "" : `<label class="team-satz"><span>${esc(t("teamTag.satz"))}</span><input inputmode="decimal" data-f="ul-team-satz:${i}" value="${x.satz ? esc(String(x.satz).replace(".", ",")) : ""}" placeholder="0,00" autocomplete="off"><span>€</span></label>${art}`}`;
}
// Monatsende (Baris 27.10.2026): in den letzten 3 Tagen des Monats einmal fragen, ob Stundenkräfte krank oder im Urlaub waren
const stundenLeute = (stand) => (stand.personen || []).filter((p) => !p.entfernt && p.aktiv !== false && p.lohnModell !== "monat" && p.stundenlohn > 0);
export function abwesendFrageNoetig(stand, H) {
  const [j, m] = H.split("-").map(Number); const letzter = new Date(j, m, 0).getDate();
  return Number(H.slice(8, 10)) >= letzter - 2 && !abwesendMonat(stand, H.slice(0, 7)) && stundenLeute(stand).length > 0;
}
let abwesend = null; // [{ person, name, tage, satz, art, stundenTag }]
function abwesendView(stand) {
  if (schritt === "abw-frage") return `
    <div class="inhalt umsatz-laden team-tag">
      <p class="zeki-zeile">${esc(t("teamTag.abwFrage"))}</p>
      <div class="team-wahl"><button type="button" class="knopf glut" data-a="ul-abw-ja">${esc(t("allgemein.ja"))}</button><button type="button" class="knopf zweit" data-a="ul-abw-nein">${esc(t("allgemein.nein"))}</button></div>
    </div>${nav("start")}`;
  return `
    <div class="inhalt umsatz-laden team-tag">
      <p class="zeki-zeile">${esc(t("teamTag.abwWer"))}</p>
      <div class="team-liste">${abwesend.map((x, i) => `
        <div class="karte team-zeile ${x.tage ? "an" : ""}"><b class="team-name">${esc(x.name)}</b>
          <div class="stepper team-std"><button type="button" data-a="ul-abw-tage" data-i="${i}" data-d="-1" aria-label="−">−</button><div class="wert"><b>${x.tage}</b><small>${esc(t("teamTag.tage"))}</small></div><button type="button" data-a="ul-abw-tage" data-i="${i}" data-d="1" aria-label="+">+</button></div></div>`).join("")}</div>
      <button type="button" class="knopf glut" data-a="ul-abw-fertig">${esc(t("teamTag.fertig"))}</button>
    </div>${nav("start")}`;
}
let normalAntwort = null; // Baris 27.10.2026 (B): Antwort auf „Ist das ein normaler Tag?“
function teamView(stand) {
  if (schritt.startsWith("abw-")) return abwesendView(stand);
  if (schritt === "normal-frage") return `
    <div class="inhalt umsatz-laden team-tag">
      <p class="zeki-zeile">${esc(t("teamTag.normalFrage"))}</p>
      <div class="team-wahl"><button type="button" class="knopf glut" data-a="ul-normal-ja">${esc(t("allgemein.ja"))}</button><button type="button" class="knopf zweit" data-a="ul-normal-nein">${esc(t("allgemein.nein"))}</button></div>
    </div>${nav("start")}`;
  if (schritt === "normal-info") return `
    <div class="inhalt umsatz-laden team-tag">
      <p class="zeki-zeile">${esc(t(normalAntwort ? "teamTag.normalJa" : "teamTag.normalNein"))}</p>
      <button type="button" class="knopf glut" data-a="ul-normal-fertig">${esc(t("teamTag.fertig"))}</button>
    </div>${nav("start")}`;
  if (schritt === "frage") return `
    <div class="inhalt umsatz-laden team-tag">
      <p class="zeki-zeile">${esc(t("teamTag.frage"))}</p>
      <div class="team-wahl"><button type="button" class="knopf glut" data-a="ul-team-ja">${esc(t("allgemein.ja"))}</button><button type="button" class="knopf zweit" data-a="ul-team-nein">${esc(t("allgemein.nein"))}</button></div>
    </div>${nav("start")}`;
  const stunde = (x) => (x.modell || x.modellNeu) !== "monat";
  const an = { eintraege: team.filter((x) => x.an && stunde(x)) }; const lohn = teamTagLohn(an); const kosten = teamTagKosten(an);
  const offen = team.some((x) => x.an && (x.person && !(x.modell || x.modellNeu) || (stunde(x) ? !x.satz || !x.art : !x.monatsBrutto || !x.art)));
  return `
    <div class="inhalt umsatz-laden team-tag">
      <p class="zeki-zeile">${esc(t("teamTag.wer"))}</p>
      <div class="team-liste">${team.map((x, i) => `
        <div class="karte team-zeile ${x.an ? "an" : ""}">
          <button type="button" class="team-name" data-a="ul-team-wer" data-i="${i}" aria-pressed="${x.an}"><span class="team-haken">${x.an ? sym("check") : ""}</span><b>${esc(x.name)}</b></button>
          ${x.an ? zeileLohn(x, i) : ""}
        </div>`).join("")}</div>
      ${(stand.personen || []).some((p) => !p.entfernt) ? "" : `<button type="button" class="leise" data-a="ul-team-plus">+ ${esc(t("teamTag.weitere"))}</button>`}
      <p class="team-summe">${esc(offen ? t("teamTag.summeOffen") : t("teamTag.summe", "≈ " + fmtEuro(kosten, { dezimal: 2 })))}${offen ? "" : `<small>${esc(t("teamTag.brutto", fmtEuro(lohn, { dezimal: 2 })))}</small>`}</p>
      <button type="button" class="knopf glut" data-a="ul-team-fertig">${esc(t("teamTag.fertig"))}</button>
    </div>${nav("start")}`;
}

const kompaktVon = (stand, H) => (teamTag(stand, H)?.eintraege || []).find((x) => x.kompakt) || null;
function teamFeld(stand, H) {
  const k = kompaktVon(stand, H); const satzGemerkt = Number(stand.team?.stundenlohn) > 0 ? stand.team.stundenlohn : null;
  const pers = teamEntwurf.pers ?? (k ? String(k.personen) : ""); const std = teamEntwurf.std ?? (k ? wertAnzeige(k.stunden) : "");
  const satz = parseZahl(teamEntwurf.satz ?? "") ?? satzGemerkt; const stdZahl = parseZahl(std);
  const kosten = satz && stdZahl > 0 ? teamTagKosten({ eintraege: [{ stunden: stdZahl, satz, art: "angestellt" }] }) : null;
  const unter = satzGemerkt && !satzAuf ? `<button type="button" class="ul-team-satz-zeile" data-a="ul-satz-auf">${esc(t("teamTag.kompaktKosten", fmtEuro(satzGemerkt, { dezimal: 2 }), kosten !== null ? fmtEuro(kosten, { dezimal: 0 }) : "–"))}</button>` : "";
  const zahl = (f, w, e, im) => `<label class="ul-team-zahl"><input inputmode="${im}" enterkeyhint="done" autocomplete="off" data-f="${f}" value="${esc(w)}" placeholder="0" aria-label="${esc(e)}"><span class="einheit">${esc(e)}</span></label>`;
  return `<div class="ul-feld ul-team-kompakt"><span class="ul-liefer-text">${esc(t("teamTag.heute"))}${unter}</span>
      <div class="ul-team-zahlen">${zahl("ul-team-pers", pers, t("teamTag.pers"), "numeric")}${zahl("ul-team-std", std, t("teamTag.std"), "decimal")}</div></div>
    ${!satzGemerkt || satzAuf ? `<label class="ul-feld ul-liefer"><span class="ul-liefer-text">${esc(t("teamTag.satz"))}</span><input inputmode="decimal" enterkeyhint="done" autocomplete="off" data-f="ul-team-satz" value="${esc(teamEntwurf.satz ?? (satzGemerkt ? wertAnzeige(satzGemerkt) : ""))}" placeholder="0,00" aria-label="${esc(t("teamTag.satz"))}"><span class="einheit">€</span></label>` : ""}`;
}
function lieferFeld(stand, H) {
  const prov = lieferProvision(stand); if (!prov) return "";
  const l = lieferTag(stand, H); const wert = lieferEntwurf ?? (l && l.betrag > 0 ? wertAnzeige(l.betrag) : "");
  return `<label class="ul-feld ul-liefer"><span class="ul-liefer-text">${esc(t("lieferTag.davon"))}<small>${esc(t("lieferTag.provision"))} ${esc(String(Math.round(prov.satz * 1000) / 10).replace(".", ","))}\u00a0%</small></span><input inputmode="decimal" enterkeyhint="done" autocomplete="off" data-f="ul-liefer" value="${esc(wert)}" placeholder="0" aria-label="${esc(t("lieferTag.davon"))}"><span class="einheit">€</span></label>`;
}
export function umsatzLadenView(stand) {
  if (schritt !== "feld") return teamView(stand);
  const H = heuteGeschaeft(); const u = umsatzEintrag(stand, H);
  const wert = entwurf ?? (u ? wertAnzeige(u.umsatz) : "");
  return `
    <div class="inhalt umsatz-laden">
      <div class="ul-kopf"><h1>${esc(t("heute.kachel.umsatz"))}</h1></div>${""/* Nachtest 27.10.2026: „Aus der Kasse“ entfällt – mit Lieferdienst und Personal sonst über 15 Wörter */}
      ${rueckfrage !== null ? `
      <div class="karte ul-frage" role="alertdialog" aria-live="assertive">
        <b>${esc(t("ladenSchirm.stimmt", fmtEuro(rueckfrage, { dezimal: 2 })))}</b>
        <button type="button" class="knopf glut" data-a="ul-ja">${esc(t("ladenSchirm.ja"))}</button>
        <button type="button" class="knopf zweit" data-a="ul-aendern">${esc(t("ladenSchirm.aendern"))}</button>
      </div>` : `
      <label class="ul-feld"><input inputmode="decimal" enterkeyhint="done" autocomplete="off" data-f="ul-umsatz" value="${esc(wert)}" placeholder="0,00" aria-label="${esc(t("heute.kachel.umsatz"))}"><span class="einheit">€</span></label>
      ${lieferFeld(stand, H)}
      ${teamFeld(stand, H)}
      <button type="button" class="knopf glut" data-a="ul-speichern">${esc(t("kartelaeden.speichern"))}</button>`}
    </div>
    ${nav("start")}`;
}

// Eingabe merken, nicht neu zeichnen (Tastatur bleibt oben)
export function umsatzLadenEingabe(feld, wert) {
  if (feld.startsWith("ul-team-monat:") && team) { const v = Number(String(wert).replace(/\./g, "").replace(",", ".")); monatEntwuerfe.set(Number(feld.slice(14)), v > 0 ? v : null); return "entwurf"; }
  if (feld.startsWith("ul-team-satz:") && team) { const v = Number(String(wert).replace(",", ".")); satzEntwuerfe.set(Number(feld.slice(13)), v > 0 ? v : null); return "entwurf"; }
  if (feld === "ul-liefer") { lieferEntwurf = wert; return "entwurf"; }
  if (feld === "ul-team-pers") { teamEntwurf = { ...teamEntwurf, pers: wert }; return "entwurf"; }
  if (feld === "ul-team-std") { teamEntwurf = { ...teamEntwurf, std: wert }; return "entwurf"; }
  if (feld === "ul-team-satz") { teamEntwurf = { ...teamEntwurf, satz: wert }; return "entwurf"; }
  if (feld !== "ul-umsatz") return false; entwurf = wert; return "entwurf"; }

// Rückgabe: false (nicht meine) | "zeichnen" | { gespeichert: true, betrag } | { meldung }
export function umsatzLadenAktion(name, el, stand, wurzel) {
  if (name === "ul-aendern") { rueckfrage = null; return "zeichnen"; }
  const H = heuteGeschaeft();
  const weiterOderFertig = () => { team = null; if (abwesendFrageNoetig(stand, H)) { schritt = "abw-frage"; return "zeichnen"; } schritt = "feld"; return { fertig: true }; };
  if (name === "ul-abw-nein") { abwesendSetzen(stand, H, []); schritt = "feld"; abwesend = null; return { fertig: true }; }
  if (name === "ul-abw-ja") { abwesend = stundenLeute(stand).map((p) => ({ person: p.id, name: p.kuerzel, tage: 0, satz: p.stundenlohn, art: p.lohnArt || "angestellt", stundenTag: stundenJeTag(stand, p.id, H.slice(0, 7)) })); schritt = "abw-liste"; return "zeichnen"; }
  if (name === "ul-abw-tage" && abwesend) { const i = Number(el.dataset.i); abwesend = abwesend.map((x, k) => (k === i ? { ...x, tage: Math.max(0, Math.min(31, x.tage + Number(el.dataset.d))) } : x)); return "zeichnen"; }
  if (name === "ul-abw-fertig" && abwesend) { abwesendSetzen(stand, H, abwesend); schritt = "feld"; abwesend = null; return { fertig: true }; }
  if (name === "ul-satz-auf") { satzAuf = true; return "zeichnen"; }
  if (name === "ul-normal-ja" || name === "ul-normal-nein") { normalAntwort = name === "ul-normal-ja"; normalTagSetzen(stand, H, normalAntwort); schritt = "normal-info"; return "zeichnen"; }
  if (name === "ul-normal-fertig") return weiterOderFertig();
  if (name === "ul-team-nein") { teamTagSetzen(stand, H, []); return weiterOderFertig(); }
  if (name === "ul-team-ja") { team = teamStart(stand, H); schritt = "liste"; return "zeichnen"; }
  if (team && name.startsWith("ul-team-")) {
    team = team.map((y, i) => ({ ...y, ...(satzEntwuerfe.get(i) ? { satz: satzEntwuerfe.get(i) } : {}), ...(monatEntwuerfe.get(i) ? { monatsBrutto: monatEntwuerfe.get(i) } : {}) })); satzEntwuerfe.clear(); monatEntwuerfe.clear();
    if (name === "ul-team-modell") { const y = team[Number(el.dataset.i)]; if (y) team = team.map((z) => (z === y ? { ...z, modellNeu: el.dataset.wert === "monat" ? "monat" : "stunde" } : z)); return "zeichnen"; }
    const x = team[Number(el.dataset.i)];
    if (name === "ul-team-art" && x) { team = team.map((y) => (y === x ? { ...y, art: el.dataset.wert === "minijob" ? "minijob" : "angestellt" } : y)); return "zeichnen"; }
    if (name === "ul-team-wer" && x) { team = team.map((y) => (y === x ? { ...y, an: !y.an } : y)); return "zeichnen"; }
    if (name === "ul-team-std" && x) { team = team.map((y) => (y === x ? { ...y, stunden: Math.max(0.5, Math.min(16, y.stunden + Number(el.dataset.d))) } : y)); return "zeichnen"; }
    if (name === "ul-team-plus") { team = [...team, { person: null, name: t("teamTag.person", team.length + 1), stunden: 8, satz: team[team.length - 1]?.satz || null, an: true }]; return "zeichnen"; }
    if (name === "ul-team-fertig") { teamTagSetzen(stand, H, team.filter((y) => y.an).map((y) => ({ ...y, modell: y.modell || y.modellNeu || "stunde" }))); if (normalFrageNoetig(stand, H)) { team = null; schritt = "normal-frage"; return "zeichnen"; } return weiterOderFertig(); }
  }
  if (name !== "ul-speichern" && name !== "ul-ja") return false;
  const text = entwurf ?? (umsatzEintrag(stand, heuteGeschaeft()) ? wertAnzeige(umsatzEintrag(stand, heuteGeschaeft()).umsatz) : "");
  const p = umsatzHeutePruefen(name === "ul-ja" ? String(rueckfrage ?? "") : text, { bestaetigt: name === "ul-ja", stand, datum: H });
  if (p.status === "leer") return { meldung: t("teamTag.umsatzLeer") };
  if (p.status === "ungueltig") return { meldung: t("allgemein.zahlUngueltig", String(text).trim().slice(0, 20)) };
  if (p.status === "rueckfrage") { rueckfrage = p.betrag; return "zeichnen"; }
  const prov = lieferProvision(stand);
  const lieferText = lieferEntwurf ?? (lieferTag(stand, H) ? wertAnzeige(lieferTag(stand, H).betrag) : "");
  const liefer = prov ? (String(lieferText).trim() === "" ? 0 : parseZahl(lieferText)) : null;
  if (prov && liefer === null) return { meldung: t("allgemein.zahlUngueltig", String(lieferText).trim().slice(0, 20)) };
  if (prov && liefer > p.betrag) { rueckfrage = null; return { meldung: t("lieferTag.zuViel") }; }
  // Mitarbeiter kompakt: leer = heute kein Personal; Stunden brauchen einmal den Lohn je Stunde
  const k0 = kompaktVon(stand, H);
  const stdText = teamEntwurf.std ?? (k0 ? String(k0.stunden) : ""); const persText = teamEntwurf.pers ?? (k0 ? String(k0.personen) : "");
  const std = String(stdText).trim() === "" ? 0 : parseZahl(stdText); const pers = String(persText).trim() === "" ? null : parseZahl(persText);
  const satzNeu = String(teamEntwurf.satz ?? "").trim() === "" ? null : parseZahl(teamEntwurf.satz);
  const satz = satzNeu ?? (Number(stand.team?.stundenlohn) > 0 ? stand.team.stundenlohn : null);
  if (std === null || (teamEntwurf.satz && satzNeu === null)) return { meldung: t("allgemein.zahlUngueltig", String(std === null ? stdText : teamEntwurf.satz).trim().slice(0, 20)) };
  if (std > 0 && !satz) return { meldung: t("teamTag.satzFehlt") };
  // Nachtest 27.10.2026: unplausible Werte nicht still speichern (1.400 €/Std. ergab „bis null ≈ 409.027 €“)
  if ((satz && (satz < 5 || satz > 80)) || (std > 0 && std > 24 * Math.max(1, pers || 1)) || (pers && pers > 60)) return { meldung: t("teamTag.unplausibel") };
  umsatzHeuteSpeichern(stand, p.betrag, { geraet: wurzel?.geraet || null });
  if (prov) lieferTagSetzen(stand, H, liefer);
  if (satzNeu) teamStundenlohnSetzen(stand, satzNeu);
  teamTagSetzen(stand, H, std > 0 ? [{ person: null, name: `${pers || 1}`, kompakt: true, personen: pers || 1, stunden: std, satz, art: "angestellt", modell: "stunde" }] : []);
  entwurf = null; rueckfrage = null; lieferEntwurf = null; teamEntwurf = { pers: null, std: null, satz: null }; satzAuf = false;
  if (normalFrageNoetig(stand, H)) { schritt = "normal-frage"; return { gespeichert: true, betrag: p.betrag, weiter: true }; }
  if (abwesendFrageNoetig(stand, H)) { schritt = "abw-frage"; return { gespeichert: true, betrag: p.betrag, weiter: true }; }
  return { gespeichert: true, betrag: p.betrag };
}
