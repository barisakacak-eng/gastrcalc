// Sicherung und Diagnose: Sicherung teilen, einlesen, ersetzen, Rückholpunkt, dauerhafter Speicher, „Diagnose kopieren“, Fehlerliste.
// Das Passwort einer Sicherung wird hier nur durchgereicht, nie gespeichert.
import { fehlerSammlerStarten, fehlerText, fehlerLeeren } from "../fehler.js";
import {
  APP_FASSUNG, exportDatei, rueckholpunktInfo, zurueckholen, speichernAbbrechen, ereignis, alleEreignisse, importSicherung, einlesenSicher,
  ablageAusSicherung, ereignisseUebernehmen, leereWurzel, speicherDauerhaftPruefen, speicherBelegt, SCHEMA, speicherVerfuegbar,
  speicherIstDauerhaft, eintraegeZaehlen,
} from "../store.js";
import { Z } from "../bedienung/zustand.js";
import { modus, ansichtErlaubt, startAnsicht } from "../modus.js";
import { meldung } from "./meldung.js";
import { t, datumText, sprache as aktuelleSprache, ladeSprache } from "../i18n.js";
import { sofortSpeichern, speichern } from "./speichern.js";
import { zeichne } from "./zeichnen.js";
import { blattOffen, ortFrageZeigen, blattSchliessen, passwortMeldung, passwortStarten } from "../screens/ebene.js";
import { sicherungZeitraum } from "../sicherung_stufe.js";
import { l6yText, l6ySatz } from "../data/l6y_texte.js";
import { alleZuruecksetzen } from "./zuruecksetzen.js";
import { aktivSetzen } from "./ladenverwaltung.js";
import { spracheDesGeraets, setzeSprache } from "./sprache.js";
import { ablageZuruecklegen } from "../ablage.js";
import { wurzelErsetzen } from "../rettung.js";
import { dauerhaftFaellig } from "../bedienhilfe.js";
import { textTeilen } from "../screens/bausteine.js";
import { speicherLokal } from "../adapter/browser_speicher.js";

// E3: die letzten 50 Fehler, ohne Namen und Zahlen.
export function fehlerSammlerAnmelden() {
  fehlerSammlerStarten(window, { fassung: APP_FASSUNG, ansichtJetzt: () => (Z.stand?.phase === "app" ? `${modus(Z.wurzel)}/${Z.ansicht}` : `einrichtung/${Z.stand?.schrittId || "?"}`) });
}

// Sicherung als ZIP mit allen Fotos und Belegen; die Größe steht in der Meldung.
// passwort = Text → Datei verschlüsselt (.gcs.zip); null → unverschlüsselt. mitAblage = false → „Ohne Fotos (klein, für Mail)“.
const groesseText = (n) => n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export async function sicherungTeilen(passwort = null, { mitAblage = true } = {}) {
  let datei0; try { datei0 = await exportDatei(Z.wurzel, { passwort, mitAblage }); } catch (e) { console.warn(e); meldung(t("einstellungen.importFehler")); return; }
  const { blob, name, fingerabdruck, groesse, verschluesselt } = datei0;
  Z.ereignisAnzahl += 1;
  const gelungen = () => { // erst nach Teilen oder Download – und dann erst nach der Antwort auf „Wo liegt sie jetzt?“
    Z.wurzel.letzteSicherungGroesse = groesse;
    meldung(t("einstellungen.exportOk", Z.wurzel.betriebe.length) + ` · ${groesseText(groesse)}` + (fingerabdruck ? ` · ${fingerabdruck}` : ` · ${t("einstellungen.ohnePruefsumme")}`) + ` · ${t(verschluesselt ? "passwort.mit" : "passwort.ohneKurz")}`);
    sofortSpeichern(Z.wurzel); zeichne();
    if (!blattOffen()) history.pushState({ blatt: true }, ""); ortFrageZeigen();
  };
  const datei = new File([blob], name, { type: "application/zip" });
  if (navigator.canShare && navigator.canShare({ files: [datei] })) {
    try { await navigator.share({ files: [datei], title: "GastroCash" }); gelungen(); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); gelungen();
}

const zeitraumZeile = (w) => { const z = sicherungZeitraum(w); if (!z.tage) return ""; const d = (x) => datumText(new Date(x + "T12:00:00"), { day: "2-digit", month: "2-digit", year: "numeric" }); return t("einstellungen.importZeitraum", z.tage, d(z.von), d(z.bis)) + " "; };

function einlesenFehlerText(e) {
  if (e?.grund === "neuer") return l6yText("neuer", aktuelleSprache());
  if (e?.grund === "gross") return l6ySatz("zuGross", aktuelleSprache(), e.maxMB ?? 200);
  return t("einstellungen.importFehler");
}

export async function rueckholInfoHolen() { try { Z.rueckholInfo = await rueckholpunktInfo(); } catch (_) { Z.rueckholInfo = null; } if (Z.stand?.phase === "app" && Z.ansicht === "einstellungen") zeichne(); }

async function sicherungZurueckholen() {
  if (!Z.rueckholInfo || !confirm(l6yText("rueckgaengig", aktuelleSprache()))) return;
  const r = await zurueckholen(Z.wurzel);
  if (!r) { meldung(t("einstellungen.importFehler")); await rueckholInfoHolen(); return; }
  speichernAbbrechen(); alleZuruecksetzen(); blattSchliessen();
  Z.wurzel = r.wurzel; Z.stand = null; aktivSetzen(Z.wurzel.aktiv);
  await ladeSprache(Z.wurzel.sprache || spracheDesGeraets()).catch(() => {}); setzeSprache(Z.wurzel.sprache || spracheDesGeraets(), () => zeichne());
  await sofortSpeichern(Z.wurzel); await ereignis("einlesen-rueckgaengig", { zeit: r.zeit }); Z.ereignisAnzahl = (await alleEreignisse()).length;
  if (!ansichtErlaubt(Z.wurzel, Z.ansicht)) Z.ansicht = startAnsicht(Z.wurzel);
  Z.rueckholInfo = null; await rueckholInfoHolen();
  meldung(l6yText("zurueckgeholt", aktuelleSprache())); zeichne();
}

export async function sicherungEinlesen(datei, passwort = null, { ersetzen = Z.einleseErsetzen } = {}) {
  Z.einleseErsetzen = !!ersetzen && Z.notfall && modus(Z.wurzel) !== "personal"; // Rettung (17.10.2026): nur von der Fehlerseite
  let r;
  try { r = await importSicherung(datei, { passwort }); }
  catch (e) {
    if (e.grund === "passwort") { passwortMeldung(t("passwort.falsch")); return; } // Blatt bleibt offen
    console.warn(e); blattSchliessen(); meldung(einlesenFehlerText(e)); return;
  }
  if (r.passwortNoetig) { Z.einleseDatei = datei; if (!blattOffen()) history.pushState({ blatt: true }, ""); passwortStarten("einlesen"); return; }
  blattSchliessen(); Z.einleseDatei = null;
  const ersetzenJetzt = Z.einleseErsetzen; Z.einleseErsetzen = false;
  return ersetzenJetzt ? sicherungErsetzen(r) : sicherungUebernehmen(r);
}

async function sicherungUebernehmen(gelesen) {
  try {
    const { wurzel: importiert, ereignisse, pruefsumme, ablage } = gelesen;
    if (pruefsumme !== "ok") { await ereignis("import-pruefsumme", { pruefsumme }); if (!confirm(t(pruefsumme === "abweichung" ? "einstellungen.pruefsummeFalsch" : "w2d.pruefsummeFehlt"))) return; } // W2-D: Rückfrage vor dem Einlesen
    const gleich = importiert.betriebe.filter((b) => Z.wurzel.betriebe.some((x) => x.id === b.id)).map((b) => b.betrieb.name || t("start.hallo", ""));
    const neu = importiert.betriebe.filter((b) => !Z.wurzel.betriebe.some((x) => x.id === b.id)).map((b) => b.betrieb.name || t("start.hallo", ""));
    if (!confirm(zeitraumZeile(importiert) + t("einstellungen.importFrage", neu, gleich))) return; // Datensicherung 28.10.2026: Tage und Zeitraum zuerst
    const leerVorher = Z.stand && Z.stand.phase === "onboarding" && !Z.stand.betrieb.name && !Z.stand.kosten.length && !Z.stand.gerichte.length ? Z.stand.id : null;
    const r = (await einlesenSicher(Z.wurzel, importiert)).bericht; // Lauf 6, E5-Draht (4): sicher, mit Rückholpunkt
    if (leerVorher && Z.wurzel.betriebe.length > 1) { Z.wurzel.betriebe = Z.wurzel.betriebe.filter((b) => b.id !== leerVorher); if (Z.wurzel.aktiv === leerVorher) Z.wurzel.aktiv = importiert.aktiv; }
    alleZuruecksetzen(); Z.stand = null; aktivSetzen(Z.wurzel.aktiv); // der eigene aktive Laden bleibt, die Datei ändert ihn nicht; Bildschirm-Zustände gehören zum alten Objekt
    const fotos = ablage.length ? await ablageAusSicherung(ablage, ablageZuruecklegen) : { neu: 0, kaputt: 0, da: 0 };
    delete Z.wurzel.ladeFehler; // eine Sicherung ist eingelesen: die Meldung über fehlende Teile ist erledigt
    setzeSprache(Z.wurzel.sprache || spracheDesGeraets(), () => zeichne());
    await sofortSpeichern(Z.wurzel); await ereignisseUebernehmen(ereignisse); await ereignis("import", { anzahl: ereignisse.length, neu: neu.length, gleich: gleich.length, pruefsumme, fotos: fotos.neu, fotosKaputt: fotos.kaputt, beide: r.beide, zukunft: r.zukunft, konflikte: r.konflikte });
    Z.ereignisAnzahl = (await alleEreignisse()).length; await rueckholInfoHolen();
    Z.ansicht = Z.wurzel.betriebe.length > 1 ? "laeden" : "start"; if (Z.stand.phase === "onboarding") Z.ansicht = "start";
    const zusatz = [fotos.neu ? t("w2d.importFotos", fotos.neu) : "", fotos.kaputt ? t("w2d.importFotosKaputt", fotos.kaputt) : "", r.zukunft ? t("w2d.importZukunft", r.zukunft) : "", r.beide.length ? t("w2d.importBeide") : "", !Z.wurzel.bueroPin ? t("w2d.importOhneCode") : ""].filter(Boolean).join(" ");
    meldung(t(pruefsumme === "ok" ? "einstellungen.importOk" : pruefsumme === "abweichung" ? "einstellungen.importTrotzAbweichung" : "einstellungen.importOhnePruefsumme") + (zusatz ? " " + zusatz : "")); zeichne();
  } catch (e) { console.warn(e); meldung(einlesenFehlerText(e)); }
}

async function sicherungErsetzen(gelesen) {
  try {
    const { wurzel: importiert, ereignisse, pruefsumme, ablage } = gelesen;
    if (pruefsumme !== "ok") { await ereignis("import-pruefsumme", { pruefsumme }); if (!confirm(t(pruefsumme === "abweichung" ? "einstellungen.pruefsummeFalsch" : "w2d.pruefsummeFehlt"))) return; }
    const namen = importiert.betriebe.map((b) => b.betrieb?.name || t("ebene.deinLaden"));
    if (!confirm(zeitraumZeile(importiert) + t("rettung.ersetzenFrage", namen.join(", ")))) return;
    speichernAbbrechen(); alleZuruecksetzen(); blattSchliessen();
    Z.wurzel = wurzelErsetzen(Z.wurzel || leereWurzel(), importiert); Z.stand = null; aktivSetzen(Z.wurzel.aktiv);
    const fotos = ablage?.length ? await ablageAusSicherung(ablage, ablageZuruecklegen) : { neu: 0, kaputt: 0, da: 0 };
    await ladeSprache(Z.wurzel.sprache || spracheDesGeraets()).catch(() => {}); setzeSprache(Z.wurzel.sprache || spracheDesGeraets());
    await sofortSpeichern(Z.wurzel); await ereignisseUebernehmen(ereignisse); await ereignis("import-ersetzt", { anzahl: ereignisse.length, laeden: importiert.betriebe.length, pruefsumme, fotos: fotos.neu, fotosKaputt: fotos.kaputt });
    Z.ereignisAnzahl = (await alleEreignisse()).length;
    Z.notfall = false; Z.ansicht = startAnsicht(Z.wurzel);
    meldung(t("rettung.ersetzt") + (fotos.neu ? " " + t("w2d.importFotos", fotos.neu) : "")); zeichne();
  } catch (e) { console.warn(e); meldung(einlesenFehlerText(e)); }
}

// Dauerhaften Speicher einmal anfragen (nach der Einrichtung); das Ergebnis zeigen die Einstellungen.
// Gemerkt wird nur ein „Ja“ (persistGefragt = true). Lehnt der Browser ab, fragt die App beim nächsten Start noch einmal;
// innerhalb eines Starts höchstens einmal (dauerhaftVersucht).
export function dauerhaftAnfragen() {
  if (!dauerhaftFaellig(Z.wurzel) || Z.dauerhaftVersucht) return;
  Z.dauerhaftVersucht = true;
  speicherDauerhaftPruefen({ anfragen: true }).then((ok) => { if (ok === true && Z.wurzel && Z.wurzel.persistGefragt !== true) { Z.wurzel.persistGefragt = true; speichern(Z.wurzel); } ereignis("speicher-dauerhaft", { ok }); if (Z.ansicht === "einstellungen") zeichne(); });
}

// „Diagnose kopieren“: Fassung, Browser, Speicher, Anzahl Einträge. Keine Namen, keine Zahlen aus dem Laden.
async function diagnoseKopieren() {
  const sp = await speicherBelegt(); const mb = (n) => (typeof n === "number" ? (n / 1048576).toFixed(1) + " MB" : "?");
  const installiert = (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const text = [`GastroCash ${APP_FASSUNG} · Schema ${SCHEMA}`, `Browser: ${navigator.userAgent}`, `Installiert: ${installiert ? "ja" : "nein"} · Offline: ${Z.offlineStand}`,
    `Speicher: ${speicherVerfuegbar() ? "ok" : "nicht verfügbar"} · dauerhaft: ${speicherIstDauerhaft() === null ? "?" : speicherIstDauerhaft() ? "ja" : "nein"} · belegt ${mb(sp?.belegt)} von ${mb(sp?.frei)}`,
    `Läden: ${Z.wurzel.betriebe.length} · Einträge: ${eintraegeZaehlen(Z.wurzel)} · Verlauf: ${Z.ereignisAnzahl}`, `Fehlende Teile: ${(Z.wurzel.ladeFehler || []).length} · Sprache: ${Z.wurzel.sprache || "?"}`].join("\n");
  try { await navigator.clipboard.writeText(text); meldung(t("w2d.diagnoseKopiert")); } catch (_) { window.prompt(t("w2d.diagnose"), text); }
}

export const KLICK = {
  "diagnose-kopieren": () => diagnoseKopieren(),
  "sicherung-zurueckholen": () => sicherungZurueckholen(),
  "fehler-melden": () => {
    const geraet = navigator.userAgent.replace(/\(.*?\)/g, "").trim().slice(0, 60);
    textTeilen(fehlerText(speicherLokal(), { fassung: APP_FASSUNG, sprache: aktuelleSprache(), geraet }), t("einstellungen.fehler.titel"))
      .then((r) => { if (r === "kopiert") meldung(t("einstellungen.fehler.kopiert")); });
  },
  "fehler-leeren": () => { fehlerLeeren(speicherLokal()); return zeichne(); },
};
