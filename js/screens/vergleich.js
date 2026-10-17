// Gerichte im Vergleich (Zielbild „Kräuter & Kupfer“, 15.10.2026): Welche Gerichte bringen dir den meisten Gewinn?
// Je Gericht: Bild, Name, Verkaufspreis, Wareneinsatz, Deckungsbeitrag, Marge mit Balken. Umschalter Deckungsbeitrag | Marge %.
// Zahlen kommen aus gerichteVergleich() (js/gerichte_vergleich.js, netto wie die Kalkulation); hier wird nichts gerechnet (Trennung 2, 17.10.2026).
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl } from "../util.js";
import { gerichteVergleich } from "../gerichte_vergleich.js"; // Trennung 2 (17.10.2026)
import { gerichtBildQuelle } from "../bilder.js"; // Trennung 2 (17.10.2026): Bildzuordnung
import { nav } from "./nav.js";
import { sym } from "../symbole.js";

let modus = "db"; // "db" | "marge"
export const vergleichModus = (m) => { if (m === "db" || m === "marge") modus = m; };
export const vergleichModusAktuell = () => modus; // Paket 2: für Tests
export const vergleichZuruecksetzen = () => { modus = "db"; }; // Paket 2 (16.10.2026): Ladenwechsel – zentrale Liste in app.js

export function gerichtBild(g) {
  const q = gerichtBildQuelle(g); // Trennung 2 (17.10.2026): Zuordnung in js/bilder.js
  if (q.eigen) return `<img class="gerichtbild" data-foto="${esc(q.eigen)}" src="bilder/${q.pikto}.svg" alt="">`; // eigenes Foto des Wirts, wird nach dem Zeichnen aus der Ablage geladen
  return q.foto ? `<img class="gerichtbild" src="foto/${q.foto}.webp" alt="" loading="lazy">` : `<img class="gerichtbild pikto" src="bilder/${q.pikto}.svg" alt="" loading="lazy">`;
}

export function vergleichView(stand) {
  const { mit, ohne, geschaetzt } = gerichteVergleich(stand, modus); // Trennung 2 (17.10.2026): Rechnung in js/gerichte_vergleich.js
  const karte = (x) => `<div class="vergleichkarte">
      <label class="bildwahl" aria-label="${esc(t("vergleich.eigenesFoto"))}">${gerichtBild(x.g)}<span class="bildwahl-sym">${sym("camera", "klein")}</span><input type="file" accept="image/*" capture="environment" data-f="gericht-foto" data-id="${esc(x.g.id)}" class="versteckt"></label>
      <div class="vk-text">
        <div class="vk-kopf"><b>${esc(x.z.name)}</b><span class="vk-preis">${x.z.preisBrutto !== null ? fmtEuro(x.z.preisBrutto, { dezimal: 2 }) : "–"}</span></div>
        <div class="vk-zeile ${x.wareHoch ? "minus" : ""}"><span>${esc(t("vergleich.ware"))}</span><span>${x.geschaetzt ? "≈ " : ""}${fmtEuro(x.z.waren, { dezimal: 2 })}${x.wareHoch ? ` · ${esc(t("vergleich.wareHoch", fmtZahl(x.z.wareneinsatzAnteil * 100, 0)))}` : ""}</span></div>
        <div class="vk-zeile ${x.db < 0 ? "minus" : ""}"><span>${esc(t("vergleich.db"))}</span><span>${fmtEuro(x.db, { dezimal: 2 })}</span></div>
        <div class="vk-zeile ${x.marge < 0 ? "minus" : ""}"><span>${esc(t("vergleich.marge"))}</span><span>${fmtZahl(x.marge * 100, 0)} %</span></div>
        <span class="vk-balken"><i class="${x.marge < 0.5 ? "knapp" : ""}" style="width:${x.balken}%"></i></span>
      </div></div>`;
  return `<div class="kopfband"><h1>${esc(t("vergleich.titel"))}</h1><div class="unter">${esc(t("vergleich.unter"))}</div></div>
    <div class="inhalt vergleich">
      <div class="seg umschalter" role="tablist">${["db", "marge"].map((m) => `<button type="button" role="tab" aria-selected="${modus === m}" class="${modus === m ? "an" : ""}" data-a="vergleich-modus" data-wert="${m}">${esc(t("vergleich.tab." + m))}</button>`).join("")}</div>
      ${mit.length ? mit.map(karte).join("") : `<div class="karte leer"><div>${esc(t("vergleich.leer"))}</div><button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="preise">${esc(t("start.preiseAendern"))}</button></div>`}
      ${ohne.length ? `<div class="karte"><h2>${esc(t("vergleich.ohneZahlen", ohne.length))}</h2>${ohne.map((x) => `<div class="vk-ohne">${esc(x.z.name)} · <small>${esc(x.z.preisBrutto === null ? t("ergebnis.preisFehlt") : t("vergleich.einkaufFehlt"))}</small></div>`).join("")}</div>` : ""}
      ${geschaetzt ? `<p class="hinweis geschaetzt-hinweis">≈ ${esc(t("vergleich.hinweis"))}</p>` : ""}
    </div>${nav("vergleich")}`;
}
