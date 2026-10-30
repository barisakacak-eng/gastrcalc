// Sonderauftrag 6b R2 (28.10.2026, live seit 30.10.2026): Zeki beim ersten Tipp.
// Erster Tipp auf einen Menüpunkt oder eine Büro-Zeile → Zeki sagt genau einmal einen Satz (≤ 15 Wörter) mit „Verstanden“.
// Merker je Punkt auf dem Gerät (localStorage, eine Neuinstallation setzt ihn zurück). In der Stoßzeit nicht – dann beim nächsten Tipp danach.
// Die Sätze sind gekürzte Hilfetexte (rundgang.erst.*), kein neuer Textberg.
import { t } from "../i18n.js";
import { esc } from "../util.js";
import { mascotMarkup } from "../gastrocash-brand.js";
import { istHauptzeit } from "../offen.js";

export const ERST_KEY = "gc-zeki-erst";
export const ERST_DAUER_MS = 7000; // Setzung 30.10.2026: Zekis Erst-Satz steht höchstens 7 s
export const ERST_PUNKTE = ["muell", "kuehl", "putzplan", "karte", "umsatzheute", "ware", "preisrunde", "vergleich", "inventur", "bestand", "ordner-amt", "ordner-steuer", "ordner-buch", "personal", "listen", "aktionen"];
const lesen = (sp) => { try { return new Set(JSON.parse(sp?.getItem(ERST_KEY) || "[]")); } catch { return new Set(); } };
const schreiben = (sp, set) => { try { sp?.setItem(ERST_KEY, JSON.stringify([...set])); } catch { /* privat: dann eben jedes Mal */ } };

// Soll Zeki jetzt etwas sagen? Gibt den Satz zurück oder null (schon gesehen, Stoßzeit, kein bekannter Punkt).
export function erstSatz(punkt, { speicher, stunde, stand } = {}) {
  if (!ERST_PUNKTE.includes(punkt) || lesen(speicher).has(punkt)) return null;
  if (typeof stunde === "number" && istHauptzeit(stunde, stand)) return null;
  return t("rundgang.erst." + punkt.replace("-", "_"));
}
export function erstGesehen(punkt, speicher) { const s = lesen(speicher); s.add(punkt); schreiben(speicher, s); }
export function erstWiederZeigen(speicher) { try { speicher?.removeItem(ERST_KEY); } catch { /* egal */ } }

// Anzeige: kleine Karte unten mit Zeki, Satz und „Verstanden“
export function erstZeigen(doc, punkt, satz, speicher) {
  if (!doc || !satz || doc.querySelector(".zeki-erst")) return;
  const el = doc.createElement("div"); el.className = "zeki-erst"; el.setAttribute("role", "dialog");
  el.innerHTML = `<div class="ze-karte"><span class="ze-zeki">${mascotMarkup("hilfe", "none")}</span><div class="ze-blase"><p dir="auto">${esc(satz)}</p>
    <button type="button" class="knopf" data-ze="ok">${esc(t("rundgang.erst.ok"))}</button></div></div>`;
  doc.body.appendChild(el);
  // Pilotfest 30.10.2026 (live): „Verstanden“ ODER ein Tipp irgendwo sonst schließt die Karte – sie steht nie im Weg (Regel: keine unnötigen Meldungen im Laden).
  const zu = () => { erstGesehen(punkt, speicher); el.remove(); doc.removeEventListener("pointerdown", draussen, true); };
  const draussen = (e) => { if (!el.contains(e.target)) zu(); };
  el.querySelector('[data-ze="ok"]').addEventListener("click", zu);
  setTimeout(() => { if (el.isConnected) doc.addEventListener("pointerdown", draussen, true); }, 50);
  setTimeout(() => { if (el.isConnected) zu(); }, ERST_DAUER_MS); // nach 7 s von allein weg (gilt als gesehen)
}
