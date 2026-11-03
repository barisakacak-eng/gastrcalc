// Hinweis-Karten im Büro (Vertrag docs/vertraege.md Abschnitt 2, 23.10.2026): allgemeine Steuer-Hinweise aus den Daten, die die App hat.
// Nur Anzeige. Rechenwerk und Inhalt: js/hinweis.js. Pflichtzeile oben: allgemeiner Hinweis, keine Steuerberatung.
// Je Karte: Titel, Satz, Quelle, Knopf „Belege bereitlegen“ (führt in den Steuer-Ordner), „Später“, „Erledigt“.
import { t, sprache } from "../i18n.js";
import { hinweisAnzeige } from "../data/hinweis_texte.js"; // 24.10.2026: Karten in en/tr, sonst Deutsch
import { esc } from "../util.js";
import { nav } from "./nav.js";
import { sym } from "../symbole.js";
import { hinweiseFuer, BELEG_KNOPF } from "../hinweis.js";

export function hinweiseView(stand) {
  const karten = hinweiseFuer(stand).map((h) => hinweisAnzeige(h, sprache()));
  // Vorab-Prüfung 03.11.2026 (C12): je Hinweis nur der Titel, Satz, Quelle und Knöpfe auf Tipp (Büro-Maß 120 Wörter; vorher ≈ 250–300)
  const karte = (h) => `<details class="karte hinweiskarte auf ${h.status === "spaeter" ? "spaeter" : ""}" data-hinweis="${esc(h.id)}">
      <summary class="hk-kopf"><b>${esc(h.titel)}</b>${h.status === "spaeter" ? `<small>${esc(t("hinweise.spaeter"))}</small>` : ""}</summary>
      <p>${esc(h.satz)}</p>
      <small class="hk-quelle">${esc(t("hinweise.quelle"))}: ${esc(h.quelle)} · ${esc(h.belege.join(", "))}</small>
      <div class="hk-knoepfe">
        ${BELEG_KNOPF.has(h.id) ? `<button type="button" class="knopf" data-a="nav" data-wert="ordner-steuer">${esc(t("hinweise.belege"))}</button>` : ""}
        ${h.status !== "spaeter" ? `<button type="button" class="knopf zweit" data-a="hinweis-status" data-id="${esc(h.id)}" data-status="spaeter">${esc(t("hinweise.spaeterKnopf"))}</button>` : ""}
        <button type="button" class="knopf zweit" data-a="hinweis-status" data-id="${esc(h.id)}" data-status="erledigt">${esc(t("hinweise.erledigt"))}</button>
      </div></details>`;
  return `<div class="kopfband"><h1>${esc(t("hinweise.titel"))}</h1><div class="unter">${esc(t("hinweise.unter"))}</div></div>
    <div class="inhalt hinweise">
      <p class="hinweis pflicht">${sym("circle-help", "klein")} ${esc(t("hinweise.pflicht"))}</p>
      ${karten.length ? karten.map(karte).join("") : `<div class="karte leer"><div>${esc(t("hinweise.leer"))}</div></div>`}
    </div>${nav("hinweise")}`;
}

