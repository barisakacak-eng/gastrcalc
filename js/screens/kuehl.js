// 20.10.2026 (Laden-Test, Arabisch): Temperaturen stehen in einer Links-nach-rechts-Isolierung (U+2066 … U+2069), sonst zeigte RTL „C° 7,0 ≥“ statt „≤ 7,0 °C“.
// Etappe 4: Kühlkontrolle – Einrichtung der Kühlstellen, der Rundgang, das Monatsblatt.
// Regeln aus der Vorprüfung des Gremiums: Grenzen setzt der Betrieb (die App nennt nur Anhaltspunkte), kein Wert ist vorbelegt,
// „nicht gemessen" mit Grund ist erlaubt, der Rundgang ist unterbrechbar und bis zum Abschluss änderbar, danach nur anhängen.
import { einklappen } from "./bausteine.js"; // Prüfer 19.10.2026: Haftungstext eingeklappt (15-Wörter-Regel im Laden)
import { sym } from "../symbole.js";
import { FOTOS } from "../data/fotos.js";
import { t, sprache, artikelText } from "../i18n.js";
import { esc, parseZahl, fmtZahl, fmtEuro, heute, wertAnzeige, parseTemperatur } from "../util.js";
import { KUEHL_ARTEN, MASSNAHMEN, NICHT_GEMESSEN, aktiveStellen, kuehlBereit, stelleBereit, abweichung, rundgangOffen, rundgangStarten, stationEintragen, rundgangAbschliessen,
  letzteMessung, offeneNachkontrollen, nachkontrolleErledigt, monatsblatt, kuehlStatus, messungenDerStelle, wertEintrag, grenzenVon, GRENZEN_STANDARD,
  ruhetagUmschalten, rundgangVollstaendig, rundgangVerwerfen } from "../engine.js"; // W2-H
// Trennung (17.10.2026): Einrichtung (Stellen, Grenzen, Takt, Personen) schreibt über js/stamm.js
import { kuehlstelleAnlegen, kuehlstelleArtSetzen, kuehlstelleArchivieren, kuehlstelleVerschieben, kuehlstelleNameSetzen, kuehlstelleGrenzeSetzen, kuehlEingerichtetSetzen, kuehlTaktSetzen, personAnlegen, personEntfernen, personenAusgeschieden } from "../stamm.js";
import { naechsteLfd } from "../store.js";
import { nav } from "./nav.js";
import { datumLesbar } from "./tag.js";
import { zeitKurz } from "../anzeige_text.js"; // Trennung 2 (17.10.2026)
import { personalAktiv, anredeTeam, schichtPerson } from "./personal.js"; // D: im Personal-Modus kein Euro; 27.10.2026: Schicht-Person misst
import { kuehlstelleAnzeige as kn } from "../kuehlname.js"; // Paket 6 (17.10.2026): Standardnamen folgen der Sprache, eigene bleiben
import { normalisieren, suchRang } from "../data/suchnamen.js";
import { kuehlWerVorschlag, kuehlNaechsteStelle, rundgangVonSetzen } from "../laden_zahlen.js"; // Laden-Umbau (20.10.2026): Rundgang startet direkt an der ersten Stelle

// Piktogramm je Kühlstelle (Sanjis k-*-Bilder; Theke nach Name)
const stelleBild = (k) => { const n = k.art === "warm" ? "k-warmhalter" : k.art === "tk" ? "k-tiefkuehler" : k.typ === "saladette" || /theke|vitrine|saladet/i.test(k.name || "") ? "k-theke" : k.typ === "getraenke" ? "k-getraenke" : "k-kuehlschrank";
  const f = { "k-theke": "k-saladette-foto", "k-kuehlschrank": "k-kuehlschrank-lebensmittel-foto" }[n] || n + "-foto"; // echtes Foto (Sanji Welle 3), sobald vorhanden; Getränke/Lebensmittel getrennt (24.10.2026)
  if (n === "k-getraenke" && !FOTOS.has(f)) return `<img class="gerichtbild mini pikto" src="bilder/k-kuehlschrank.svg" alt="">`;
  return FOTOS.has(f) ? `<img class="gerichtbild mini" src="foto/${f}.webp" alt="">` : `<img class="gerichtbild mini pikto" src="bilder/${n}.svg" alt="">`; };
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
  if (station) { station = null; form = null; if (personalAktiv()) ansicht = "start"; return true; } // 27.10.2026: Personal startet direkt im Messfeld – Zurück führt zur Kühlung, nicht in die Stellenliste
  if (ansicht !== "start") { ansicht = "start"; return true; }
  return false;
}

const artName = (a) => t("kuehl.arten." + a);
// Grenzen einer Stelle als Text; ohne eigene Grenze gilt der Standard (Etappe 5), das steht dann dabei.
const grenzen = (k) => { const g = grenzenVon(k); return [typeof g.min === "number" ? `\u2066≥\u00a0${fmtZahl(g.min, 1)}\u00a0°C\u2069` : "", typeof g.max === "number" ? `\u2066≤\u00a0${fmtZahl(g.max, 1)}\u00a0°C\u2069` : ""].filter(Boolean).join(" · ") + (g.standard && !personalAktiv() ? ` (${t("kuehl.standard")})` : ""); }; // 27.10.2026 (Persona-Test): Personal braucht „Standard“ nicht
const kuerzelVon = (stand, id) => stand.personen.find((p) => p.id === id)?.kuerzel || "";
const zeitOderStrich = (iso) => (iso ? zeitKurz(iso) : "–"); // W2-H: Nachtrag ohne Uhrzeit. Trennung 2 (17.10.2026): Uhrzeit aus js/anzeige_text.js
const grundText = (g) => NICHT_GEMESSEN.includes(g) ? t("kuehl.gruende." + g) : t("kuehl.nichtGemessenKurz");

// ---------- Hauptansicht ----------
const chefHinweis = () => `<p class="hinweis">${sym("lock")} ${esc(t("sicherheit.chefRichtetEin"))}</p>`; // W2-S: statt Einrichtung im Personal-Modus
// Laden-Umbau (20.10.2026): im Laden nur Kopf „Kühlung“, Karte „Heute gemessen x / y“ mit „Rundgang starten“ und die Stellen mit ihrem Wert.
// Die Grenze einer Stelle steht nur, wenn ihr letzter Wert außerhalb lag (sonst nach dem Antippen im Messfeld). Dauerhinweise (Lücken der
// letzten 7 Tage, „Eine Stelle antippen …“, Verantwortung) stehen im Büro bzw. hinter „?“. Im Büro (buero: true) bleiben Monatsblatt,
// Einrichtung und der 7-Tage-Hinweis auf dieser Seite.
// Laden-Schablone (27.10.2026): Zeki sagt in einem Satz, was los ist – statt „0 / 4“.
function zekiKuehl(stand, st, fertig) {
  const warm = aktiveStellen(stand).map((k) => ({ k, m: letzteMessung(stand, k.id) })).find((x) => x.m?.abweichung && x.m.datum === heute());
  if (warm) return `<p class="zeki-zeile a-rot" role="status">${esc(anredeTeam(t("kuehl.zeki.warm", kn(warm.k)), stand))}</p>`;
  if (fertig) return `<p class="zeki-zeile a-gruen" role="status">${esc(t("kuehl.zeki.fertig"))}</p>`;
  return `<p class="zeki-zeile" role="status">${esc(t("kuehl.zeki.offen", Math.max(0, st.stellen - st.heuteGemessen)))}</p>`;
}

export function kuehlView(stand, { buero = false } = {}) {
  const pers = personalAktiv(); // W2-S (p02 K2): Einrichtung, Grenzen, Verwerfen und Vortage gibt es im Personal-Modus nicht
  if (pers && ansicht === "einrichtung") ansicht = "start";
  if (ansicht === "einrichtung") return einrichtungView(stand);
  if (ansicht === "rundgang") return rundgangView(stand);
  if (ansicht === "blatt") return blattView(stand);
  const st = kuehlStatus(stand);
  const offen = rundgangOffen(stand);
  const nk = offeneNachkontrollen(stand);
  const fertig = st.eingerichtet && st.heuteGemessen >= st.stellen && !offen;
  return `
    <div class="kopfband kuehlkopf"><h1>${esc(t("ebene.tabs.kuehl"))}</h1></div>
    <div class="inhalt kuehl-laden">
      ${!st.eingerichtet ? `
      <div class="karte">
        <h2>${esc(t("kuehl.einrichtenTitel"))}</h2>
        ${pers ? chefHinweis() : `<button type="button" class="knopf glut" data-a="kuehl-einrichtung">${esc(t("kuehl.einrichten"))}</button>`}
      </div>` : `
      ${!st.bereit ? `<div class="karte hinweisgelb"><div>${esc(t("kuehl.grenzenFehlen"))}</div>${pers ? chefHinweis() : `<button type="button" class="knopf zweit" data-a="kuehl-einrichtung">${esc(t("kuehl.einrichtungAendern"))}</button>`}</div>` : ""}
      ${buero ? "" : zekiKuehl(stand, st, fertig)}
      <div class="karte kuehlstand ${fertig ? "fertig" : ""}">
        ${buero ? `<div class="ks-zeile"><span>${esc(t("kuehl.heute"))}</span><b class="zahl">\u2066${st.heuteGemessen} / ${st.stellen}\u2069</b></div>` : ""}
        ${st.bereit ? `<button type="button" class="knopf ${fertig ? "zweit" : "glut"}" data-a="${buero ? "kuehl-rundgang" : "kuehl-rundgang-los"}">${esc(t(offen ? "kuehl.weiterRundgang" : "ladenSchirm.rundgangStarten"))}</button>` : ""}
        ${buero && st.fehlt7 ? `<span class="marke offen">${esc(t("kuehl.luecken7", st.fehlt7))}</span>` : ""}
      </div>
      ${nk.length ? `<div class="karte hinweisgelb"><h2>${esc(t("kuehl.nachkontrollenTitel"))}</h2>
        ${nk.map((x) => `<div class="summenzeile"><span>${esc(kn(stand.kuehlstellen.find((k) => k.id === x.messung.stelle)) || "?")} <small class="marke">\u2066${fmtZahl(x.messung.wert, 1)}\u00a0°C\u2069 · ${esc(zeitOderStrich(x.messung.zeit))}</small></span><span class="wert ${x.ueberfaellig ? "rot" : ""}">${esc(x.faellig ? t(x.ueberfaellig ? "kuehl.ueberfaellig" : "kuehl.faelligUm", zeitOderStrich(x.faellig)) : t("kuehl.naechsteMessung"))}</span></div>`).join("")}</div>` : ""}
      <div class="liste eng kuehlliste">${aktiveStellen(stand).map((k) => { const m = letzteMessung(stand, k.id); return `
        <button type="button" class="zeileknopf ${m?.abweichung ? "abw" : ""}" data-a="kuehl-einzel" data-id="${esc(k.id)}" ${st.bereit && !offen ? "" : "disabled"} aria-label="${esc(kn(k))} · ${esc(grenzen(k))}">${stelleBild(k)}<span><b>${esc(kn(k))}</b>${m?.abweichung ? `<small class="rot">${esc(grenzen(k))}</small>` : ""}</span>
          <span class="kwert ${m ? (m.abweichung ? "rot" : "ok") : "marke"}">${m ? `\u2066${fmtZahl(m.wert, 1)}\u00a0°C\u2069` : "–"}</span></button>`; }).join("")}</div>
      ${buero ? `<button type="button" class="zeileknopf" data-a="kuehl-blatt"><span><b>${esc(t("kuehl.blatt"))}</b><small>${esc(t("kuehl.blattKurz"))}</small></span><span class="pfeil">›</span></button>
      ${pers ? "" : `<button type="button" class="knopf weich" data-a="kuehl-einrichtung">${esc(t("kuehl.einrichtungAendern"))}</button>`}
      ${einklappen("kuehl-haftung", t("kuehl.haftungTitel"), `<p class="hinweis">${esc(t("kuehl.haftung"))}</p>`)}` : ""}`}
    </div>
    ${nav("kuehl")}`;
}

// ---------- Einrichtung ----------
// Kürzel ausgeschiedener Mitarbeiter (18.10.2026): wer ausgeschieden ist, steht in keiner Auswahl mehr (Schicht, Rundgang, Putzen) –
// hier im Büro steht er mit Datum, dazu der Satz, dass alte Einträge und Nachweise erhalten bleiben. Löschen nach der Aufbewahrungsfrist kommt später.
function ausgeschiedenView(stand) {
  const aus = personenAusgeschieden(stand);
  return `${aus.length ? `<p class="hinweis" data-ausgeschieden="${aus.length}">${esc(t("amtW2.ausgeschiedeneListe", aus.map((p) => (p.ausgeschieden ? t("amtW2.ausgeschiedenAm", p.kuerzel, datumLesbar(p.ausgeschieden)) : t("amtW2.ausgeschieden", p.kuerzel))).join(", ")))}</p>` : ""}
        <p class="hinweis">${esc(t("amtW2.personAltHinweis"))}</p>`;
}

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
            <div class="oben"><input class="textfeld" data-f="stelle-name:${esc(k.id)}" value="${esc(kn(k))}" maxlength="40" placeholder="${esc(t("kuehl.namePlatzhalter"))}">
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
        ${ausgeschiedenView(stand)}
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
      ${personenWahl(stand, r)}
      ${k ? stationView(stand, r, k) : `
      <div class="liste">${stellen.map((x) => { const m = r.messungen.find((y) => y.stelle === x.id); const letzte = letzteMessung(stand, x.id); return `
        <button type="button" class="wahl ${m ? "an" : ""} ${m?.abweichung ? "warnung" : ""}" data-a="station" data-id="${esc(x.id)}">
          <span class="haken">${m ? (m.abweichung ? "!" : "✓") : ""}</span>
          <span class="fuell"><b>${esc(kn(x))}</b><small class="block">${esc(grenzen(x))}${letzte ? ` · ${esc(t("kuehl.zuletzt"))} \u2066${fmtZahl(letzte.wert, 1)}\u00a0°C\u2069` : ""}</small></span>
          <span style="font-weight:800;white-space:nowrap" class="${m?.abweichung ? "rot" : ""}">${m ? (typeof m.wert === "number" ? `\u2066${fmtZahl(m.wert, 1)}\u00a0°C\u2069` : esc(t("kuehl.nichtGemessenKurz"))) : "›"}</span>
        </button>`; }).join("")}</div>
      <p class="hinweis mitte">${esc(t("kuehl.rundgangStand", fertig, stellen.length))}${fertig && fertig < stellen.length ? ` · ${esc(t("kuehl.teilAbschlussHinweis"))}` : ""}</p>
      ${fertig > 0 ? `<button type="button" class="knopf glut" data-a="rundgang-abschluss">${esc(fertig === stellen.length ? t("kuehl.abschliessen") : t("kuehl.teilAbschliessen", fertig))}</button>` : ""}
      ${fertig < stellen.length ? `<button type="button" class="knopf zweit" data-a="kuehl-start">${esc(t("kuehl.unterbrechen"))}</button>` : ""}
      ${personalAktiv() ? "" : `<button type="button" class="leise" data-a="rundgang-verwerfen">${esc(t("kuehl.verwerfen"))}</button>`}`}
    </div>
    ${nav("kuehl", { schnell: false })}`;
}

// Laden-Umbau (20.10.2026): wer misst, ist vorbelegt; bei mehreren Personen hier mit einem Tipp änderbar (Kürzel, keine Wörter)
function personenWahl(stand, r) {
  const ps = stand.personen.filter((p) => !p.entfernt && p.aktiv !== false);
  if (ps.length < 2 || r.messungen.length || personalAktiv()) return ""; // Personal: die Schicht-Person misst
  return `<div class="chips rg-wer">${ps.map((p) => `<button type="button" class="chip klein ${r.von === p.id ? "an" : ""}" data-a="rg-von" data-id="${esc(p.id)}" aria-pressed="${r.von === p.id}">${esc(p.kuerzel)}</button>`).join("")}</div>`;
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
        ${personalAktiv() ? "" : `<h2>${esc(t("kuehl.fuerWann"))}</h2>
        <div class="chips">${tage.map((d, i) => `<button type="button" class="chip klein ${(startNach || H) === d ? "an" : ""}" data-a="start-datum" data-wert="${d}">${esc(i === 0 ? t("tag.titel") : i === 1 ? t("tag.gestern") : datumLesbar(d).slice(0, 5))}</button>`).join("")}</div>
        ${startNach && startNach !== H ? `<span class="marke offen">${esc(t("kuehl.nacherfassungHinweis"))}</span>` : ""}`}
        <button type="button" class="knopf glut" data-a="rundgang-start" ${personen.length && startVon === null ? "disabled" : ""}>${esc(t("kuehl.los"))}</button>
      </div>
    </div>
    ${nav("kuehl")}`;
}

// 27.10.2026 (Persona-Test Vater): „18“ beim Tiefkühler ist fast immer „−18“ mit vergessenem Minus – erst fragen, statt sofort Maßnahmen zu verlangen
const minusVergessen = (k, wert, abw) => k?.art === "tk" && typeof wert === "number" && wert >= 5 && abw && !abweichung(k, -wert);
function stationView(stand, r, k) {
  const f = form; const letzte = letzteMessung(stand, k.id);
  const wert = f.wert; const abw = abweichung(k, wert); f.abwGezeigt = typeof wert === "number" && abw;
  const kannSpeichern = typeof wert === "number" ? (!abw || f.massnahmen.length > 0) : !!f.grund;
  // 27.10.2026 (Persona-Test Personal, 15-Wörter-Regel): im Personal-Modus ohne „Erste Messung“ und „(Standard)“, Nachkontrolle (vorbelegt: in 2 Stunden)
  // und „nicht gemessen“ erst auf Tipp (Knopf statt Überschrift und Chips), kurze Maßnahmen-Namen
  const pers = personalAktiv();
  const marke = [letzte ? (pers ? `${t("kuehl.zuletzt")} \u2066${fmtZahl(letzte.wert, 1)}\u00a0°C\u2069` : t("kuehl.zuletztLang", fmtZahl(letzte.wert, 1), datumLesbar(letzte.datum))) : pers ? "" : t("kuehl.ersteMessung"), k.art === "tk" ? t("kuehl.minusHinweis") : ""].filter(Boolean).join(" · ");
  const nachkontrolleChips = `<div class="chips">${["h1", "h2", "naechste"].map((n) => `<button type="button" class="chip klein ${f.nachkontrolle === n ? "an" : ""}" data-a="nachkontrolle" data-wert="${n}">${esc(t("kuehl.nachkontrollen." + n))}</button>`).join("")}</div>`;
  const grundChips = `<div class="chips">${NICHT_GEMESSEN.map((g) => `<button type="button" class="chip klein ${f.grund === g ? "an" : ""}" data-a="station-grund" data-wert="${g}">${esc(t("kuehl.gruende." + g))}</button>`).join("")}</div>`;
  return `
    <div class="karte formular">
      <h2>${esc(kn(k))} <span class="marke">${esc(grenzen(k))}</span></h2>
      ${f.grund ? "" : `
      <div class="zahlfeld ${abw ? "rot" : ""}"><input inputmode="text" data-f="station-wert" value="${esc(f.wertText)}" aria-label="°C" autocomplete="off"><span class="einheit">°C</span></div>
      ${marke ? `<span class="marke">${esc(marke)}</span>` : ""}
      ${minusVergessen(k, wert, abw) ? `<button type="button" class="knopf zweit kuehl-minus" data-a="station-minus">${esc(t("kuehl.minusFrage", fmtZahl(wert, Number.isInteger(wert) ? 0 : 1)))}</button>` : ""}
      ${typeof wert === "number" && abw ? `<div class="karte hinweisrot">${pers ? "" : `<b>${esc(t("kuehl.ausserhalb"))}</b>`}
        <h2>${esc(t("kuehl.massnahme"))}</h2>
        <div class="chips">${MASSNAHMEN.map((m) => `<button type="button" class="chip klein ${f.massnahmen.includes(m) ? "an" : ""}" data-a="massnahme" data-wert="${m}">${esc(t((pers ? "kuehl.massnahmenKurz." : "kuehl.massnahmen.") + m))}</button>`).join("")}</div>
        <input class="textfeld" data-f="station-notiz" value="${esc(f.notiz)}" maxlength="200" placeholder="${esc(t("kuehl.notizPlatzhalter"))}" autocomplete="off">
        ${pers && !f.nkAuf ? `<button type="button" class="leise" data-a="station-nk-auf">${esc(t("kuehl.nachkontrolle"))} ›</button>` : `<h2>${esc(t("kuehl.nachkontrolle"))}</h2>
        ${nachkontrolleChips}`}
        ${f.massnahmen.includes("weggeworfen") ? wegView(stand, k) : ""}
      </div>` : ""}`}
      ${typeof wert === "number" ? "" : pers && !f.grund && !f.nichtAuf ? `<button type="button" class="leise" data-a="station-nicht-auf">${esc(t("kuehl.nichtGemessenKurz"))} ›</button>` : pers ? grundChips : `<h2>${esc(t("kuehl.nichtGemessen"))}</h2>
      ${grundChips}`}
      <button type="button" class="knopf glut" data-a="station-speichern" ${kannSpeichern ? "" : "disabled"}>${esc(t("kuehl.stationFertig"))}</button>
      <button type="button" class="leise" data-a="station-zu">${esc(t("allgemein.abbrechen"))}</button>
    </div>`;
}

// „Ware weggeworfen": was lag drin – Artikel oder frei, Menge; Wert kommt vom Einkaufspreis oder bleibt offen (Chef trägt nach).
function wegView(stand, k) {
  const f = form;
  return `<h2>${esc(t("kuehl.wegTitel"))}</h2>
    ${personalAktiv() ? "" : `<p class="hinweis">${esc(t("kuehl.wegHinweis"))}</p>`}
    <div class="liste eng">${f.weg.map((w, i) => `<div class="zeile"><div class="oben"><div class="name">${esc(artikelText(w.name))}<small>${fmtZahl(w.menge, w.einheit === "stk" ? 0 : 2)} ${esc(w.einheit === "stk" ? t("allgemein.stueck") : w.einheit)}${personalAktiv() ? "" : w.wert === null ? ` · ${esc(t("tag.keinPreis"))}` : ` · ${fmtEuro(w.wert, { dezimal: 2 })}`}</small></div><button type="button" class="leise" data-a="weg-weg" data-i="${i}">×</button></div></div>`).join("")}</div>
    <div class="neu"><input class="textfeld" data-f="weg-name" value="${esc(artikelText(f.wegName))}" maxlength="60" placeholder="${esc(t("kuehl.wegPlatzhalter"))}" autocomplete="off"><input class="textfeld" style="flex:0 0 5em" inputmode="decimal" data-f="weg-menge" value="${esc(wertAnzeige(f.wegMenge))}" placeholder="${esc(t("kuehl.menge"))}" autocomplete="off"></div>
    ${f.wegName.trim() ? `<div class="chips">${(stand.artikel || []).filter((a) => suchRang(a.name, normalisieren(f.wegName.trim())) >= 0).slice(0, 6).map((a) => `<button type="button" class="chip klein" data-a="weg-artikel" data-name="${esc(a.name)}">${esc(artikelText(a.name))}</button>`).join("")}</div>` : ""}
    <div class="chips"><button type="button" class="chip klein" data-a="weg-hinzu">${esc(t("allgemein.hinzufuegen"))}</button><button type="button" class="chip klein" data-a="weg-alles">${esc(t("kuehl.wegAlles", kn(k)))}</button></div>`;
}

// ---------- Monatsblatt ----------
function blattView(stand) {
  const stellen = [...aktiveStellen(stand), ...(stand.kuehlstellen || []).filter((x) => x.archiviert && messungenDerStelle(stand, x.id).length)];
  const k = stellen.find((x) => x.id === blattStelle) || stellen[0];
  const d = new Date(); d.setMonth(d.getMonth() + blattMonat, 1);
  const von = heute(d); const ende = new Date(d.getFullYear(), d.getMonth() + 1, 0); const bis = heute(ende) > heute() ? heute() : heute(ende);
  const mb = k ? monatsblatt(stand, k.id, { von, bis }) : { tage: [], zaehl: {} };
  const monatText = d.toLocaleDateString(sprache(), { month: "long", year: "numeric" });
  return `
    <div class="kopfband druckkopf"><h1>${esc(t("kuehl.blatt"))}</h1><div class="unter">${esc(stand.betrieb.name)} · ${esc(k?.name || "")} · ${esc(monatText)}</div></div>
    <div class="inhalt">
      <div class="chips nichtdrucken">${stellen.map((x) => `<button type="button" class="chip klein ${x.id === k?.id ? "an" : ""}" data-a="blatt-stelle" data-id="${esc(x.id)}">${esc(kn(x))}${x.archiviert ? ` (${esc(t("kuehl.archiviert"))})` : ""}</button>`).join("")}</div>
      <div class="chips nichtdrucken"><button type="button" class="chip klein ${blattMonat === 0 ? "an" : ""}" data-a="blatt-monat" data-wert="0">${esc(t("listen.monat"))}</button><button type="button" class="chip klein ${blattMonat === -1 ? "an" : ""}" data-a="blatt-monat" data-wert="-1">${esc(t("kuehl.vormonat"))}</button></div>
      <div class="karte">
        <div class="kennzahlen"><span>${esc(t("kuehl.tageImMonat"))}</span>${["puenktlich", "teilweise", "nacherfasst", "nichtGemessen", "aus", "fehlt", "ruhetag"].filter((s) => mb.zaehl[s]).map((s) => `<span><b>${mb.zaehl[s]}</b> ${esc(s === "aus" ? t("amtW2.statusAus") : t("kuehl.status." + s))}</span>`) /* W2-H: „aus“ */.join("")}</div>
        ${k ? `<span class="marke">${esc(artName(k.art))} · ${esc(grenzen(k))} · ${esc(t("kuehl.taktWert", mb.takt))}</span>` : ""}
      </div>
      <div class="monatsblatt">${mb.tage.filter((tg) => tg.status !== "vorher" && tg.status !== "zukunft").slice().reverse().map((tg) => `
        <div class="blattzeile ${tg.status}">
          <span class="datum">${esc(datumLesbar(tg.datum).slice(0, 6))}</span>
          ${tg.messungen.length ? tg.messungen.map((m) => { const weg = (stand.schwund || []).filter((e) => e.messung === m.id && !e.storniert); const erl = m.abweichung && m.nachkontrolle ? nachkontrolleErledigt(stand, m) : null; const gm = [typeof m.min === "number" ? `≥ ${fmtZahl(m.min, 1)}` : "", typeof m.max === "number" ? `≤ ${fmtZahl(m.max, 1)}` : ""].filter(Boolean).join(" · "); return `<span class="messung ${m.abweichung ? "rot" : ""}">${typeof m.wert === "number" ? `\u2066${fmtZahl(m.wert, 1)}\u00a0°C\u2069` : esc(grundText(m.grund))} <small>${esc(zeitOderStrich(m.zeit))}${gm ? ` · ${esc(gm)}${m.grenzeStandard ? " (" + esc(t("kuehl.standard")) + ")" : ""}` : ""}${m.von ? " · " + esc(kuerzelVon(stand, m.von)) : ""}${m.nacherfasst ? " · " + esc(t("kuehl.nacherfasst")) + (m.quelle ? " (" + esc(t("kuehl.quellen." + m.quelle)) + ")" : "") : ""}</small>
            ${m.abweichung ? `<small class="rot">${esc((m.massnahmen || []).map((x) => t("kuehl.massnahmen." + x)).join(", "))}${m.notiz ? " – " + esc(m.notiz) : ""}${weg.length ? " · " + esc(t("kuehl.weggeworfenKurz")) + ": " + esc(weg.map((e) => `${e.ref?.name || "?"} ${fmtZahl(e.menge, e.einheit === "stk" ? 0 : 2)} ${e.einheit === "stk" ? t("allgemein.stueck") : e.einheit}`).join(", ")) : ""}${m.nachkontrolle ? " · " + esc(t("kuehl.nachkontrolle")) + ": " + esc(t("kuehl.nachkontrollen." + m.nachkontrolle.art)) + (erl ? " – " + esc(t("kuehl.erledigt", zeitOderStrich(erl.zeit), fmtZahl(erl.wert, 1))) : " – " + esc(t("kuehl.offenKurz"))) : ""}</small>` : ""}</span>`; }).join("")
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
  if (name === "kuehl-einrichtung-fertig") { kuehlEingerichtetSetzen(stand); ansicht = "start"; return true; }
  if (name === "kuehl-start") { ansicht = "start"; station = null; form = null; return true; }
  if (name === "kuehl-rundgang") { if (!kuehlBereit(stand)) { ansicht = personalAktiv() ? "start" : "einrichtung"; return true; } ansicht = "rundgang"; station = null; form = null; startVon = null; startNach = null; startStelle = null; return true; } // W2-S: Personal ohne Einrichtung
  // Laden-Umbau (20.10.2026): „Rundgang starten“ im Laden – Name des Messenden vorbelegt (letzter bzw. erste Person), heute, sofort die erste
  // Stelle ohne Wert. Läuft schon ein Rundgang, geht es an seiner ersten offenen Stelle weiter. Wer misst, lässt sich oben im Rundgang mit einem Tipp ändern (personenWahl).
  if (name === "kuehl-rundgang-los") {
    if (!kuehlBereit(stand)) { ansicht = personalAktiv() ? "start" : "einrichtung"; return true; }
    const von = personalAktiv() ? schichtPerson(stand) || null : kuehlWerVorschlag(stand); // 27.10.2026: im Personal-Modus misst die Schicht-Person, keine Frage „Wer misst?“
    const offen = rundgangOffen(stand) || rundgangStarten(stand, { von, datum: heute() });
    ansicht = "rundgang"; startVon = null; startNach = null; startStelle = null;
    station = kuehlNaechsteStelle(stand, offen); form = station ? { ...leeresForm(), k: aktiveStellen(stand).find((x) => x.id === station) } : null;
    return true;
  }
  if (name === "kuehl-einzel") { if (!kuehlBereit(stand) || rundgangOffen(stand)) return false; ansicht = "rundgang"; station = null; form = null; startVon = null; startNach = null; startStelle = el.dataset.id;
    if (personalAktiv()) { startVon = schichtPerson(stand) || ""; return kuehlAktion("rundgang-start", el, stand); } // 27.10.2026: Schicht-Person misst, direkt ins Messfeld
    return true; }
  if (name === "kuehl-blatt") { ansicht = "blatt"; blattStelle = el.dataset.id || blattStelle; blattMonat = 0; return true; }
  if (name === "blatt-stelle") { blattStelle = el.dataset.id; return true; }
  if (name === "blatt-monat") { blattMonat = Number(el.dataset.wert); return true; }
  if (name === "blatt-drucken") { window.print(); return false; }
  // Einrichtung
  if (name === "stelle-neu") { const n = neuName.trim(); if (!n) return false; kuehlstelleAnlegen(stand, { name: n, art: "kuehl" }); neuName = ""; return true; }
  if (name === "stelle-art") return kuehlstelleArtSetzen(stand, el.dataset.id, el.dataset.wert);
  if (name === "stelle-archiv") { const k = stand.kuehlstellen.find((x) => x.id === el.dataset.id); if (!k || !confirm(t("kuehl.stelleWegFrage", kn(k)))) return false; return kuehlstelleArchivieren(stand, k.id); } // nie löschen – alte Messungen behalten ihre Stelle
  if (name === "stelle-hoch" || name === "stelle-runter") return kuehlstelleVerschieben(stand, el.dataset.id, name === "stelle-hoch" ? -1 : 1);
  if (name === "kuehl-takt") { kuehlTaktSetzen(stand, el.dataset.wert); return true; }
  if (name === "kuehl-ruhetag") { ruhetagUmschalten(stand, Number(el.dataset.wert)); return true; } // W2-H: gilt ab heute (Verlauf), sieben Ruhetage gibt es nicht
  if (name === "person-neu") { const k = neuKuerzel.trim(); if (!k) return false; personAnlegen(stand, k); neuKuerzel = ""; return true; }
  if (name === "person-weg") { const p = stand.personen.find((x) => x.id === el.dataset.id); if (!p || !confirm(t("amtW2.personWegFrage", p.kuerzel))) return false; return personEntfernen(stand, p.id, heute()); } // W2-H (p03 H3): Kürzel bleibt in alten Einträgen, gekennzeichnet „ausgeschieden“
  // Rundgang starten
  if (name === "start-von") { startVon = el.dataset.id; return true; }
  if (name === "start-datum") { startNach = el.dataset.wert; return true; }
  if (name === "rundgang-start") {
    if (!kuehlBereit(stand)) { ansicht = personalAktiv() ? "start" : "einrichtung"; return true; } // W2-S
    if (personalAktiv()) startNach = null; // W2-S: im Personal-Modus nur heute
    const H = heute(); const nach = startNach && startNach !== H;
    rundgangStarten(stand, { von: startVon || null, datum: startNach || H, nacherfasst: nach, quelle: nach ? "zettel" : null, einzel: startStelle });
    station = null; form = null;
    if (startStelle) { station = startStelle; form = leeresForm(); form.k = aktiveStellen(stand).find((x) => x.id === station); startStelle = null; }
    return true;
  }
  if (!r) return false;
  if (name === "rg-von") return rundgangVonSetzen(stand, r, el.dataset.id || null);
  if (name === "station") { station = el.dataset.id; const m = r.messungen.find((x) => x.stelle === station); form = leeresForm(); form.k = aktiveStellen(stand).find((x) => x.id === station); if (m) { form.wert = m.wert; form.wertText = wertAnzeige(m.wert); form.grund = m.grund; form.massnahmen = [...m.massnahmen]; form.notiz = m.notiz; form.nachkontrolle = m.nachkontrolle || "h2"; form.weg = (m.weg || []).map((w) => ({ ...w })); } return true; }
  if (name === "station-zu") { station = null; form = null; return true; }
  if (name === "rundgang-verwerfen") { if (!confirm(t("kuehl.verwerfenFrage"))) return false; rundgangVerwerfen(stand, r.id); station = null; form = null; ansicht = "start"; return true; }
  if (name === "rundgang-abschluss") {
    rundgangAbschliessen(stand, r, () => naechsteLfd(wurzel), wurzel.geraet, (n) => t("kuehl.schwundGrund", n));
    station = null; form = null; ansicht = "start"; return "abgeschlossen";
  }
  if (!form) return false;
  if (name === "station-nicht-auf") { form.nichtAuf = true; return true; } // 27.10.2026: Personal – Gründe erst auf Tipp
  if (name === "station-nk-auf") { form.nkAuf = true; return true; }
  if (name === "station-minus") { if (typeof form?.wert === "number" && form.wert > 0) { form.wert = -form.wert; form.wertText = "-" + form.wertText.trim().replace(/^\+/, ""); } return true; }
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
    if (!r.einzel && !rundgangVollstaendig(stand, r)) { // Gremium 1 (24.10.2026): nach dem Speichern direkt die nächste offene Stelle, kein Umweg über die Übersicht
      station = kuehlNaechsteStelle(stand, r); form = station ? { ...leeresForm(), k: aktiveStellen(stand).find((x) => x.id === station) } : null; return true;
    }
    if (r.einzel || rundgangVollstaendig(stand, r)) { rundgangAbschliessen( /* W2-H (p01 K3): nach der letzten Stelle schließt sich der Rundgang selbst */stand, r, () => naechsteLfd(wurzel), wurzel.geraet, (n) => t("kuehl.schwundGrund", n)); ansicht = "start"; return "abgeschlossen"; } // Nachmessen einer Stelle: sofort ins Journal
    return true;
  }
  return false;
}

export function kuehlEingabe(feld, wert, stand) {
  if (feld === "stelle-neu") { neuName = wert; return false; }
  if (feld === "person-neu") { neuKuerzel = wert; return false; }
  if (feld.startsWith("stelle-name:")) { kuehlstelleNameSetzen(stand, feld.slice(12), wert); return false; }
  if (feld.startsWith("stelle-max:") || feld.startsWith("stelle-min:")) { kuehlstelleGrenzeSetzen(stand, feld.slice(11), feld.startsWith("stelle-max:") ? "max" : "min", parseTemperatur(wert)); return false; }
  if (!form) return false;
  if (feld === "station-wert") {
    form.wertText = wert; form.wert = parseTemperatur(wert); if (form.wert !== null) form.grund = null;
    // Nur neu zeichnen, wenn sich der Abweichungs-Zustand ändert (dann erscheinen oder verschwinden die Maßnahmen); sonst nur den Knopf schalten
    const abw = typeof form.wert === "number" && form.k ? abweichung(form.k, form.wert) : false;
    if (abw !== form.abwGezeigt) { form.abwGezeigt = abw; return true; }
    return "knopf";
  }
  if (feld === "station-notiz") { form.notiz = wert; return false; }
  if (feld === "weg-name") { // 17.10.2026: angezeigt wird der übersetzte Name, gespeichert bleibt der deutsche Katalogname
    const treffer = (stand?.artikel || []).find((x) => artikelText(x.name) === wert.trim()); form.wegName = treffer ? treffer.name : wert; return true; }
  if (feld === "weg-menge") { form.wegMenge = parseZahl(wert); return false; }
  return false;
}

export const kuehlFormGueltig = () => { if (!form) return false; if (typeof form.wert === "number") return !(form.k && abweichung(form.k, form.wert)) || form.massnahmen.length > 0; return !!form.grund; };
