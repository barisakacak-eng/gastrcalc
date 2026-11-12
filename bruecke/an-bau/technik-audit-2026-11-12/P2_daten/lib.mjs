import fs from "node:fs";
export const FIX = new URL("../tests/fixtures/pruefstand/pruefstand_sicherung.zip", import.meta.url).pathname;
export const fixBlob = () => new Blob([fs.readFileSync(FIX)], { type: "application/zip" });
export function diff(a, b, pfad = "", out = [], max = 40) {
  if (out.length >= max) return out;
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) { if (!(k in a)) out.push(`+ ${pfad}.${k} (nur rechts)`); else if (!(k in b)) out.push(`- ${pfad}.${k} (nur links) = ${JSON.stringify(a[k]).slice(0,60)}`); else diff(a[k], b[k], pfad + "." + k, out, max); }
  } else out.push(`~ ${pfad}: ${JSON.stringify(a)?.slice(0,60)} -> ${JSON.stringify(b)?.slice(0,60)}`);
  return out;
}
export const stabil = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([p],[q]) => p < q ? -1 : 1)) : v));
export const uhr = { ms: Date.parse("2027-01-01T19:00:00Z"), set(iso) { this.ms = Date.parse(iso); }, plus(min) { this.ms += min * 60000; } };
export function uhrStellen(iso = "2027-01-01T19:00:00Z") { uhr.set(iso); const Echt = Date; class D extends Echt { constructor(...a) { if (a.length === 0) super(uhr.ms); else super(...a); } static now() { return uhr.ms; } } globalThis.Date = D; }
