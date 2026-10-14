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

export const fotoLauf = () => lauf;
export function fotoZuruecksetzen() { lauf = null; vorschlaege = []; seiten = 0; }
export const fotoKennung = () => (lauf ? `${lauf.zweck}:${lauf.status}:${seiten}` : "leer");
export const hatVorschlaege = () => vorschlaege.length > 0;

// Die beiden Eingänge: Kamera (capture) und Galerie/Datei. Ein <label> um ein unsichtbares <input>, damit es am iPhone sicher öffnet.
export function fotoKnoepfe(zweck, { kamera = "foto.kamera", datei = "foto.datei" } = {}) {
  return `
    <label class="knopf glut fotoknopf"><span aria-hidden="true">📷</span> ${esc(t(kamera))}
      <input type="file" accept="image/*" capture="environment" data-f="foto" data-zweck="${zweck}" class="dateifeld"></label>
    <label class="knopf zweit"><span aria-hidden="true">📄</span> ${esc(t(datei))}
      <input type="file" accept="image/*,application/pdf,.pdf" data-f="foto" data-zweck="${zweck}" class="dateifeld"></label>`;
}

// Datei verarbeiten. neuZeichnen() wird bei jedem Zwischenstand gerufen. Rückgabe: Lauf.
export async function fotoVerarbeiten(stand, datei, zweck, neuZeichnen, { geraet = null } = {}) {
  if (!datei) return null;
  if (!istPdf(datei) && !istBild(datei)) { lauf = { zweck, status: "fehler", fehler: t("foto.fehlerArt") }; neuZeichnen(); return lauf; }
  lauf = { zweck, status: "lesen", schritt: "ablegen", text: "", upload: null, fehler: null };
  neuZeichnen();
  const eintrag = { id: uid(), zweck, erfasst: new Date().toISOString(), geraet, status: "neu", datei: null, auswertung: null, ergebnis: null };
  try {
    const fuerAblage = await bildFuerAblage(datei);
    eintrag.datei = await ablegen(fuerAblage, { name: datei.name || "", zweck, laden: stand.id });
    stand.uploads.push(eintrag); lauf.upload = eintrag;
  } catch (e) {
    // Ablegen fehlgeschlagen (zu groß, Speicher voll): trotzdem lesen, nur ohne Kopie auf dem Gerät
    lauf.hinweis = e.grund === "gross" ? t("foto.zuGross") : t("foto.nichtAbgelegt");
  }
  try {
    lauf.schritt = "lesen"; neuZeichnen();
    const r = await auswerten(datei, { zweck, fortschritt: (f) => { lauf.schritt = f.schritt; lauf.seite = f.seite; lauf.von = f.von; neuZeichnen(); } });
    lauf.text = r.text; lauf.dauerMs = r.dauerMs; lauf.status = "fertig";
    if (lauf.upload) { lauf.upload.status = "gelesen"; lauf.upload.auswertung = { quelle: r.quelle, art: r.art, dauerMs: r.dauerMs, zeichen: r.text.length }; }
    if (zweck === "speisekarte") {
      const neu = vorschlaegeAusText(r.text, stand).filter((v) => !vorschlaege.some((x) => x.name.toLowerCase() === v.name.toLowerCase()));
      vorschlaege.push(...neu); seiten += 1;
      if (!neu.length) { lauf.status = "fehler"; lauf.fehler = t("foto.nichtsErkannt"); }
    } else if (!r.text.trim()) { lauf.status = "fehler"; lauf.fehler = t("foto.nichtsErkannt"); }
  } catch (e) {
    console.warn(e);
    lauf.status = "fehler"; lauf.fehler = e.grund === "art" ? t("foto.fehlerArt") : t("foto.fehlerLesen");
    if (lauf.upload) lauf.upload.status = "fehler";
  }
  neuZeichnen();
  return lauf;
}

// Beim Öffnen des Foto-Bildschirms die Texterkennung schon laden.
let gewaermt = false;
export function fotoVorbereiten() { if (!gewaermt) { gewaermt = true; vorwaermen(); } }

const schrittText = () => lauf.schritt === "seite" ? t("foto.seite", lauf.seite, lauf.von) : lauf.schritt === "ablegen" ? t("foto.ablegen") : t("foto.lesen");

// ---------- Speisekarte: aufnehmen ----------
export function karteFotoView(stand) {
  fotoVorbereiten();
  if (lauf && lauf.status === "lesen") return `
    <div class="fotolauf"><div class="kreisel" aria-hidden="true"></div><h1 class="frage">${esc(schrittText())}</h1><p class="hinweis">${esc(t("foto.lesenHinweis"))}</p></div>`;
  return `
    <h1 class="frage">${esc(t(seiten ? "foto.karteWeitere" : "foto.karteFrage"))}</h1>
    <p class="hinweis">${esc(t("foto.karteHinweis"))}</p>
    ${lauf?.status === "fehler" ? `<div class="tipp warnband">${esc(lauf.fehler)}</div>` : ""}
    ${lauf?.hinweis ? `<p class="tipp">${esc(lauf.hinweis)}</p>` : ""}
    <div class="fotofeld">${fotoKnoepfe("speisekarte")}</div>
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
  if (lauf?.upload) { lauf.upload.status = "uebernommen"; lauf.upload.ergebnis = { gerichte: r.neu, aktualisiert: r.aktualisiert }; }
  for (const u of stand.uploads) if (u.zweck === "speisekarte" && u.status === "gelesen") u.status = "uebernommen";
  const inv = inventurVorschau(stand);
  fotoZuruecksetzen();
  return { ...r, artikel: inv.anzahl };
}
