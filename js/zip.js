// W2-D (15.10.2026): kleines ZIP ohne Fremdbibliothek – nur „store“ (ohne Kompression), mit CRC32 je Datei.
// Fotos sind schon JPEG/WebP (Komprimieren bringt nichts), die Daten-JSON ist klein. Kein ZIP64: eine Sicherung bleibt unter 4 GB.
// Schreiben: zipBlob([{ name, daten: Blob|Uint8Array|Text }]) → Blob. Die Dateien werden einzeln gelesen (CRC), nie alle auf einmal im Speicher.
// Lesen: zipLesen(blob) → [{ name, groesse, crc, blob(), crcOk() }] über das Inhaltsverzeichnis am Ende der Datei.

let TAB = null;
function tabelle() {
  if (TAB) return TAB;
  TAB = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; TAB[n] = c >>> 0; }
  return TAB;
}
export function crc32(bytes, crc = 0) {
  const T = tabelle(); let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = T[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();
async function alsBytes(d) {
  if (d instanceof Uint8Array) return d;
  if (typeof d === "string") return enc.encode(d);
  if (d && typeof d.arrayBuffer === "function") return new Uint8Array(await d.arrayBuffer());
  return new Uint8Array(0);
}
// DOS-Datum/Zeit für den Kopf (nur Anzeige in Entpackprogrammen)
function dosZeit(d = new Date()) {
  const zeit = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const datum = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { zeit, datum };
}

export async function zipBlob(eintraege, { jetzt = new Date() } = {}) {
  const teile = []; const zentral = []; let off = 0; const { zeit, datum } = dosZeit(jetzt);
  for (const e of eintraege) {
    const name = enc.encode(e.name);
    const bytes = await alsBytes(e.daten); const crc = crc32(bytes); const n = bytes.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, zeit, true); h.setUint16(12, datum, true); h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    // Die Bytes der Datei: wenn möglich das Original-Blob weiterreichen (der Browser kopiert dann nicht in den JS-Speicher)
    teile.push(new Uint8Array(h.buffer), name, e.daten instanceof Blob ? e.daten : bytes);
    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(10, 0, true);
    z.setUint16(12, zeit, true); z.setUint16(14, datum, true); z.setUint32(16, crc, true); z.setUint32(20, n, true); z.setUint32(24, n, true);
    z.setUint16(28, name.length, true); z.setUint32(42, off, true);
    zentral.push(new Uint8Array(z.buffer), name);
    off += 30 + name.length + n;
  }
  const zGroesse = zentral.reduce((s, x) => s + x.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true); ende.setUint16(8, eintraege.length, true); ende.setUint16(10, eintraege.length, true);
  ende.setUint32(12, zGroesse, true); ende.setUint32(16, off, true);
  return new Blob([...teile, ...zentral, new Uint8Array(ende.buffer)], { type: "application/zip" });
}

export async function istZip(blob) {
  if (!blob || blob.size < 22) return false;
  const b = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}

const dec = new TextDecoder();
// E7 (17.10.2026): gepackt: true liest auch „deflate“-Einträge (Kassen-Exporte sind fast immer gepackt). Entpackt wird mit dem
// Browser selbst (DecompressionStream „deflate-raw“), ohne Fremdbibliothek. Ohne diese Fähigkeit: Eintrag mit gepackt: true und bytes() wirft.
// Ohne die Option bleibt alles wie bisher (die Sicherung liest nur „store“).
async function entpacken(teil) {
  if (typeof DecompressionStream !== "function") throw Object.assign(new Error("zip"), { grund: "gepackt" });
  const strom = teil.stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}
export async function zipLesen(blob, { gepackt = false } = {}) {
  const fehler = () => Object.assign(new Error("zip"), { grund: "format" });
  const L = Math.min(blob.size, 22 + 65535);
  const schwanz = new Uint8Array(await blob.slice(blob.size - L).arrayBuffer());
  let p = -1; for (let i = schwanz.length - 22; i >= 0; i--) if (schwanz[i] === 0x50 && schwanz[i + 1] === 0x4b && schwanz[i + 2] === 0x05 && schwanz[i + 3] === 0x06) { p = i; break; }
  if (p < 0) throw fehler();
  const e = new DataView(schwanz.buffer, p);
  const anzahl = e.getUint16(10, true), zGroesse = e.getUint32(12, true), zOff = e.getUint32(16, true);
  if (zOff + zGroesse > blob.size) throw fehler();
  const z = new Uint8Array(await blob.slice(zOff, zOff + zGroesse).arrayBuffer()); const dv = new DataView(z.buffer);
  const out = []; let q = 0;
  for (let i = 0; i < anzahl; i++) {
    if (q + 46 > z.length || dv.getUint32(q, true) !== 0x02014b50) throw fehler();
    const art = dv.getUint16(q + 10, true), crc = dv.getUint32(q + 16, true), groesse = dv.getUint32(q + 20, true), roh = dv.getUint32(q + 24, true);
    const nl = dv.getUint16(q + 28, true), xl = dv.getUint16(q + 30, true), kl = dv.getUint16(q + 32, true), lokal = dv.getUint32(q + 42, true);
    const name = dec.decode(z.subarray(q + 46, q + 46 + nl)); q += 46 + nl + xl + kl;
    const deflate = gepackt && art === 8; // E7 (17.10.2026)
    if (!deflate && (art !== 0 || groesse !== roh)) continue; // nur „store“ – fremde, gepackte Einträge überspringen
    const kopf = new DataView(await blob.slice(lokal, lokal + 30).arrayBuffer());
    if (kopf.byteLength < 30 || kopf.getUint32(0, true) !== 0x04034b50) throw fehler();
    const start = lokal + 30 + kopf.getUint16(26, true) + kopf.getUint16(28, true);
    if (start + groesse > blob.size) throw fehler();
    if (deflate) { // E7 (17.10.2026): groesse ist hier die gepackte Länge, roh die entpackte
      const teil = () => blob.slice(start, start + groesse);
      out.push({ name, groesse: roh, crc, gepackt: true, blob: teil, bytes: () => entpacken(teil()), async crcOk() { return crc32(await entpacken(teil())) === crc; } });
      continue;
    }
    const teil = () => blob.slice(start, start + groesse);
    out.push({ name, groesse, crc, blob: teil, async bytes() { return new Uint8Array(await teil().arrayBuffer()); }, async crcOk() { return crc32(new Uint8Array(await teil().arrayBuffer())) === crc; } });
  }
  return out;
}
