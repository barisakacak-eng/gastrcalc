// Prüf-Helfer: Zufall mit Seed (mulberry32), kleine Property-Test-Schleife. Keine App-Änderung.
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
export const pick = (r, l) => l[Math.floor(r() * l.length)];
export const cents = (r, max = 100000) => ri(r, 0, max) / 100; // glatter Cent-Betrag
export function property(name, n, seed, fn) { // fn(r, i) -> null (ok) | Text (Fehler)
  const r = rng(seed); let fail = 0; const bsp = [];
  for (let i = 0; i < n; i++) { let m; try { m = fn(r, i); } catch (e) { m = "Ausnahme: " + e.message; } if (m) { fail++; if (bsp.length < 3) bsp.push(m); } }
  console.log(`${fail ? "FAIL" : "ok  "} ${name}: ${n} Fälle, ${fail} Fehler${bsp.length ? "\n      z. B. " + bsp.join("\n      z. B. ") : ""}`);
  return fail;
}
export const rund2 = (x) => Math.round(x * 100) / 100;
