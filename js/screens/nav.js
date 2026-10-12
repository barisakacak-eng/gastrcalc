// Untere Leiste der App (Phase "app"). Etappe 5: die vier Dinge, die das Personal täglich tut, plus Mehr.
import { t } from "../i18n.js";
import { esc } from "../util.js";

const ZIELE = [["start", "start.nav"], ["muell", "muell.nav"], ["kuehl", "kuehl.nav"], ["umsatz", "zaehler.nav"], ["einstellungen", "start.mehr"]];

export function nav(aktiv) {
  return `<nav class="nav">${ZIELE.map(([z, k]) => `<button type="button" class="${aktiv === z ? "an" : ""}" data-a="nav" data-wert="${z}">${esc(t(k))}</button>`).join("")}</nav>`;
}
