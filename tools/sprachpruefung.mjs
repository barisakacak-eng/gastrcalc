// Prüft eine Sprachdatei gegen Deutsch: gleiche Schlüssel, gleiche Art (Text/Funktion/Liste/Objekt), Funktionen mit gleicher Stelligkeit,
// Funktionen liefern Text, Listen gleich lang. Aufruf: node tools/sprachpruefung.mjs ar fa ku …  (ohne Argument: alle in js/lang)
import fs from "node:fs";
const de = (await import("../js/lang/de.js")).default;
const codes = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(new URL("../js/lang/", import.meta.url)).map((f) => f.replace(".js", "")).filter((c) => c !== "de");
const art = (v) => Array.isArray(v) ? "liste" : typeof v === "function" ? "funktion" : v && typeof v === "object" ? "objekt" : typeof v;
let fehlerGesamt = 0;
for (const c of codes) {
  let tab; try { tab = (await import(`../js/lang/${c}.js`)).default; } catch (e) { console.log(c, "LÄDT NICHT:", e.message); fehlerGesamt++; continue; }
  const fehler = [];
  const geh = (a, b, pfad) => {
    for (const k of Object.keys(a)) {
      const p = pfad ? pfad + "." + k : k; const x = a[k], y = b?.[k];
      if (y === undefined) { fehler.push("fehlt: " + p); continue; }
      if (art(x) !== art(y)) { fehler.push(`Art ${art(x)}≠${art(y)}: ${p}`); continue; }
      if (art(x) === "objekt") geh(x, y, p);
      else if (art(x) === "liste") { if (x.length !== y.length) fehler.push(`Liste ${x.length}≠${y.length}: ${p}`); }
      else if (art(x) === "funktion") { if (x.length !== y.length) fehler.push(`Stellen ${x.length}≠${y.length}: ${p}`);
        const args = Array.from({ length: x.length }, (_, i) => (i === 0 ? 2 : "X")); let rde = null; try { rde = x(...args); } catch { rde = null; }
        if (typeof rde === "string" && rde.trim()) { try { const r = y(...args); if (typeof r !== "string" || !r.trim()) fehler.push("Funktion liefert keinen Text: " + p); } catch (e) { fehler.push("Funktion wirft: " + p + " " + e.message); } } }
      else if (typeof y === "string" && !y.trim() && String(x).trim()) fehler.push("leer: " + p);
    }
    for (const k of Object.keys(b || {})) if (!(k in a)) fehler.push("überzählig: " + (pfad ? pfad + "." + k : k));
  };
  geh(de, tab, "");
  console.log(`${c}: ${fehler.length ? fehler.length + " Fehler" : "ok"}`); fehler.slice(0, 15).forEach((f) => console.log("   " + f)); fehlerGesamt += fehler.length;
}
process.exit(fehlerGesamt ? 1 : 0);
