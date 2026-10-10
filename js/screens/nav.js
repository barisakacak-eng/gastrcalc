// Untere Leiste der App (Phase "app"). Fünf Ziele, Kurztexte, Daumenhöhe.
import { t } from "../i18n.js";
import { esc } from "../util.js";

const ZIELE = [["start", "start.nav"], ["karte", "start.karteKurz"], ["tag", "tag.nav"], ["laeden", "laeden.nav"], ["einstellungen", "start.mehr"]];

export function nav(aktiv) {
  return `<nav class="nav">${ZIELE.map(([z, k]) => `<button type="button" class="${aktiv === z ? "an" : ""}" data-a="nav" data-wert="${z}">${esc(t(k))}</button>`).join("")}</nav>`;
}
