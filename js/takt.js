// Zwischenspeicher für EIN Bild (Stresstest 15.10.2026): Während ein Bildschirm gezeichnet wird, fragen viele Bausteine dieselben
// Listen ab (Messungen je Stelle, letzte Putz-Haken, häufigster Müll). Gültig nur bis zum Ende des synchronen Zeichnens –
// danach rechnet alles wieder frisch, damit nie ein alter Stand angezeigt wird.
let takt = 0; let aktiv = false; const speicher = new WeakMap();
export function neuerTakt() { takt += 1; aktiv = true; queueMicrotask(() => { aktiv = false; }); }
export function imTakt(stand, schluessel, rechne) {
  if (!aktiv || !stand || typeof stand !== "object") return rechne();
  let m = speicher.get(stand); if (!m || m.takt !== takt) { m = { takt, werte: new Map() }; speicher.set(stand, m); }
  if (m.werte.has(schluessel)) return m.werte.get(schluessel);
  const w = rechne(); m.werte.set(schluessel, w); return w;
}
