// Foto und Upload – Speisekarte fotografieren (Einrichtung und Karte) und den Lauf von der Datei bis zum Text.
// Ein Lauf: Datei wählen → ablegen (Ablage) → auswerten (Auswertung) → Vorschläge → der Wirt bestätigt. Etappe 6a.
import { sym } from "../symbole.js";
import { t, artikelText } from "../i18n.js"; // Paket 6 (17.10.2026): Zutaten in der aktiven Sprache
import { esc, parseZahl, uid, fmtEuro } from "../util.js";
import { ablegen, bildFuerAblage, ablageFluechtig, istPdf, istBild } from "../ablage.js";
import { auswerten, vorwaermen } from "../auswertung.js";
import { vorschlaegeAusText, vorschlaegeUebernehmen, inventurVorschau, kartePruefZahlen, baukastenZutatenOhneVerpackung } from "../karte_lesen.js"; // Trennung 2 (17.10.2026)
import { artikelAbgleichen } from "../karte_daten.js"; // Trennung (17.10.2026)
import { uploadAnlegen, uploadAendern } from "../stamm.js"; // Trennung (17.10.2026): Uploads schreibt das Rechenwerk
import { fehlendeRezepteErgaenzen } from "../rezept_baukasten.js";

// Zustand des laufenden Fotos (flüchtig; das Ergebnis landet erst mit „Übernehmen" im Laden)
let lauf = null;       // { zweck, status: "lesen"|"fertig"|"fehler", schritt, text, upload, fehler, dauerMs }
let vorschlaege = [];  // Speisekarte: [{id, name, preis, vorlage, sicher, an, getraenk}]
let seiten = 0;
let laufUploads = [];  // Uploads dieser Prüfliste – nur sie werden beim Übernehmen als übernommen markiert
// Serie (Pilot 14.10.: „mehrere Bilder gleichzeitig"): Fotos kommen in eine Warteschlange und werden nacheinander gelesen,
// während der Wirt schon das nächste Foto macht. „Fertig" zeigt die Prüfliste, sobald alles gelesen ist.
let warteschlange = []; let laeuft = false; let generation = 0; let sammeln = true;
let serie = { aufgenommen: 0, gelesen: 0, fehler: 0 };

export const fotoLauf = () => lauf;
export function fotoZuruecksetzen() { lauf = null; vorschlaege = []; seiten = 0; laufUploads = []; warteschlange = []; laeuft = false; generation += 1; sammeln = true; serie = { aufgenommen: 0, gelesen: 0, fehler: 0 }; }
// Was die Speisekarten-Strecke gerade zeigt: Fotos sammeln, auf das Lesen warten oder die Prüfliste
export const karteModus = () => (sammeln ? "sammeln" : laeuft || warteschlange.length ? "warten" : vorschlaege.length ? "pruefen" : "sammeln");
export function sammelnBeenden() { sammeln = false; if (!vorschlaege.length && !laeuft && !warteschlange.length) sammeln = true; }
// Abbrechen während des Wartens: Warteschlange stoppen, bereits Gefundenes bleibt in der Prüfliste.
export function serieAbbrechen() { warteschlange = []; generation += 1; laeuft = false; lauf = null; if (!vorschlaege.length) fotoZuruecksetzen(); }
// Was die Fußleiste zeigt: kein Knopf beim Warten, „Fertig" beim Sammeln mit Fotos, „Übernehmen" in der Prüfliste
export function karteFussKnopf(ohne) {
  const m = karteModus();
  if (m === "warten") return "";
  if (m === "pruefen") return `<button type="button" class="knopf glut" data-a="fv-uebernehmen">${esc(t("foto.uebernehmen"))}</button>`;
  if (serie.aufgenommen) return `<button type="button" class="knopf glut" data-a="fv-fertig">${esc(t("foto.fertigPruefen"))}</button>`;
  return ohne;
}
export const karteZeigtPruefliste = () => karteModus() === "pruefen";
export const serieStand = () => ({ ...serie, gerichte: vorschlaege.length, laeuft: laeuft || warteschlange.length > 0 });

// Mehrere Dateien (Galerie-Mehrfachauswahl oder Foto für Foto) in die Warteschlange; gelesen wird eins nach dem anderen.
export async function fotosHinzufuegen(stand, dateien, zweck, neuZeichnen, opts = {}) {
  const gen = generation;
  for (const d of dateien) warteschlange.push({ stand, d, zweck, opts });
  serie.aufgenommen += dateien.length;
  if (opts.fertig) sammeln = false; // aus der Galerie gewählt: alles auf einmal, danach gleich die Prüfliste
  neuZeichnen();
  if (laeuft) return;
  laeuft = true;
  try {
    while (warteschlange.length && gen === generation) {
      const j = warteschlange.shift();
      const r = await fotoVerarbeiten(j.stand, j.d, j.zweck, neuZeichnen, j.opts);
      if (gen !== generation) return;
      serie.gelesen += 1; if (!r || r.status === "fehler") serie.fehler += 1;
    }
  } finally { if (gen === generation) { laeuft = false; neuZeichnen(); } }
}
// Nur einen Rechnungs-Lauf beenden (Beleg-Bildschirm verlassen), eine offene Speisekarten-Prüfliste bleibt
export function rechnungsLaufZuruecksetzen() { if (lauf && lauf.zweck !== "speisekarte") lauf = null; }
export const fotoKennung = () => (lauf ? `${lauf.zweck}:${lauf.status}:${seiten}` : "leer");
export const hatVorschlaege = () => vorschlaege.length > 0;

// Die beiden Eingänge: Kamera (capture) und Galerie/Datei. Ein <label> um ein unsichtbares <input>, damit es am iPhone sicher öffnet.
export function fotoKnoepfe(zweck, { kamera = "foto.kamera", datei = "foto.datei" } = {}) {
  return `
    <label class="knopf glut fotoknopf">${sym("camera")} ${esc(t(kamera))}
      <input type="file" accept="image/*" capture="environment" data-f="foto" data-zweck="${zweck}" class="dateifeld"></label>
    <label class="knopf zweit">${sym("file-text")} ${esc(t(datei))}
      <input type="file" accept="image/*,application/pdf,.pdf" multiple data-f="foto" data-zweck="${zweck}" class="dateifeld"></label>`;
}

// Datei verarbeiten. neuZeichnen() wird bei jedem Zwischenstand gerufen. Rückgabe: Lauf.
export async function fotoVerarbeiten(stand, datei, zweck, neuZeichnen, { geraet = null } = {}) {
  if (!datei) return null;
  if (!istPdf(datei) && !istBild(datei)) { lauf = { zweck, status: "fehler", fehler: t("foto.fehlerArt") }; neuZeichnen(); return lauf; }
  const mein = { zweck, status: "lesen", schritt: "ablegen", text: "", upload: null, fehler: null };
  lauf = mein;
  const verworfen = () => lauf !== mein; // Laden gewechselt, abgebrochen oder neues Foto: Ergebnis gehört nicht mehr hierher (Review 6a)
  neuZeichnen();
  const kopf = { id: uid(), zweck, erfasst: new Date().toISOString(), geraet, status: "neu" };
  try {
    const fuerAblage = await bildFuerAblage(datei);
    const abgelegt = await ablegen(fuerAblage, { name: datei.name || "", zweck, laden: stand.id });
    const eintrag = uploadAnlegen(stand, { ...kopf, datei: abgelegt, auswertung: null, ergebnis: null }); // Trennung (17.10.2026)
    mein.upload = eintrag; if (zweck === "speisekarte") laufUploads.push(eintrag);
  } catch (e) {
    // Ablegen fehlgeschlagen (zu groß, Speicher voll): trotzdem lesen, nur ohne Kopie auf dem Gerät
    mein.hinweis = e.grund === "gross" ? t("foto.zuGross") : t("foto.nichtAbgelegt");
  }
  if (verworfen()) return null;
  try {
    mein.schritt = "lesen"; neuZeichnen();
    const r = await auswerten(datei, { zweck, fortschritt: (f) => { if (verworfen()) return; mein.schritt = f.schritt; mein.seite = f.seite; mein.von = f.von; neuZeichnen(); } });
    uploadAendern(mein.upload, { status: "gelesen", auswertung: { quelle: r.quelle, art: r.art, dauerMs: r.dauerMs, zeichen: r.text.length } });
    if (verworfen()) return null;
    mein.text = r.text; mein.dauerMs = r.dauerMs; mein.status = "fertig";
    if (r.nichtGelesen) mein.hinweis = t("foto.seitenGrenze", r.seiten, r.seiten + r.nichtGelesen);
    if (zweck === "speisekarte") {
      const neu = vorschlaegeAusText(r.text, stand).filter((v) => !vorschlaege.some((x) => x.name.toLowerCase() === v.name.toLowerCase()));
      // Trennung (17.10.2026): Gruppe einmal beim Hinzufügen festlegen (vorher beim Zeichnen), damit ein Gericht beim Korrigieren nicht wegspringt.
      // „Bitte prüfen" nur für Lesefehler (Name, Preis); eine Rezept-Rückfrage steht als Hinweis in der Zeile unter „Erkannt"
      for (const v of neu) if (v.gruppe === undefined) v.gruppe = grund(v) && grund(v) !== "rezept" ? "pruefen" : "erkannt";
      vorschlaege.push(...neu); seiten += 1;
      mein.neu = neu.length;
      if (!neu.length) { mein.status = "fehler"; mein.fehler = t("foto.nichtsErkannt"); }
    } else if (!r.text.trim()) { mein.status = "fehler"; mein.fehler = t("foto.nichtsErkannt"); }
  } catch (e) {
    console.warn(e);
    uploadAendern(mein.upload, { status: "fehler" });
    if (verworfen()) return null;
    mein.status = "fehler";
    mein.fehler = t({ art: "foto.fehlerArt", laden: "foto.fehlerLaden", zeit: "foto.fehlerZeit", gross: "foto.fehlerGross" }[e.grund] || "foto.fehlerLesen");
  }
  neuZeichnen();
  return mein;
}

// Beim Öffnen des Foto-Bildschirms die Texterkennung schon laden.
let gewaermt = false;
export function fotoVorbereiten() { if (!gewaermt) { gewaermt = true; vorwaermen(); } }

const schrittText = () => !lauf ? t("foto.lesen") : lauf.schritt === "seite" ? t("foto.seite", lauf.seite, lauf.von) : lauf.schritt === "ablegen" ? t("foto.ablegen") : t("foto.lesen");

// ---------- Speisekarte: aufnehmen ----------
export function karteFotoView(stand) {
  fotoVorbereiten();
  const modus = karteModus();
  if (modus === "warten") { const st = serieStand(); return `
    <div class="fotolauf" role="status" aria-live="polite"><div class="kreisel" aria-hidden="true"></div><h1 class="frage">${esc(st.aufgenommen > 1 ? t("foto.wartenAufLesen") : schrittText())}</h1>
      <p class="hinweis">${st.aufgenommen > 1 ? esc(t("foto.serieFotos", st.aufgenommen, st.gelesen)) + " · " + esc(t("foto.serieGerichte", st.gerichte)) : esc(t("foto.lesenHinweis"))}</p>
      <button type="button" class="leise" data-a="foto-abbrechen">${esc(t(st.gerichte ? "foto.lesenStoppen" : "allgemein.abbrechen"))}</button></div>`; }
  const st = serieStand();
  return `
    <h1 class="frage">${esc(t(st.aufgenommen ? "foto.karteWeitere" : "foto.karteFrage"))}</h1>
    <p class="hinweis">${esc(t(st.aufgenommen ? "foto.serieHinweis" : "foto.karteHinweis"))}</p>
    ${st.aufgenommen ? `<div class="karte serie" role="status" aria-live="polite">${st.laeuft ? `<div class="kreisel klein" aria-hidden="true"></div>` : `<span class="haken" aria-hidden="true">✓</span>`}
      <div><b>${esc(t("foto.serieFotos", st.aufgenommen, st.gelesen))}</b><small class="marke block">${esc(t("foto.serieGerichte", st.gerichte))}${st.fehler ? " · " + esc(t("foto.serieFehler", st.fehler)) : ""}</small></div></div>` : ""}
    ${lauf?.status === "fehler" && !st.aufgenommen ? `<div class="tipp warnband">${esc(lauf.fehler)}</div>` : ""}
    ${lauf?.hinweis ? `<p class="tipp">${esc(lauf.hinweis)}</p>` : ""}
    <div class="fotofeld">${fotoKnoepfe("speisekarte", st.aufgenommen ? { kamera: "foto.naechstesFoto", datei: "foto.galerieMehrere" } : { kamera: "foto.kamera", datei: "foto.galerieMehrere" })}</div>
    <p class="hinweis klein">${esc(t(ablageFluechtig() ? "foto.datenschutzFluechtig" : "foto.datenschutz"))}</p>`;
}

// ---------- Speisekarte: prüfen ----------

// Kompakte Prüfliste (Kapitän 14.10., Entwurf A mit Teilen von B): oben „Bitte prüfen" offen zum Bearbeiten,
// darunter „Erkannt" als eine Zeile pro Gericht – antippen klappt die Zeile zum Bearbeiten auf.
let aufgeklappt = null;
const grund = (v) => v.preis === null ? "preis" : v.pruefen ? "name" : v.zweiPreise && v.preisPruefen ? "zweiPreise" : v.preisPruefen ? "preisUnsicher" : v.sicher === "vorschlag" ? "rezept" : null;
const punkt = (v) => !v.an ? "grau" : v.preis === null ? "rot" : (v.pruefen || v.preisPruefen || v.sicher === "vorschlag") ? "gelb" : "";
function bearbeiter(v) {
  return `<div class="fvbearb">
      <input class="textfeld" data-f="fv-name:${v.id}" value="${esc(v.name)}" maxlength="80" aria-label="${esc(t("foto.name"))}">
      <div class="fvreihe"><div class="betrag klein"><input inputmode="decimal" data-f="fv-preis:${v.id}" value="${esc(v.preis === null ? "" : v.preis.toFixed(2).replace(".", ","))}" placeholder="0,00" aria-label="${esc(t("foto.preis"))}"><span class="einheit">€</span></div>
        ${v.sicher === "vorschlag" ? `<button type="button" class="chip klein" data-a="fv-rezept-ja" data-id="${v.id}">${esc(t("foto.rezeptJa"))}</button><button type="button" class="chip klein" data-a="fv-rezept-nein" data-id="${v.id}">${esc(t("foto.rezeptNein"))}</button>` : ""}
        ${v.preis !== null && ["name", "preisUnsicher", "zweiPreise"].includes(grund(v)) ? `<button type="button" class="chip klein an" data-a="fv-stimmt" data-id="${v.id}">${esc(t("waage.ok"))}</button>` : ""}
        <button type="button" class="chip klein leise" data-a="fv-an" data-id="${v.id}">${esc(t("foto.weglassen"))}</button></div>
      <small class="marke">${v.sicher === "sicher" ? "✓ " + esc(t("foto.rezeptVon", v.vorlage)) : v.sicher === "vorschlag" ? esc(t("foto.rezeptVorschlag", v.vorlage)) : v.sicher === "getraenk" ? esc(t("foto.getraenk")) : v.sicher === "baukasten" ? esc(t("foto.rezeptStartwert", v.bau.zutaten.length)) : esc(t("foto.ohneRezept"))}</small>
      ${v.sicher === "baukasten" ? `<small class="marke">${esc(baukastenZutatenOhneVerpackung(v.bau).map((z) => `${artikelText(z.name)} ${String(z.menge).replace(".", ",")}${z.einheit === "stk" ? " " + t("allgemein.stueck") : " " + z.einheit}`).join(" · "))}</small>` : ""}
    </div>`;
}
function fvZeile(v) {
  const g = grund(v); const auf = aufgeklappt === v.id && v.an;
  const notiz = !v.an ? "" : g === "preis" ? `<small class="rot">${esc(t("foto.preisFehltKurz"))}</small>` : g === "name" ? `<small class="gelb">${esc(t("foto.namePruefen"))}</small>` : g === "preisUnsicher" ? `<small class="gelb">${esc(t("foto.preisPruefen"))}</small>` : g === "zweiPreise" ? `<small class="gelb">${esc(t("foto.zweiPreise", v.zweiPreise.map((x) => x.toFixed(2).replace(".", ",")).join(" / ")))}</small>` : g === "rezept" ? `<small class="gelb">${esc(t("foto.rezeptVorschlag", v.vorlage))}</small>` : "";
  return `<div class="fvz ${v.an ? "" : "aus"} ${auf ? "auf" : ""}">
      <div class="fvkopf"><button type="button" class="fvtipp" data-a="fv-auf" data-id="${v.id}" aria-expanded="${auf}"><span class="pkt ${punkt(v)}" aria-hidden="true"></span><span class="n">${esc(v.name)}${notiz}</span><span class="p ${v.preis === null ? "leer" : ""}">${v.preis === null ? esc(t("foto.fehlt")) : esc(fmtEuro(v.preis, { dezimal: 2 }))}</span></button>
        <button type="button" class="fvx" data-a="fv-an" data-id="${v.id}" aria-pressed="${!v.an}" aria-label="${esc(t(v.an ? "foto.weglassen" : "foto.zurueckholen"))}: ${esc(v.name)}">${v.an ? "✕" : "↺"}</button></div>
      ${auf ? bearbeiter(v) : ""}
    </div>`;
}
export function kartePruefenView() {
  // Trennung (17.10.2026): die Gruppe (prüfen/erkannt) steht schon seit dem Hinzufügen fest – Zeichnen schreibt nichts
  const kz = kartePruefZahlen(vorschlaege); const pr = kz.pruefen, ok = kz.erkannt; // Trennung 2 (17.10.2026): Zahlen aus js/karte_lesen.js
  return `
    <h1 class="frage">${esc(t("foto.pruefenFrage", vorschlaege.length))}</h1>
    <p class="hinweis">${esc(t(pr.length ? "foto.pruefenHinweisKurz" : "foto.pruefenHinweisAlle"))}</p>
    ${pr.length ? `<h2 class="fvgrp">${esc(t("foto.gruppePruefen", pr.filter((v) => v.an && grund(v)).length))}</h2>
    <div class="fvliste offen">${pr.map((v) => `<div class="fvz ${v.an ? "" : "aus"} karte-${(punkt(v) || "ok").replace("grau", "ok")}">
      <div class="fvkopf"><span class="fvgrund">${esc(t(v.an ? { preis: "foto.preisFehltKurz", name: "foto.namePruefen", preisUnsicher: "foto.preisPruefen", zweiPreise: "foto.zweiPreiseKurz", rezept: "foto.rezeptBestaetigen" }[grund(v) || ""] || "foto.erledigt" : "foto.weggelassen"))}</span>
        ${v.an ? "" : `<button type="button" class="fvx" data-a="fv-an" data-id="${v.id}" aria-label="${esc(t("foto.zurueckholen"))}: ${esc(v.name)}">↺</button>`}</div>
      ${v.an ? bearbeiter(v) : `<div class="n durch">${esc(v.name)}</div>`}</div>`).join("")}</div>` : ""}
    ${ok.length ? `<h2 class="fvgrp">${esc(t("foto.gruppeErkannt", ok.length))}</h2>
    <div class="fvliste">${ok.map(fvZeile).join("")}</div>` : ""}
    <p class="hinweis klein">${esc(t("foto.inventurVorschau", kz.an, kz.zutaten))} · ${esc(t("foto.inventurHinweis", kz.mitRezept))}</p>
    <div class="fotofeld">${fotoKnoepfe("speisekarte", { kamera: "foto.nochSeite", datei: "foto.nochDatei" })}</div>`;
}

export function kartePruefenEingabe(feld, wert) {
  const m = feld.match(/^fv-(name|preis):(.+)$/); if (!m) return false;
  const v = vorschlaege.find((x) => x.id === m[2]); if (!v) return false;
  if (m[1] === "name") { v.name = wert.slice(0, 80); v.pruefen = false; } else { v.preis = parseZahl(wert); v.preisPruefen = false; }
  return false;
}

export function kartePruefenAktion(name, el) {
  if (name === "fv-fertig") { sammelnBeenden(); return true; }
  if (name === "fv-mehr") { sammeln = true; return true; }
  const v = vorschlaege.find((x) => x.id === el.dataset.id);
  if (name === "fv-an" && v) { v.an = !v.an; if (!v.an && aufgeklappt === v.id) aufgeklappt = null; return true; }
  if (name === "fv-auf" && v) { aufgeklappt = aufgeklappt === v.id ? null : v.id; return true; }
  if (name === "fv-stimmt" && v) { v.pruefen = false; v.preisPruefen = false; return true; } // Baris 19.10.2026: Name und Preis stimmen – bestätigen ohne zu tippen
  if (name === "fv-rezept-ja" && v) { v.sicher = "sicher"; return true; }
  if (name === "fv-rezept-nein" && v) { v.vorlage = null; v.sicher = v.getraenk ? "getraenk" : "ohne"; return true; }
  return false;
}

// Übernehmen: Gerichte in die Karte, Zutaten in die Artikelliste (Inventurliste). Rückgabe für die Meldung.
export function karteUebernehmen(stand) {
  const r = vorschlaegeUebernehmen(stand, vorschlaege);
  fehlendeRezepteErgaenzen(stand); // auch ältere Gerichte ohne Rezept bekommen jetzt Startwerte
  artikelAbgleichen(stand);
  for (const u of laufUploads) if (u.status === "gelesen") uploadAendern(u, { status: "uebernommen", ergebnis: { gerichte: r.neu, aktualisiert: r.aktualisiert } });
  const inv = inventurVorschau(stand);
  fotoZuruecksetzen();
  return { ...r, artikel: inv.anzahl };
}
