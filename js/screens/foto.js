// Foto und Upload – Speisekarte fotografieren (Einrichtung und Karte) und den Lauf von der Datei bis zum Text.
// Ein Lauf: Datei wählen → ablegen (Ablage) → auswerten (Auswertung) → Vorschläge → der Wirt bestätigt. Etappe 6a.
import { t } from "../i18n.js";
import { esc, parseZahl, wertAnzeige, uid } from "../util.js";
import { ablegen, bildFuerAblage, ablageFluechtig, istPdf, istBild } from "../ablage.js";
import { auswerten, vorwaermen } from "../auswertung.js";
import { vorschlaegeAusText, vorschlaegeUebernehmen, inventurVorschau } from "../karte_lesen.js";
import { artikelAusGerichten } from "../engine.js";
import { VORLAGEN } from "../data/katalog.js";

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
    <label class="knopf glut fotoknopf"><span aria-hidden="true">📷</span> ${esc(t(kamera))}
      <input type="file" accept="image/*" capture="environment" data-f="foto" data-zweck="${zweck}" class="dateifeld"></label>
    <label class="knopf zweit"><span aria-hidden="true">📄</span> ${esc(t(datei))}
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
  const eintrag = { id: uid(), zweck, erfasst: new Date().toISOString(), geraet, status: "neu", datei: null, auswertung: null, ergebnis: null };
  try {
    const fuerAblage = await bildFuerAblage(datei);
    eintrag.datei = await ablegen(fuerAblage, { name: datei.name || "", zweck, laden: stand.id });
    stand.uploads.push(eintrag); mein.upload = eintrag; if (zweck === "speisekarte") laufUploads.push(eintrag);
  } catch (e) {
    // Ablegen fehlgeschlagen (zu groß, Speicher voll): trotzdem lesen, nur ohne Kopie auf dem Gerät
    mein.hinweis = e.grund === "gross" ? t("foto.zuGross") : t("foto.nichtAbgelegt");
  }
  if (verworfen()) return null;
  try {
    mein.schritt = "lesen"; neuZeichnen();
    const r = await auswerten(datei, { zweck, fortschritt: (f) => { if (verworfen()) return; mein.schritt = f.schritt; mein.seite = f.seite; mein.von = f.von; neuZeichnen(); } });
    if (mein.upload) { mein.upload.status = "gelesen"; mein.upload.auswertung = { quelle: r.quelle, art: r.art, dauerMs: r.dauerMs, zeichen: r.text.length }; }
    if (verworfen()) return null;
    mein.text = r.text; mein.dauerMs = r.dauerMs; mein.status = "fertig";
    if (r.nichtGelesen) mein.hinweis = t("foto.seitenGrenze", r.seiten, r.seiten + r.nichtGelesen);
    if (zweck === "speisekarte") {
      const neu = vorschlaegeAusText(r.text, stand).filter((v) => !vorschlaege.some((x) => x.name.toLowerCase() === v.name.toLowerCase()));
      vorschlaege.push(...neu); seiten += 1;
      mein.neu = neu.length;
      if (!neu.length) { mein.status = "fehler"; mein.fehler = t("foto.nichtsErkannt"); }
    } else if (!r.text.trim()) { mein.status = "fehler"; mein.fehler = t("foto.nichtsErkannt"); }
  } catch (e) {
    console.warn(e);
    if (mein.upload) mein.upload.status = "fehler";
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
      <div><b>${esc(t("foto.serieFotos", st.aufgenommen, st.gelesen))}</b><small class="marke" style="display:block">${esc(t("foto.serieGerichte", st.gerichte))}${st.fehler ? " · " + esc(t("foto.serieFehler", st.fehler)) : ""}</small></div></div>` : ""}
    ${lauf?.status === "fehler" && !st.aufgenommen ? `<div class="tipp warnband">${esc(lauf.fehler)}</div>` : ""}
    ${lauf?.hinweis ? `<p class="tipp">${esc(lauf.hinweis)}</p>` : ""}
    <div class="fotofeld">${fotoKnoepfe("speisekarte", st.aufgenommen ? { kamera: "foto.naechstesFoto", datei: "foto.galerieMehrere" } : { kamera: "foto.kamera", datei: "foto.galerieMehrere" })}</div>
    <p class="hinweis klein">${esc(t(ablageFluechtig() ? "foto.datenschutzFluechtig" : "foto.datenschutz"))}</p>`;
}

// ---------- Speisekarte: prüfen ----------

export function kartePruefenView() {
  const an = vorschlaege.filter((v) => v.an);
  const mitRezept = an.filter((v) => v.vorlage).length;
  const zutaten = new Set(); for (const v of an) { if (v.vorlage) for (const l of Object.values(VORLAGEN)) { const x = l.find((y) => y.name === v.vorlage); if (x) x.zutaten.forEach((z) => zutaten.add(z[0])); } else if (v.getraenk) zutaten.add(v.name); }
  const marke = (v) => v.sicher === "sicher" ? `<span class="marke gruen">✓ ${esc(t("foto.rezeptVon", v.vorlage))}</span>`
    : v.sicher === "vorschlag" ? `<span class="marke geschaetzt">? ${esc(t("foto.rezeptVorschlag", v.vorlage))}</span>`
    : v.sicher === "getraenk" ? `<span class="marke">${esc(t("foto.getraenk"))}</span>`
    : `<span class="marke offen">${esc(t("foto.ohneRezept"))}</span>`;
  return `
    <h1 class="frage">${esc(t("foto.pruefenFrage", vorschlaege.length))}</h1>
    <p class="hinweis">${esc(t("foto.pruefenHinweis"))}</p>
    <div class="liste">${vorschlaege.map((v) => `
      <div class="zeile ${v.an ? "an" : "storno"}">
        <div class="oben">
          <input class="textfeld" data-f="fv-name:${v.id}" value="${esc(v.name)}" maxlength="60" aria-label="${esc(t("foto.name"))}" ${v.an ? "" : "disabled"}>
          <button type="button" class="schalter ${v.an ? "an" : ""}" data-a="fv-an" data-id="${v.id}" aria-pressed="${v.an}" aria-label="${esc(v.name)}"></button>
        </div>
        <div class="unterzeile">
          <div class="betrag klein"><input inputmode="decimal" data-f="fv-preis:${v.id}" value="${esc(wertAnzeige(v.preis))}" aria-label="${esc(t("foto.preis"))}" ${v.an ? "" : "disabled"}><span class="einheit">€</span></div>
          ${marke(v)}${v.preis === null && v.an ? ` <span class="marke offen">${esc(t("foto.preisFehlt"))}</span>` : ""}
        </div>
        ${v.sicher === "vorschlag" && v.an ? `<div class="chips"><button type="button" class="chip klein" data-a="fv-rezept-ja" data-id="${v.id}">${esc(t("foto.rezeptJa"))}</button><button type="button" class="chip klein" data-a="fv-rezept-nein" data-id="${v.id}">${esc(t("foto.rezeptNein"))}</button></div>` : ""}
      </div>`).join("")}</div>
    <div class="karte gruenrand"><div class="mid">${esc(t("foto.inventurVorschau", an.length, zutaten.size))}</div><small class="marke">${esc(t("foto.inventurHinweis", mitRezept))}</small></div>
    <div class="fotofeld">${fotoKnoepfe("speisekarte", { kamera: "foto.nochSeite", datei: "foto.nochDatei" })}</div>`;
}

export function kartePruefenEingabe(feld, wert) {
  const m = feld.match(/^fv-(name|preis):(.+)$/); if (!m) return false;
  const v = vorschlaege.find((x) => x.id === m[2]); if (!v) return false;
  if (m[1] === "name") v.name = wert.slice(0, 60); else v.preis = parseZahl(wert);
  return false;
}

export function kartePruefenAktion(name, el) {
  if (name === "fv-fertig") { sammelnBeenden(); return true; }
  if (name === "fv-mehr") { sammeln = true; return true; }
  const v = vorschlaege.find((x) => x.id === el.dataset.id);
  if (name === "fv-an" && v) { v.an = !v.an; return true; }
  if (name === "fv-rezept-ja" && v) { v.sicher = "sicher"; return true; }
  if (name === "fv-rezept-nein" && v) { v.vorlage = null; v.sicher = v.getraenk ? "getraenk" : "ohne"; return true; }
  return false;
}

// Übernehmen: Gerichte in die Karte, Zutaten in die Artikelliste (Inventurliste). Rückgabe für die Meldung.
export function karteUebernehmen(stand) {
  const r = vorschlaegeUebernehmen(stand, vorschlaege);
  stand.artikel = artikelAusGerichten(stand);
  for (const u of laufUploads) if (u.status === "gelesen") { u.status = "uebernommen"; u.ergebnis = { gerichte: r.neu, aktualisiert: r.aktualisiert }; }
  const inv = inventurVorschau(stand);
  fotoZuruecksetzen();
  return { ...r, artikel: inv.anzahl };
}
