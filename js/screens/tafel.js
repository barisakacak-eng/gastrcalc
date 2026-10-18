// Menütafel (18.10.2026): Büro-Bereich „Menütafel“ – Vorschau (verkleinert, je Seite), Hinweise (§ 13 PAngV: Getränke ohne Menge, Gerichte ohne
// Preis), Knopf „Tafel-Datei teilen“, laufende Aktionen (beenden), Einstellungen (Seitenwechsel, Gruppen, Aktionen ja/nein, Sprache der Tafel).
// Rechnen, Schreiben und die Datei selbst: js/tafel.js. Hier nur Aufbau, Texte, data-Attribute und vorhandene CSS-Klassen.
// Personal-Modus: nicht erreichbar (modus.js), Handlungen „tf-…“ sind dort zusätzlich gesperrt.
import { t, SPRACH_NAMEN, SPRACHEN, ladeSprache } from "../i18n.js";
import { esc, fmtEuro } from "../util.js";
import { tafelBeschreibung, tafelHtml, tafelEinstellung, aktiveAktionen, aktionName, TAFEL_GRUPPEN, TAFEL_SEKUNDEN, tafelSetzen, aktionBeenden, tafelBilder, tafelDatei } from "../tafel.js";
import { aktionZeitraumText } from "../aktion_plan.js"; // Prüfgremium 18.10.2026 (H1): „bis Ware weg“ ohne Datum – Zeitraum in Worten statt Datum – Datum
import { dateienTeilen } from "./bausteine.js";
import { nav } from "./nav.js";

const was = (text) => `<p class="inv-was"><b>${esc(t("inventur.wasHeisst"))}</b> ${esc(text)}</p>`;
const ue = (text) => `<h2 class="inv-ue">${esc(text)}</h2>`;

export function tafelView(stand) {
  const e = tafelEinstellung(stand); const b = tafelBeschreibung(stand, { einstellung: e });
  const kopf = `<div class="kopfband"><h1>${esc(t("tafel.titel"))}</h1><div class="unter">${esc(t("tafel.unter"))}</div></div>`;
  // Vorschau: jede Seite als kleines Bild (ohne Skript – die App erlaubt keins; Bilder aus der App)
  const n = Math.max(1, b.seiten.length);
  const rahmen = (i) => `<div><iframe class="b-vorschau-dok" data-tafel-seite="${i}" height="196" title="${esc(t("tafel.vorschau"))} ${i + 1}" srcdoc="${esc(tafelHtml(b, { eingebettet: false, skript: false, nurSeite: b.seiten.length ? i : null }))}"></iframe></div>`;
  const vorschau = `${ue(t("tafel.vorschau"))}<div class="karte" data-tafel-vorschau="${b.seiten.length}">${b.leer ? "" : `<h2>${esc(t("tafel.seiten", b.seiten.length))} · ${esc(t("tafel.sekunden", e.sekunden))}</h2>`}${Array.from({ length: n }, (_, i) => rahmen(i)).join("")}</div>`;
  const hinweise = b.hinweise.length ? `<div class="karte hinweisgelb" data-tafel-hinweise="${b.hinweise.length}"><h2>${esc(t("tafel.hinweisTitel"))}</h2>${b.hinweise.map((h) => `<p>${esc(t("tafel.hinweis." + h.art, h.name))}</p>`).join("")}</div>` : "";
  const teilen = b.leer ? `<div class="karte leer"><div>${esc(t("tafel.leer"))}</div></div>`
    : `<button type="button" class="knopf glut" data-a="tf-teilen">${esc(t("tafel.teilen"))}</button>`;
  const kasse = `<p class="hinweis">${esc(t("tafel.kasse"))}</p>`;
  // laufende Aktionen
  const akt = aktiveAktionen(stand);
  const aktView = `${ue(t("tafel.aktionenTitel"))}${akt.length ? `<div class="karte">${akt.map((a) => `<div class="summenzeile" data-tafel-aktion="${esc(a.id)}"><span><b>${esc(aktionName(stand, a))}</b><br><small>${esc(fmtEuro(a.preis, { dezimal: 2 }))} · ${esc(aktionZeitraumText(a))}</small></span><span class="wert"><button type="button" class="leise klein" data-a="tf-aktion-beenden" data-wert="${esc(a.id)}">${esc(t("tafel.beenden"))}</button></span></div>`).join("")}</div>`
    : `<div class="karte leer"><div>${esc(t("tafel.aktionenLeer"))}</div></div>`}`;
  // Einstellungen
  const chip = (aktion, wert, an, text) => `<button type="button" class="chip klein ${an ? "an" : ""}" data-a="${aktion}" data-wert="${esc(wert)}" aria-pressed="${an}">${esc(text)}</button>`;
  const einst = `${ue(t("tafel.einstellungen"))}<div class="karte">
    <div class="feldzeile"><label>${esc(t("tafel.wechsel"))}</label><div class="chips">${TAFEL_SEKUNDEN.map((s) => chip("tf-sekunden", s, e.sekunden === s, t("tafel.sekunden", s))).join("")}</div></div>
    <div class="feldzeile"><label>${esc(t("tafel.gruppen"))}</label><div class="chips">${TAFEL_GRUPPEN.map((g) => chip("tf-gruppe", g, e.gruppen.includes(g), t("tafel.inhalt.gruppen." + g))).join("")}</div></div>
    <div class="zeile"><div class="oben"><div class="name">${esc(t("tafel.aktionenZeigen"))}</div>
      <button type="button" class="schalter ${e.aktionen ? "an" : ""}" data-a="tf-aktionen" aria-pressed="${e.aktionen}" aria-label="${esc(t("tafel.aktionenZeigen"))}"></button></div></div>
    <div class="feldzeile"><label for="tf-sprache">${esc(t("tafel.sprache"))}</label><select id="tf-sprache" class="textfeld" data-f="tf-sprache">${SPRACHEN.map((c) => `<option value="${c}"${c === e.sprache ? " selected" : ""}>${esc(SPRACH_NAMEN[c])}</option>`).join("")}</select></div>
  </div>`;
  return `${kopf}<div class="inhalt">${vorschau}${hinweise}${teilen}${kasse}${aktView}${einst}${was(t("tafel.was"))}</div>${nav("tafel", { schnell: false })}`;
}

// Eingabe: nur die Sprache der Tafel (Auswahlliste). Rückgabe: { sprache } (app.js lädt die Sprache nach und zeichnet neu) | false
export function tafelEingabe(feld, wert, stand) {
  if (feld !== "tf-sprache" || !SPRACHEN.includes(wert)) return false;
  tafelSetzen(stand, "sprache", wert); return { sprache: wert };
}

// Handlungen. Rückgabe: false (nicht meine) | true (neu zeichnen) | { speichern?, meldung?, sprache? }
export async function tafelAktion(name, el, stand) {
  if (name === "tf-sekunden") return tafelSetzen(stand, "sekunden", Number(el.dataset.wert)) ? { speichern: true } : true;
  if (name === "tf-gruppe") return tafelSetzen(stand, "gruppe", el.dataset.wert) ? { speichern: true } : true;
  if (name === "tf-aktionen") return tafelSetzen(stand, "aktionen", null) ? { speichern: true } : true;
  if (name === "tf-aktion-beenden") return aktionBeenden(stand, el.dataset.wert) ? { speichern: true, meldung: t("tafel.beendet") } : true;
  if (name === "tf-teilen") {
    await ladeSprache(tafelEinstellung(stand).sprache); // Inhalt der Tafel in ihrer Sprache (nachladbare Sprachen erst laden)
    const b = tafelBeschreibung(stand); if (b.leer) return true;
    try {
      const datei = tafelDatei(b, await tafelBilder(b));
      const weg = await dateienTeilen([datei], t("tafel.titel"));
      if (weg === "abgebrochen") return false;
      return { meldung: t(weg === "geteilt" ? "tafel.geteilt" : "tafel.geladen") };
    } catch (err) { console.warn(err); return { meldung: t("tafel.fehler") }; }
  }
  return false;
}
