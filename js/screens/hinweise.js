// Hinweis-Karten im Büro (Vertrag docs/vertraege.md Abschnitt 2, 23.10.2026): allgemeine Steuer-Hinweise aus den Daten, die die App hat.
// Nur Anzeige. Rechenwerk und Inhalt: js/hinweis.js. Pflichtzeile oben: allgemeiner Hinweis, keine Steuerberatung.
// Je Karte: Titel, Satz, Quelle, Knopf „Belege bereitlegen“ (führt in den Steuer-Ordner), „Später“, „Erledigt“.
import { t, sprache } from "../i18n.js";
import { hinweisAnzeige } from "../data/hinweis_texte.js"; // 24.10.2026: Karten in en/tr, sonst Deutsch
import { esc } from "../util.js";
import { nav } from "./nav.js";
import { sym } from "../symbole.js";
import { hinweiseFuer, BELEG_KNOPF } from "../hinweis.js";
import { hmFuerBuero, hmOffeneFragen, hmErledigtZahl } from "../hinweis_motor.js"; // Lauf 3 (09.11.2026), live seit Baris' Ja 17:21
import { hmUi, hmAnzeige } from "../data/hm_texte.js";
import { heute } from "../util.js";

const datumKurz = (iso) => iso.split("-").reverse().join(".");
// Hinweis-Motor „Was dir zusteht“: höchstens 3 Karten nach Nutzen (Auswahl und Takt in js/hinweis_motor.js), darunter nur die Fragen,
// die ein Hinweis braucht. Baris Ja 09.11.2026 17:21 (Bildpaket HM).
function hmBlock(stand, sp, datum = heute()) {
  const u = (k, w) => hmUi(sp, k, w);
  const { karten } = hmFuerBuero(stand, { datum }); const fragen = hmOffeneFragen(stand); const n = hmErledigtZahl(stand);
  if (!karten.length && !fragen.length && !n) return "";
  const knopf = (id, st, key) => `<button type="button" class="knopf zweit" data-a="hm-status" data-id="${esc(id)}" data-status="${st}">${esc(u(key))}</button>`;
  const karte = (h0, i) => { const h = hmAnzeige(h0, sp, h0.werte, datum);
    return `<details class="karte hinweiskarte hm-karte ${h.frist ? "frist" : ""}" data-hm="${esc(h.id)}" ${i === 0 ? "open" : ""}>
      <summary class="hk-kopf"><b>${esc(h.titel)}</b>${h.euro ? `<small dir="auto">${esc(h.euro)}</small>` : ""}</summary>
      <p dir="auto">${esc(h.satz)}</p>
      <small class="hk-quelle">${esc(u("quelle"))}: ${esc(h.quelle)} · ${esc(u("abgerufen"))} ${esc(datumKurz(h.abruf))}</small>
      <div class="hk-knoepfe">${knopf(h.id, "erledigt", "erledigt")}${knopf(h.id, "geklaert", "geklaert")}${knopf(h.id, "passt_nicht", "passt")}</div></details>`; };
  const jaNein = (frage, key, klein = "") => `<div class="karte hm-frage" data-frage="${frage}"><b dir="auto">${esc(u(key))}</b>${klein ? `<small dir="auto">${esc(u(klein))}</small>` : ""}
      <div class="hk-knoepfe"><button type="button" class="knopf zweit" data-a="hm-frage" data-frage="${frage}" data-wert="ja">${esc(u("ja"))}</button><button type="button" class="knopf zweit" data-a="hm-frage" data-frage="${frage}" data-wert="nein">${esc(u("nein"))}</button></div></div>`;
  const frageHtml = (f) => f === "musik" ? jaNein("musik", "frageMusik") : f === "schwanger" ? jaNein("schwanger", "frageSchwanger", "frageSchwangerKlein")
    : `<div class="karte hm-frage" data-frage="elektroGeprueft"><b dir="auto">${esc(u("frageElektro"))}</b>
      <div class="hk-knoepfe"><input type="date" class="hm-datum" max="${esc(datum)}" aria-label="${esc(u("frageElektro"))}"><button type="button" class="knopf zweit" data-a="hm-frage" data-frage="elektroGeprueft" data-wert="datum">${esc(u("speichern"))}</button><button type="button" class="knopf zweit" data-a="hm-frage" data-frage="elektroGeprueft" data-wert="nie">${esc(u("nie"))}</button></div></div>`;
  return `<section class="hm-block"><h2 class="hm-kopf">${esc(u("kopf"))}${n ? ` <small>${esc(u("erledigtZahl", { n }))}</small>` : ""}</h2>
    ${karten.map(karte).join("")}${fragen.slice(0, 1).map(frageHtml).join("")}</section>`;
}

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
      ${hmBlock(stand, sprache())}
      ${karten.length ? karten.map(karte).join("") : `<div class="karte leer"><div>${esc(t("hinweise.leer"))}</div></div>`}
    </div>${nav("hinweise")}`;
}

