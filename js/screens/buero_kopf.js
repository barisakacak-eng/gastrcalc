// Büro-Kopf und Büro-Symbole in einer kleinen Datei: Einstellungen (Laden) und Büro-Bildschirme brauchen den Kopf, nicht das ganze Büro.
import { t } from "../i18n.js";
import { esc } from "../util.js";
import { sym } from "../symbole.js";
import { bueroBuehne, bueroZurueckKnopf } from "./nav.js";

// Symbole, die es in symbole.js (noch) nicht gibt – Lucide, ISC-Lizenz wie dort. Eigene Liste, damit symbole.js unberührt bleibt.
const EXTRA = {
  "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  "share": '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
  "lock": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  "clipboard-list": '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  "eye": '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>',
  "tv": '<rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>', // Menütafel (18.10.2026)
  "lightbulb": '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>', // Hinweise (23.10.2026)
  "cup-soda": '<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/>', // Getränke (18.10.2026)
};
export const bsym = (name, klasse = "") => EXTRA[name] ? `<svg class="sym ${klasse}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${EXTRA[name]}</svg>` : sym(name, klasse);

// Gleiche Leiste wie alle Büro-Bildschirme (nav.js): Ziel „start" heißt zurück in den Laden.
 export function bueroZuruecksetzen() {}
const kopf = (zurueck, titel) => bueroBuehne(zurueck.ziel === "start"
    ? `<button type="button" class="zurueckzeile" data-a="modus" data-wert="laden">${bsym("chevron-left")}<span>${esc(t("ebene.zumLaden"))}</span></button>`
    : zurueck.ziel === "buero" ? bueroZurueckKnopf() // 01.11.2026: eine Ebene zurück
    : `<button type="button" class="zurueckzeile" data-a="nav" data-wert="${esc(zurueck.ziel)}">${bsym("chevron-left")}<span>${esc(zurueck.text)}</span></button>`, titel);
export const bueroKopf = kopf;
