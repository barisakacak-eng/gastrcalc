// Büro-Code (4 Ziffern, Drei Ebenen 15.10.2026): gespeichert wird nur ein Hash mit Salz auf der Wurzel, nie die Ziffern.
// wurzel.bueroCode = { hash, salz, gesetzt } | null. Derselbe Code schützt das Büro und den Weg zurück aus dem Personal-Modus (Entwickler A).
// SHA-256 über Web Crypto (Browser und node ≥ 19); ohne Web Crypto (alter Browser, http) ein einfacher Hash – besser als Klartext.
export const CODE_RE = /^\d{4}$/;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
function einfach(s) { let h1 = 0x811c9dc5, h2 = 5381; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = ((h2 << 5) + h2 + c) >>> 0; } return "e" + h1.toString(16) + h2.toString(16); }
export async function codeHash(code, salz) {
  const text = `gastrocalc:${salz}:${code}`;
  const sub = globalThis.crypto?.subtle;
  if (sub) { try { return hex(await sub.digest("SHA-256", new TextEncoder().encode(text))); } catch (_) { /* unsicherer Kontext */ } }
  return einfach(text);
}
const neuesSalz = () => { const a = new Uint8Array(8); if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(a); else for (let i = 0; i < 8; i++) a[i] = Math.floor(Math.random() * 256); return hex(a); };
export const codeGesetzt = (wurzel) => !!(wurzel?.bueroCode && wurzel.bueroCode.hash);
export async function codeSetzen(wurzel, code, { jetzt = new Date().toISOString() } = {}) {
  if (!wurzel || !CODE_RE.test(String(code))) return false;
  const salz = neuesSalz(); wurzel.bueroCode = { hash: await codeHash(String(code), salz), salz, gesetzt: jetzt }; return true;
}
export async function codePruefen(wurzel, code) {
  if (!codeGesetzt(wurzel)) return true; // kein Code: frei
  if (!CODE_RE.test(String(code))) return false;
  return (await codeHash(String(code), wurzel.bueroCode.salz)) === wurzel.bueroCode.hash;
}
export function codeEntfernen(wurzel) { if (!wurzel) return false; wurzel.bueroCode = null; return true; }
