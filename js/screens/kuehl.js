// Etappe 4: Kühlkontrolle – Einrichtung der Kühlstellen, der Rundgang, das Monatsblatt.
// Regeln aus der Vorprüfung des Gremiums: Grenzen setzt der Betrieb (die App nennt nur Anhaltspunkte), kein Wert ist vorbelegt,
// „nicht gemessen" mit Grund ist erlaubt, der Rundgang ist unterbrechbar und bis zum Abschluss änderbar, danach nur anhängen.
import { sym } from "../symbole.js";
import { t } from "../i18n.js";
import { esc, parseZahl, fmtZahl, fmtEuro, uid, heute, wertAnzeige } from "../util.js";
import { KUEHL_ARTEN, MASSNAHMEN, NICHT_GEMESSEN, aktiveStellen, kuehlBereit, stelleBereit, abweichung, rundgangOffen, rundgangStarten, stationEintragen, rundgangAbschliessen,
  letzteMessung, offeneNachkontrollen, nachkontrolleErledigt, monatsblatt, kuehlStatus, messungenDerStelle, wertEintrag, grenzenVon, GRENZEN_STANDARD } from "../engine.js";
import { naechsteLfd } from "../store.js";
import { nav } from "./nav.js";
import { datumLesbar } from "./tag.js";

// Piktogramm je Kühlstelle (Sanjis k-*-Bilder; Theke nach Name)
const stelleBild = (k) => `<img class="gerichtbild mini pikto" src="bilder/${k.art === "warm" ? "k-warmhalter" : k.art === "tk" ? "k-tiefkuehler" : /theke|vitrine/i.test(k.name || "") ? "k-theke" : "k-kuehlschrank"}.svg" alt="">`;
let ansicht = "start";          // "start" | "einrichtung" | "rundgang" | "blatt"
let station = null;             // id der Stelle, die im Rundgang gerade offen ist
let form = null;                // Eingabe der offenen Station
let blattStelle = null, blattMonat = 0; // Monatsblatt: Stelle und Monat (0 = dieser, -1 = voriger)
let neuName = "";               // Einrichtung: Name der neuen Stelle
let neuKuerzel = "";
let startVon = null, startNach = null; // Rundgang-Start: gewählte Person (""= ausdrücklich ohne), Nacherfassungs-Datum
let startStelle = null;         // Nachmessen einer einzelnen Stelle

export const kuehlAnsicht = () => ansicht;
export const kuehlKennung = () => `${ansicht}:${station || ""}:${rundgangOffen ? "" : ""}`; // für den Doppeltipp-Schutz: jede Ebene ist ein eigener Bildschirm
export function kuehlZuruecksetzen() { ansicht = "start"; station = null; form = null; }
export function kuehlZurueck() { // Zurück-Geste: eine Ebene hoch; true = behandelt
  if (station) { station = null; form = null; return true; }
  if (ansicht !== "start") { ansicht = "start"; return true; }
  return false;
}

const artName = (a) => t("kuehl.arten." + a);
// Grenzen einer Stelle als Text; ohne eigene Grenze gilt der Standard (Etappe 5), das steht dann dabei.
const grenzen = (k) => { const g = grenzenVon(k); return [typeof g.min === "number" ? `≥ ${fmtZahl(g.min, 1)} °C` : "", typeof g.max === "number" ? `≤ ${fmtZahl(g.max, 1)} °C` : ""].filter(Boolean).join(" · ") + (g.standard ? ` (${t("kuehl.standard")})` : ""); };
const kuerzelVon = (stand, id) => stand.personen.find((p) => p.id === id)?.kuerzel || "";
const zeitKurz = (iso) => { const d = new Date(iso); if (Number.isNaN(d.getTime())) return "–"; return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const grundText = (g) => NICHT_GEMESSEN.includes(g) ? t("kuehl.gruende." + g) : t("kuehl.nichtGemessenKurz");

// ---------- Hauptansicht ----------
export function kuehlView(stand) {
  if (ansicht === "einrichtung") return einrichtungView(stand);
  if (ansicht === "rundgang") return rundgangView(stand);
  if (ansicht === "blatt") return blattView(stand);
  const st = kuehlStatus(stand);
  const offen = rundgangOffen(stand);
  const nk = offeneNachkontrollen(stand);
  const H = heute();
  return `
    <div class="kopfband"><h1>${esc(t("kuehl.titel"))}</h1><div class="unter">${esc(stand.betrieb.name)} · ${esc(datumLesbar(H))}</div></div>
    <div class="inhalt">
      ${!st.eingerichtet ? `
      <div class="karte">
        <h2>${esc(t("kuehl.einrichtenTitel"))}</h2>
        <p class="hinweis">${esc(t("kuehl.einrichtenText"))}</p>
        <button type="button" class="knopf glut" data-a="kuehl-einrichtung">${esc(t("kuehl.einrichten"))}</button>
      </div>` : `
      ${!st.bereit ? `<div class="karte hinweisgelb"><div>${esc(t("kuehl.grenzenFehlen"))}</div><button type="button" class="knopf zweit" data-a="kuehl-einrichtung">${esc(t("kuehl.einrichtungAendern"))}</button></div>` : ""}
      <div class="karte">
        <h2>${esc(t("kuehl.heute"))}</h2>
        <div class="gross">${st.heuteGemessen} / ${st.stellen}</div>
        <div class="hinweis">${esc(t(st.heuteGemessen >= st.stellen ? "kuehl.heuteFertig" : st.heuteGemessen ? "kuehl.heuteTeils" : "kuehl.heuteOffen"))}</div>
        ${st.bereit ? `<button type="button" class="knopf ${st.heuteGemessen >= st.stellen && !offen ? "zweit" : "glut"}" data-a="kuehl-rundgang">${esc(t(offen ? "kuehl.weiterRundgang" : "kuehl.starten"))}</button>` : ""}
        ${st.fehlt7 ? `<span class="marke offen">${esc(t("kuehl.luecken7", st.fehlt7))}</span>` : ""}
      </div>
      ${nk.length ? `<div class="karte hinweisgelb"><h2>${esc(t("kuehl.nachkontrollenTitel"))}</h2>
        ${nk.map((x) => `<div class="summenzeile"><span>${esc(stand.kuehlstellen.find((k) => k.id === x.messung.stelle)?.name || "?")} <small class="marke">${fmtZahl(x.messung.wert, 1)} °C · ${esc(zeitKurz(x.messung.zeit))}</small></span><span class="wert ${x.ueberfaellig ? "rot" : ""}">${esc(x.faellig ? t(x.ueberfaellig ? "kuehl.ueberfaellig" : "kuehl.faelligUm", zeitKurz(x.faellig)) : t("kuehl.naechsteMessung"))}</span></div>`).join("")}
        <span class="marke">${esc(t("kuehl.nachkontrolleHinweis"))}</span></div>` : ""}
      <div class="karte">
        <h2>${esc(t("kuehl.stellen"))}</h2>
        <p class="hinweis">${esc(t("kuehl.stellenTippen"))}</p>
        <div class="liste eng">${aktiveStellen(stand).map((k) => { const m = letzteMessung(stand, k.id); return `
          <button type="button" class="zeileknopf" data-a="kuehl-einzel" data-id="${esc(k.id)}" ${st.bereit && !offen ? "" : "disabled"}>${stelleBild(k)}<span><b>${esc(k.name)}</b><small>${esc(artName(k.art))} · ${esc(grenzen(k))}</small></span>
            <span class="${m ? (m.abweichung ? "rot" : "") : "marke"}" style="font-weight:700;white-space:nowrap">${m ? `${fmtZahl(m.wert, 1)} °C` : "–"}<small class="marke" style="display:block;font-weight:400">${m ? esc(datumLesbar(m.datum)) + " " + esc(zeitKurz(m.zeit)) : ""}</small></span></button>`; }).join("")}</div>
        <button type="button" class="zeileknopf" data-a="kuehl-blatt"><span><b>${esc(t("kuehl.blatt"))}</b><small>${esc(t("kuehl.blattKurz"))}</small></span><span class="pfeil">›</span></button>
        <button type="button" class="knopf weich" data-a="kuehl-einrichtung">${esc(t("kuehl.einrichtungAendern"))}</button>
      </div>
      <p class="hinweis">${esc(t("kuehl.haftung"))}</p>`}
    </div>
    ${nav("kuehl")}`;
}

// ---------- Einrichtung ----------
function einrichtungView(stand) {
  const stellen = aktiveStellen(stand);
  return `
    <div class="kopfband"><h1>${esc(t("kuehl.einrichtenTitel"))}</h1><div class="unter">${esc(stand.betrieb.name)}</div></div>
    <div class="inhalt">
      ${stellen.length && !kuehlBereit(stand) ? `<div class="tipp warnband">${esc(t("kuehl.grenzenFehlen"))}</div>` : ""}
      <p class="tipp">${esc(t("kuehl.richtwerte"))}</p>
      <div class="karte">
        <h2>${esc(t("kuehl.stellen"))}</h2>
        <p class="hinweis">${esc(t("kuehl.stellenHinweis"))}</p>
        <div class="liste">${stellen.map((k, i) => `
          <div class="zeile ${stelleBereit(k) ? "an" : "offen"}">
            <div class="oben"><input class="textfeld" data-f="stelle-name:${esc(k.id)}" value="${esc(k.name)}" maxlength="40" placeholder="${esc(t("kuehl.namePlatzhalter"))}">
              <div class="stapel"><button type="button" class="leise" data-a="stelle-hoch" data-id="${esc(k.id)}" ${i === 0 ? "disabled" : ""} aria-label="▲">${sym("chevron-up")}</button><button type="button" class="leise" data-a="stelle-runter" data-id="${esc(k.id)}" ${i === stellen.length - 1 ? "disabled" : ""} aria-label="▼">${sym("chevron-down")}</button></div></div>
            <div class="chips">${KUEHL_ARTEN.map((a) => `<button type="button" class="chip klein ${k.art === a ? "an" : ""}" data-a="stelle-art" data-id="${esc(k.id)}" data-wert="${a}">${esc(artName(a))}</button>`).join("")}</div>
            <div class="packung">
              ${k.art !== "warm" ? `<span class="grenzpaar"><span class="einheit">${esc(t("kuehl.hoechstens"))}</span><input inputmode="text" data-f="stelle-max:${esc(k.id)}" value="${esc(wertAnzeige(k.max))}" placeholder="${esc(String(GRENZEN_STANDARD[k.art].max))}" aria-label="${esc(t("kuehl.hoechstens"))}"><span class="einheit">°C</span></span>` : ""}
              ${k.art === "warm" || k.art === "kuehl" ? `<span class="grenzpaar"><span class="einheit">${esc(t("kuehl.mindestens"))}</span><input inputmode="text" data-f="stelle-min:${esc(k.id)}" value="${esc(wertAnzeige(k.min))}" placeholder="${esc(k.art === "warm" ? String(GRENZEN_STANDARD.warm.min) : "")}" aria-label="${esc(t("kuehl.mindestens"))}"><span class="einheit">°C</span></span>` : ""}
            </div>
            <span class="marke ${grenzenVon(k).standard ? "geschaetzt" : ""}">${esc(grenzen(k))}</span>
            ${!stelleBereit(k) ? `<span class="marke offen">${esc(t("kuehl.grenzenFehlenKurz"))}</span>` : ""}
            <button type="button" class="leise" data-a="stelle-archiv" data-id="${esc(k.id)}">${esc(t("kuehl.stelleWeg"))}</button>
          </div>`).join("")}</div>
        <div class="neu"><input class="textfeld" data-f="stelle-neu" value="${esc(neuName)}" maxlength="40" placeholder="${esc(t("kuehl.namePlatzhalter"))}" autocomplete="off" enterkeyhint="done"><button type="button" class="knopf weich schmal" data-a="stelle-neu">${esc(t("allgemein.hinzufuegen"))}</button></div>
      </div>
      <div class="karte">
        <h2>${esc(t("kuehl.takt"))}</h2>
        <div class="chips">${[1, 2].map((n) => `<button type="button" class="chip ${stand.kuehl.takt === n ? "an" : ""}" data-a="kuehl-takt" data-wert="${n}">${esc(t("kuehl.taktWert", n))}</button>`).join("")}</div>
        <h2>${esc(t("kuehl.ruhetage"))}</h2>
        <div class="chips">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<button type="button" class="chip klein ${stand.kuehl.ruhetage.includes(d) ? "an" : ""}" data-a="kuehl-ruhetag" data-wert="${d}">${esc(t("kuehl.tage." + d))}</button>`).join("")}</div>
        <span class="marke">${esc(t("kuehl.ruhetageHinweis"))}</span>
      </div>
      <div class="karte">
        <h2>${esc(t("kuehl.personen"))}</h2>
        <p class="hinweis">${esc(t("kuehl.personenHinweis"))}</p>
        <div class="chips">${stand.personen.filter((p) => !p.entfernt).map((p) => `<span class="chip klein an">${esc(p.kuerzel)} <button type="button" class="chipx" data-a="person-weg" data-id="${esc(p.id)}" aria-label="${esc(t("kuehl.personWeg"))}">×</button></span>`).join("")}</div>
        <div class="neu"><input class="textfeld" data-f="person-neu" value="${esc(neuKuerzel)}" maxlength="12" placeholder="${esc(t("kuehl.kuerzelPlatzhalter"))}" autocomplete="off" enterkeyhint="done"><button type="button" class="knopf weich schmal" data-a="person-neu">${esc(t("allgemein.hinzufuegen"))}</button></div>
      </div>
      <button type="button" class="knopf ${kuehlBereit(stand) ? "" : "zweit"}" data-a="kuehl-einrichtung-fertig">${esc(t(kuehlBereit(stand) ? "allgemein.fertig" : "kuehl.spaeter"))}</button>
    </div>
    ${nav("kuehl")}`;
}

// ---------- Rundgang ----------
function rundgangView(stand) {
  const r = rundgangOffen(stand);
  const stellen = aktiveStellen(stand);
  if (!r) return rundgangStartView(stand);
  const fertig = stellen.filter((k) => r.messungen.some((m) => m.stelle === k.id)).length;
  const k = station ? stellen.find((x) => x.id === station) : null;
  return `
    <div class="kopfband"><h1>${esc(t("kuehl.rundgang"))}</h1><div class="unter">${esc(datumLesbar(r.datum))}${r.von ? ` · ${esc(kuerzelVon(stand, r.von))}` : ""}${r.nacherfasst ? ` · ${esc(t("kuehl.nacherfasst"))}` : ""}</div></div>
    <div class="inhalt">
      ${k ? stationView(stand, r, k) : `
      <div class="liste">${stellen.map((x) => { const m = r.messungen.find((y) => y.stelle === x.id); const letzte = letzteMessung(stand, x.id); return `
        <button type="button" class="wahl ${m ? "an" : ""} ${m?.abweichung ? "warnung" : ""}" data-a="station" data-id="${esc(x.id)}">
          <span class="haken">${m ? "✓" : ""}</span>
          <span class="fuell"><b>${esc(x.name)}</b><small class="block">${esc(grenzen(x))}${letzte ? ` · ${esc(t("kuehl.zuletzt"))} ${fmtZahl(letzte.wert, 1)} °C` : ""}</small></span>
          <span style="font-weight:800;white-space:nowrap" class="${m?.abweichung ? "rot" : ""}">${m ? (typeof m.wert === "number" ? `${fmtZahl(m.wert, 1)} °C` : esc(t("kuehl.nichtGemessenKurz"))) : "›"}</span>
        </button>`; }).join("")}</div>
      <p class="hinweis mitte">${esc(t("kuehl.rundgangStand", fertig, stellen.length))}${fertig && fertig < stellen.length ? ` · ${esc(t("kuehl.teilAbschlussHinweis"))}` : ""}</p>
      ${fertig > 0 ? `<button type="button" class="knopf glut" data-a="rundgang-abschluss">${esc(fertig === stellen.length ? t("kuehl.abschliessen") : t("kuehl.teilAbschliessen", fertig))}</button>` : ""}
      ${fertig < stellen.length ? `<button type="button" class="knopf zweit" data-a="kuehl-start">${esc(t("kuehl.unterbrechen"))}</button>` : ""}
      <button type="button" class="leise" data-a="rundgang-verwerfen">${esc(t("kuehl.verwerfen"))}</button>`}
    </div>
    ${nav("kuehl", { schnell: false })}`;
}

function rundgangStartView(stand) {
  const personen = stand.personen.filter((p) => !p.entfernt && p.aktiv);
  const H = heute(); const tage = []; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); tage.push(heute(d)); }
  return `
    <div class="kopfband"><h1>${esc(t("kuehl.rundgang"))}</h1><div class="unter">${esc(stand.betrieb.name)}</div></div>
    <div class="inhalt">
      <div class="karte">
        <h2>${esc(t("kuehl.werMisst"))}</h2>
        ${startStelle ? `<div class="hinweis">${esc(t("kuehl.nurStelle", aktiveStellen(stand).find((k) => k.id === startStelle)?.name || ""))}</div>` : ""}
        ${personen.length ? `<div class="chips">${personen.map((p) => `<button type="button" class="chip ${startVon === p.id ? "an" : ""}" data-a="start-von" data-id="${esc(p.id)}">${esc(p.kuerzel)}</button>`).join("")}<button type="button" class="chip ${startVon === "" ? "an" : ""}" data-a="start-von" data-id="">${esc(t("kuehl.ohneKuerzel"))}</button></div>` : `<div class="hinweis">${esc(t("kuehl.keinePersonen"))}</div>`}
        <h2>${esc(t("kuehl.fuerWann"))}</h2>
        <div class="chips">${tage.map((d, i) => `<button type="button" class="chip klein ${(startNach || H) === d ? "an" : ""}" data-a="start-datum" data-wert="${d}">${esc(i === 0 ? t("tag.titel") : i === 1 ? t("tag.gestern") : datumLesbar(d).slice(0, 5))}</button>`).join("")}</div>
        ${startNach && startNach !== H ? `<span class="marke offen">${esc(t("kuehl.nacherfassungHinweis"))}</span>` : ""}
        <button type="button" class="knopf glut" data-a="rundgang-start" ${personen.length && startVon === null ? "disabled" : ""}>${esc(t("kuehl.los"))}</button>
      </div>
    </div>
    ${nav("kuehl")}`;
}

function stationView(stand, r, k) {
  const f = form; const letzte = letzteMessung(stand, k.id);
  const wert = f.wert; const abw = abweichung(k, wert); f.abwGezeigt = typeof wert === "number" && abw;
  const kannSpeichern = typeof wert === "number" ? (!abw || f.massnahmen.length > 0) : !!f.grund;
  return `
    <div class="karte formular">
      <h2>${esc(k.name)} <span class="marke">${esc(grenzen(k))}</span></h2>
      ${f.grund ? "" : `
      <div class="zahlfeld ${abw ? "rot" : ""}"><input inputmode="text" data-f="station-wert" value="${esc(f.wertText)}" placeholder="°C" aria-label="°C" autocomplete="off"><span class="einheit">°C</span></div>
      <span class="marke">${letzte ? esc(t("kuehl.zuletztLang", fmtZahl(letzte.wert, 1), datumLesbar(letzte.datum))) : esc(t("kuehl.ersteMessung"))}${k.art === "tk" ? ` · ${esc(t("kuehl.minusHinweis"))}` : ""}</span>
      ${typeof wert === "number" && abw ? `<div class="karte hinweisrot"><b>${esc(t("kuehl.ausserhalb"))}</b>
        <h2>${esc(t("kuehl.massnahme"))}</h2>
        <div class="chips">${MASSNAHMEN.map((m) => `<button type="button" class="chip klein ${f.massnahmen.includes(m) ? "an" : ""}" data-a="massnahme" data-wert="${m}">${esc(t("kuehl.massnahmen." + m))}</button>`).join("")}</div>
        <input class="textfeld" data-f="station-notiz" value="${esc(f.notiz)}" maxlength="200" placeholder="${esc(t("kuehl.notizPlatzhalter"))}" autocomplete="off">
        <h2>${esc(t("kuehl.nachkontrolle"))}</h2>
        <div class="chips">${["h1", "h2", "naechste"].map((n) => `<button type="button" class="chip klein ${f.nachkontrolle === n ? "an" : ""}" data-a="nachkontrolle" data-wert="${n}">${esc(t("kuehl.nachkontrollen." + n))}</button>`).join("")}</div>
        ${f.massnahmen.includes("weggeworfen") ? wegView(stand, k) : ""}
      </div>` : ""}`}
      ${typeof wert === "number" ? "" : `<h2>${esc(t("kuehl.nichtGemessen"))}</h2>
      <div class="chips">${NICHT_GEMESSEN.map((g) => `<button type="button" class="chip klein ${f.grund === g ? "an" : ""}" data-a="station-grund" data-wert="${g}">${esc(t("kuehl.gruende." + g))}</button>`).join("")}</div>`}
      <button type="button" class="knopf glut" data-a="station-speichern" ${kannSpeichern ? "" : "disabled"}>${esc(t("kuehl.stationFertig"))}</button>
      <button type="button" class="leise" data-a="station-zu">${esc(t("allgemein.abbrechen"))}</button>
    </div>`;
}

// „Ware weggeworfen": was lag drin – Artikel oder frei, Menge; Wert kommt vom Einkaufspreis oder bleibt offen (Chef trägt nach).
function wegView(stand, k) {
  const f = form;
  return `<h2>${esc(t("kuehl.wegTitel"))}</h2>
    <p class="hinweis">${esc(t("kuehl.wegHinweis"))}</p>
    <div class="liste eng">${f.weg.map((w, i) => `<div class="zeile"><div class="oben"><div class="name">${esc(w.name)}<small>${fmtZahl(w.menge, w.einheit === "stk" ? 0 : 2)} ${esc(w.einheit === "stk" ? t("allgemein.stueck") : w.einheit)}${w.wert === null ? ` · ${esc(t("tag.keinPreis"))}` : ` · ${fmtEuro(w.wert, { dezimal: 2 })}`}</small></div><button type="button" class="leise" data-a="weg-weg" data-i="${i}">×</button></div></div>`).join("")}</div>
    <div class="neu"><input class="textfeld" data-f="weg-name" value="${esc(f.wegName)}" maxlength="60" placeholder="${esc(t("kuehl.wegPlatzhalter"))}" autocomplete="off"><input class="textfeld" style="flex:0 0 5em" inputmode="decimal" data-f="weg-menge" value="${esc(wertAnzeige(f.wegMenge))}" placeholder="${esc(t("kuehl.menge"))}" autocomplete="off"></div>
    ${f.wegName.trim() ? `<div class="chips">${(stand.artikel || []).filter((a) => a.name.toLowerCase().includes(f.wegName.trim().toLowerCase())).slice(0, 6).map((a) => `<button type="button" class="chip klein" data-a="weg-artikel" data-name="${esc(a.name)}">${esc(a.name)}</button>`).join("")}</div>` : ""}
    <div class="chips"><button type="button" class="chip klein" data-a="weg-hinzu">${esc(t("allgemein.hinzufuegen"))}</button><button type="button" class="chip klein" data-a="weg-alles">${esc(t("kuehl.wegAlles", k.name))}</button></div>`;
}

// ---------- Monatsblatt ----------
function blattView(stand) {
  const stellen = [...aktiveStellen(stand), ...(stand.kuehlstellen || []).filter((x) => x.archiviert && messungenDerStelle(stand, x.id).length)];
  const k = stellen.find((x) => x.id === blattStelle) || stellen[0];
  const d = new Date(); d.setMonth(d.getMonth() + blattMonat, 1);
  const von = heute(d); const ende = new Date(d.getFullYear(), d.getMonth() + 1, 0); const bis = heute(ende) > heute() ? heute() : heute(ende);
  const mb = k ? monatsblatt(stand, k.id, { von, bis }) : { tage: [], zaehl: {} };
  const monatName = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return `
    <div class="kopfband druckkopf"><h1>${esc(t("kuehl.blatt"))}</h1><div class="unter">${esc(stand.betrieb.name)} · ${esc(k?.name || "")} · ${esc(monatName)}</div></div>
    <div class="inhalt">
      <div class="chips nichtdrucken">${stellen.map((x) => `<button type="button" class="chip klein ${x.id === k?.id ? "an" : ""}" data-a="blatt-stelle" data-id="${esc(x.id)}">${esc(x.name)}${x.archiviert ? ` (${esc(t("kuehl.archiviert"))})` : ""}</button>`).join("")}</div>
      <div class="chips nichtdrucken"><button type="button" class="chip klein ${blattMonat === 0 ? "an" : ""}" data-a="blatt-monat" data-wert="0">${esc(t("listen.monat"))}</button><button type="button" class="chip klein ${blattMonat === -1 ? "an" : ""}" data-a="blatt-monat" data-wert="-1">${esc(t("kuehl.vormonat"))}</button></div>
      <div class="karte">
        <div class="kennzahlen"><span>${esc(t("kuehl.tageImMonat"))}</span>${["puenktlich", "teilweise", "nacherfasst", "nichtGemessen", "fehlt", "ruhetag"].filter((s) => mb.zaehl[s]).map((s) => `<span><b>${mb.zaehl[s]}</b> ${esc(t("kuehl.status." + s))}</span>`).join("")}</div>
        ${k ? `<span class="marke">${esc(artName(k.art))} · ${esc(grenzen(k))} · ${esc(t("kuehl.taktWert", mb.takt))}</span>` : ""}
      </div>
      <div class="monatsblatt">${mb.tage.filter((tg) => tg.status !== "vorher" && tg.status !== "zukunft").slice().reverse().map((tg) => `
        <div class="blattzeile ${tg.status}">
          <span class="datum">${esc(datumLesbar(tg.datum).slice(0, 6))}</span>
          ${tg.messungen.length ? tg.messungen.map((m) => { const weg = (stand.schwund || []).filter((e) => e.messung === m.id && !e.storniert); const erl = m.abweichung && m.nachkontrolle ? nachkontrolleErledigt(stand, m) : null; const gm = [typeof m.min === "number" ? `≥ ${fmtZahl(m.min, 1)}` : "", typeof m.max === "number" ? `≤ ${fmtZahl(m.max, 1)}` : ""].filter(Boolean).join(" · "); return `<span class="messung ${m.abweichung ? "rot" : ""}">${typeof m.wert === "number" ? `${fmtZahl(m.wert, 1)} °C` : esc(grundText(m.grund))} <small>${esc(zeitKurz(m.zeit))}${gm ? ` · ${esc(gm)}${m.grenzeStandard ? " (" + esc(t("kuehl.standard")) + ")" : ""}` : ""}${m.von ? " · " + esc(kuerzelVon(stand, m.von)) : ""}${m.nacherfasst ? " · " + esc(t("kuehl.nacherfasst")) + (m.quelle ? " (" + esc(t("kuehl.quellen." + m.quelle)) + ")" : "") : ""}</small>
            ${m.abweichung ? `<small class="rot">${esc((m.massnahmen || []).map((x) => t("kuehl.massnahmen." + x)).join(", "))}${m.notiz ? " – " + esc(m.notiz) : ""}${weg.length ? " · " + esc(t("kuehl.weggeworfenKurz")) + ": " + esc(weg.map((e) => `${e.ref?.name || "?"} ${fmtZahl(e.menge, e.einheit === "stk" ? 0 : 2)} ${e.einheit === "stk" ? t("allgemein.stueck") : e.einheit}`).join(", ")) : ""}${m.nachkontrolle ? " · " + esc(t("kuehl.nachkontrolle")) + ": " + esc(t("kuehl.nachkontrollen." + m.nachkontrolle.art)) + (erl ? " – " + esc(t("kuehl.erledigt", zeitKurz(erl.zeit), fmtZahl(erl.wert, 1))) : " – " + esc(t("kuehl.offenKurz"))) : ""}</small>` : ""}</span>`; }).join("")
            : `<span class="messung marke">${esc(t("kuehl.status." + tg.status))}</span>`}
        </div>`).join("")}</div>
      <p class="hinweis">${esc(t("kuehl.blattHinweis"))}</p>
      <div class="nichtdrucken"><button type="button" class="knopf zweit" data-a="blatt-drucken">${esc(t("kuehl.drucken"))}</button>
      <button type="button" class="leise" data-a="kuehl-start">‹ ${esc(t("kuehl.titel"))}</button></div>
    </div>
    ${nav("kuehl")}`;
}

// ---------- Aktionen ----------
const leeresForm = () => ({ wert: null, wertText: "", abwGezeigt: false, grund: null, massnahmen: [], notiz: "", nachkontrolle: "h2", weg: [], wegName: "", wegMenge: null });

export function kuehlAktion(name, el, stand, wurzel) {
  const r = rundgangOffen(stand);
  if (name === "kuehl-einrichtung") { ansicht = "einrichtung"; return true; }
  if (name === "kuehl-einrichtung-fertig") { stand.kuehl.eingerichtet = aktiveStellen(stand).length > 0; ansicht = "start"; return true; }
  if (name === "kuehl-start") { ansicht = "start"; station = null; form = null; return true; }
  if (name === "kuehl-rundgang") { if (!kuehlBereit(stand)) { ansicht = "einrichtung"; return true; } ansicht = "rundgang"; station = null; form = null; startVon = null; startNach = null; startStelle = null; return true; }
  if (name === "kuehl-einzel") { if (!kuehlBereit(stand) || rundgangOffen(stand)) return false; ansicht = "rundgang"; station = null; form = null; startVon = null; startNach = null; startStelle = el.dataset.id; return true; }
  if (name === "kuehl-blatt") { ansicht = "blatt"; blattStelle = el.dataset.id || blattStelle; blattMonat = 0; return true; }
  if (name === "blatt-stelle") { blattStelle = el.dataset.id; return true; }
  if (name === "blatt-monat") { blattMonat = Number(el.dataset.wert); return true; }
  if (name === "blatt-drucken") { window.print(); return false; }
  // Einrichtung
  if (name === "stelle-neu") { const n = neuName.trim(); if (!n) return false; if (!stand.kuehl.seit) stand.kuehl.seit = heute(); stand.kuehlstellen.push({ id: uid(), name: n, art: "kuehl", min: null, max: null, reihe: stand.kuehlstellen.length, archiviert: false }); neuName = ""; return true; }
  if (name === "stelle-art") { const k = stand.kuehlstellen.find((x) => x.id === el.dataset.id); if (!k) return false; k.art = el.dataset.wert; if (k.art === "warm") k.max = null; if (k.art === "tk") k.min = null; return true; }
  if (name === "stelle-archiv") { const k = stand.kuehlstellen.find((x) => x.id === el.dataset.id); if (!k || !confirm(t("kuehl.stelleWegFrage", k.name))) return false; k.archiviert = true; return true; } // nie löschen – alte Messungen behalten ihre Stelle
  if (name === "stelle-hoch" || name === "stelle-runter") {
    const liste = aktiveStellen(stand); const i = liste.findIndex((x) => x.id === el.dataset.id); const j = name === "stelle-hoch" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= liste.length) return false; const a = liste[i].reihe; liste[i].reihe = liste[j].reihe; liste[j].reihe = a; if (liste[i].reihe === liste[j].reihe) { liste[i].reihe = j; liste[j].reihe = i; } return true;
  }
  if (name === "kuehl-takt") { stand.kuehl.takt = Number(el.dataset.wert) === 2 ? 2 : 1; return true; }
  if (name === "kuehl-ruhetag") { const d = Number(el.dataset.wert); const i = stand.kuehl.ruhetage.indexOf(d); if (i >= 0) stand.kuehl.ruhetage.splice(i, 1); else if (stand.kuehl.ruhetage.length < 6) stand.kuehl.ruhetage.push(d); return true; } // sieben Ruhetage gibt es nicht
  if (name === "person-neu") { const k = neuKuerzel.trim(); if (!k) return false; stand.personen.push({ id: uid(), kuerzel: k, aktiv: true, entfernt: false }); neuKuerzel = ""; return true; }
  if (name === "person-weg") { const p = stand.personen.find((x) => x.id === el.dataset.id); if (!p || !confirm(t("kuehl.personWegFrage", p.kuerzel))) return false; p.entfernt = true; p.aktiv = false; p.kuerzel = t("kuehl.personAnonym", stand.personen.indexOf(p) + 1); return true; } // Pseudonymisierung: Kürzel weg, Einträge zeigen nur die id
  // Rundgang starten
  if (name === "start-von") { startVon = el.dataset.id; return true; }
  if (name === "start-datum") { startNach = el.dataset.wert; return true; }
  if (name === "rundgang-start") {
    if (!kuehlBereit(stand)) { ansicht = "einrichtung"; return true; }
    const H = heute(); const nach = startNach && startNach !== H;
    rundgangStarten(stand, { von: startVon || null, datum: startNach || H, nacherfasst: nach, quelle: nach ? "zettel" : null, einzel: startStelle });
    station = null; form = null;
    if (startStelle) { station = startStelle; form = leeresForm(); form.k = aktiveStellen(stand).find((x) => x.id === station); startStelle = null; }
    return true;
  }
  if (!r) return false;
  if (name === "station") { station = el.dataset.id; const m = r.messungen.find((x) => x.stelle === station); form = leeresForm(); form.k = aktiveStellen(stand).find((x) => x.id === station); if (m) { form.wert = m.wert; form.wertText = wertAnzeige(m.wert); form.grund = m.grund; form.massnahmen = [...m.massnahmen]; form.notiz = m.notiz; form.nachkontrolle = m.nachkontrolle || "h2"; form.weg = (m.weg || []).map((w) => ({ ...w })); } return true; }
  if (name === "station-zu") { station = null; form = null; return true; }
  if (name === "rundgang-verwerfen") { if (!confirm(t("kuehl.verwerfenFrage"))) return false; stand.rundgaenge = stand.rundgaenge.filter((x) => x.id !== r.id); station = null; form = null; ansicht = "start"; return true; }
  if (name === "rundgang-abschluss") {
    rundgangAbschliessen(stand, r, () => naechsteLfd(wurzel), wurzel.geraet, (n) => t("kuehl.schwundGrund", n));
    station = null; form = null; ansicht = "start"; return "abgeschlossen";
  }
  if (!form) return false;
  if (name === "station-grund") { form.grund = form.grund === el.dataset.wert ? null : el.dataset.wert; if (form.grund) form.wert = null; return true; }
  if (name === "massnahme") { const i = form.massnahmen.indexOf(el.dataset.wert); if (i >= 0) form.massnahmen.splice(i, 1); else form.massnahmen.push(el.dataset.wert); return true; }
  if (name === "nachkontrolle") { form.nachkontrolle = el.dataset.wert; return true; }
  if (name === "weg-artikel") { form.wegName = el.dataset.name; return true; }
  if (name === "weg-hinzu") {
    const n = form.wegName.trim(); if (!n || !(form.wegMenge > 0)) return false;
    const a = (stand.artikel || []).find((x) => x.name === n);
    const einheit = a ? (a.packung?.einheit || a.einheit || "stk") : "stk";
    const e = { ref: a ? { typ: "artikel", name: a.name } : { typ: "frei", name: n }, menge: form.wegMenge, einheit };
    const wert = a ? wertEintrag({ ...e, art: "verderb" }, stand) : null;
    form.weg.push({ name: n, menge: form.wegMenge, einheit, wert, ref: e.ref }); form.wegName = ""; form.wegMenge = null; return true;
  }
  if (name === "weg-alles") { const k = aktiveStellen(stand).find((x) => x.id === station); form.weg.push({ name: t("kuehl.inhaltVon", k.name), menge: 1, einheit: "stk", wert: null, ref: { typ: "frei", name: t("kuehl.inhaltVon", k.name) } }); return true; }
  if (name === "weg-weg") { form.weg.splice(Number(el.dataset.i), 1); return true; }
  if (name === "station-speichern") {
    const k = aktiveStellen(stand).find((x) => x.id === station); if (!k) return false;
    stationEintragen(r, k, form); // „Ware weggeworfen" wird erst beim Abschluss zu Schwund-Einträgen
    station = null; form = null;
    if (r.einzel) { rundgangAbschliessen(stand, r, () => naechsteLfd(wurzel), wurzel.geraet, (n) => t("kuehl.schwundGrund", n)); ansicht = "start"; return "abgeschlossen"; } // Nachmessen einer Stelle: sofort ins Journal
    return true;
  }
  return false;
}

export function kuehlEingabe(feld, wert, stand) {
  if (feld === "stelle-neu") { neuName = wert; return false; }
  if (feld === "person-neu") { neuKuerzel = wert; return false; }
  if (feld.startsWith("stelle-name:")) { const k = stand.kuehlstellen.find((x) => x.id === feld.slice(12)); if (k) k.name = wert.slice(0, 40); return false; }
  if (feld.startsWith("stelle-max:") || feld.startsWith("stelle-min:")) {
    const k = stand.kuehlstellen.find((x) => x.id === feld.slice(11)); if (!k) return false;
    const n = parseTemperatur(wert); if (feld.startsWith("stelle-max:")) k.max = n; else k.min = n; return false;
  }
  if (!form) return false;
  if (feld === "station-wert") {
    form.wertText = wert; form.wert = parseTemperatur(wert); if (form.wert !== null) form.grund = null;
    // Nur neu zeichnen, wenn sich der Abweichungs-Zustand ändert (dann erscheinen oder verschwinden die Maßnahmen); sonst nur den Knopf schalten
    const abw = typeof form.wert === "number" && form.k ? abweichung(form.k, form.wert) : false;
    if (abw !== form.abwGezeigt) { form.abwGezeigt = abw; return true; }
    return "knopf";
  }
  if (feld === "station-notiz") { form.notiz = wert; return false; }
  if (feld === "weg-name") { form.wegName = wert; return true; }
  if (feld === "weg-menge") { form.wegMenge = parseZahl(wert); return false; }
  return false;
}

// Temperaturen dürfen negativ sein (Tiefkühlung) – parseZahl nimmt kein Minus, deshalb hier getrennt.
export function parseTemperatur(v) {
  const s = String(v ?? "").trim().replace(/\s/g, "").replace("−", "-").replace("–", "-");
  if (s === "" || s === "-") return null;
  const neg = s.startsWith("-"); const n = parseZahl(neg ? s.slice(1) : s);
  if (n === null || n > 300 || (neg && n > 100)) return null; // Küche: −100 bis 300 °C
  return neg ? -n : n;
}
export const kuehlFormGueltig = () => { if (!form) return false; if (typeof form.wert === "number") return !(form.k && abweichung(form.k, form.wert)) || form.massnahmen.length > 0; return !!form.grund; };
