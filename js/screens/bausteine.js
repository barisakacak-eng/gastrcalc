// Trennung (17.10.2026): gemeinsame Anzeige-Bausteine – vorher doppelt in mehreren Bildschirm-Dateien.
// Nur Anzeige und Browser-Teilen; hier wird nichts gerechnet und nichts in die Daten geschrieben.
import { t, einheitLabel } from "../i18n.js";
import { esc, fmtZahl } from "../util.js";

// ---------- Fortschrittsringe ----------
// Zwei Gestaltungen, wie bisher: der große Ring der Einrichtung (vorher home.js, CSS-Klasse „ring“) und der kleine Büro-Ring
// (vorher buero.js, Klasse „b-ring“). Sie zeichnen verschieden aus; eine gemeinsame Gestaltung ist eine Entscheidung für das neue Frontend.
// Entrümpelung Punkt 4 (freigegeben 18.10.2026): lange Seiten – Nebenteile eingeklappt. Offen bleibt offen, auch wenn die Seite neu zeichnet.
export const offeneKlappen = new Set();
export function einklappen(schluessel, titel, inhalt) {
  if (!inhalt) return "";
  return `<details class="einklapp" data-klapp="${esc(schluessel)}"${offeneKlappen.has(schluessel) ? " open" : ""}><summary class="einklapp-kopf">${esc(titel)}</summary><div class="einklapp-inhalt">${inhalt}</div></details>`;
}
export function ring(prozent, klein = false) {
  const r = 26, u = 2 * Math.PI * r;
  return `<svg class="ring ${klein ? "klein" : ""}" viewBox="0 0 64 64" role="img" aria-label="${prozent} %"><circle class="ring-grund" cx="32" cy="32" r="${r}"/><circle class="ring-wert" cx="32" cy="32" r="${r}" stroke-dasharray="${(u * prozent / 100).toFixed(1)} ${u.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle">${prozent}</text></svg>`;
}
export function bueroRing(prozent, { groesse = 26, dicke = 4, farbe = "var(--salbei-tief)", text = false } = {}) {
  const r = (groesse - dicke) / 2; const u = 2 * Math.PI * r; const p = Math.max(0, Math.min(100, prozent || 0));
  return `<svg class="b-ring" width="${groesse}" height="${groesse}" viewBox="0 0 ${groesse} ${groesse}" aria-hidden="true">
    <circle cx="${groesse / 2}" cy="${groesse / 2}" r="${r}" fill="none" stroke="var(--papier-tief)" stroke-width="${dicke}"/>
    <circle cx="${groesse / 2}" cy="${groesse / 2}" r="${r}" fill="none" stroke="${farbe}" stroke-width="${dicke}" stroke-linecap="round" stroke-dasharray="${(u * p / 100).toFixed(2)} ${u.toFixed(2)}" transform="rotate(-90 ${groesse / 2} ${groesse / 2})"/>
    ${text ? `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-size="${Math.round(groesse * (p >= 100 ? 0.22 : 0.27))}" font-weight="800" fill="var(--tinte)">${Math.round(p)}%</text>` : ""}</svg>`;
}

// ---------- Ziel → data-Attribute eines Knopfs ----------
// ziel: { aktion: "nav", wert, anker? } | { aktion: "bearbeiten", schritt, bis? } | { aktion: "<name>", wert?, offen? }
// Vorher zweimal (offen.js mit „anker“/„offen“, buero.js ohne). zusatz: false gibt die Büro-Ausgabe von bisher (ohne anker/offen).
export function zielAttr(z, { zusatz = true } = {}) {
  if (!z) return "";
  const q = (v) => esc(String(v));
  if (z.aktion === "nav") return `data-a="nav" data-wert="${q(z.wert)}"${zusatz && z.anker ? ` data-anker="${q(z.anker)}"` : ""}`;
  if (z.aktion === "bearbeiten") return `data-a="bearbeiten" data-schritt="${q(z.schritt)}"${z.bis ? ` data-bis="${q(z.bis)}"` : ""}`;
  return `data-a="${q(z.aktion)}"${z.wert ? ` data-wert="${q(z.wert)}"` : ""}${zusatz && z.offen !== undefined ? ` data-offen="${q(z.offen)}"` : ""}`;
}

// ---------- Mengen lesbar ----------
// Menge in der Grundeinheit (g, ml, stk): ab 1000 g → kg, ab 1000 ml → l. Vorher in bestand.js und verkauf.js (gleich bis auf das Stück-Wort).
// stueck: eigene Schreibweise für Stück (Verkauf je Gericht: „12 Stück“); ohne → „12 Stk.“ wie im Lager.
export function mengeBasisText(menge, basis, { stueck = null } = {}) {
  const m = Math.abs(menge);
  if (basis === "g") return m >= 1000 ? `${fmtZahl(m / 1000, 1)} ${einheitLabel("kg")}` : `${fmtZahl(m, 0)} ${einheitLabel("g")}`;
  if (basis === "ml") return m >= 1000 ? `${fmtZahl(m / 1000, 1)} ${einheitLabel("l")}` : `${fmtZahl(m, 0)} ${einheitLabel("ml")}`;
  if (stueck) return stueck(Math.round(m * 10) / 10);
  return `${fmtZahl(m, m < 10 && !Number.isInteger(m) ? 1 : 0)} ${einheitLabel("stk")}`;
}
// Menge mit eigener Einheit (Müll: „portion“ = Portionen eines Gerichts, sonst g/kg/ml/l/stk). Vorher muell.js.
export const mengeEinheitText = (menge, einheit) => einheit === "portion" ? t("muell1.portion", menge, fmtZahl(menge, Number.isInteger(menge) ? 0 : 1)) : `${fmtZahl(menge, Number.isInteger(menge) ? 0 : 2)} ${einheitLabel(einheit)}`;
// „2 × Kiste“ (sprachneutral). Vorher bestand.js (von aktionen.js und verkauf.js importiert).
// Prüfer 19.10.2026: Gebinde in Vierteln statt „0,50“ – so zählt man im Lager („½ Karton“, „1 ¼ Kisten“)
const VIERTEL = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
export const anzahlViertel = (anzahl) => { const q = Math.round(anzahl * 4) / 4; if (q === 0 && anzahl > 0) return "< ¼"; const g = Math.floor(q); const r = VIERTEL[q - g]; return r ? (g ? `${fmtZahl(g, 0)} ${r}` : r) : fmtZahl(q, 0); };
export const gebindeAnzahl = (anzahl, art) => `${anzahlViertel(anzahl)} × ${t("gebinde.arten." + (art || "packung"))}`;

// ---------- Teilen (Browser) ----------
// Text teilen: navigator.share, sonst Kopieren, sonst zum Abschreiben zeigen. Vorher bestand.js und aktionen.js.
// Rückgabe: "geteilt" | "abgebrochen" | "kopiert" | "gezeigt"
export async function textTeilen(text, titel) {
  if (typeof navigator !== "undefined" && navigator.share) { try { await navigator.share({ text }); return "geteilt"; } catch (e) { if (e?.name === "AbortError") return "abgebrochen"; } }
  try { await navigator.clipboard.writeText(text); return "kopiert"; } catch (_) { window.prompt(titel, text); return "gezeigt"; }
}
// Dateien teilen (CSV der Ordner): navigator.share mit Dateien, sonst herunterladen. Vorher ordner.js.
// Rückgabe: "geteilt" | "abgebrochen" | "geladen"
export async function dateienTeilen(dateien, titel) {
  const files = dateien.map((d) => new File([d.text], d.name, { type: d.typ || "text/csv;charset=utf-8" }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: titel }); return "geteilt"; } catch (e) { if (e.name === "AbortError") return "abgebrochen"; }
  }
  for (const f of files) { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  return "geladen";
}
