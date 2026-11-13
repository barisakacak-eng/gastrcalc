// Nachladen: das Büro-Paket (alle Büro-Bildschirme mit ihren Klick- und Eingabe-Tabellen, js/bedienung/paket_buero.js) wird erst geladen,
// wenn eine Büro-Ansicht zum ersten Mal gebraucht wird. Der Laden (Heute, Müll, Kühlung, Putzplan, Karte), Personal und die Einrichtung
// gehören zum Start-Kern und brauchen das Paket nicht. Solange das Paket lädt, bleibt der alte Bildschirm stehen (zeichne() wartet).
// bueroPaket() liefert das geladene Paket oder null – wer es nur „wenn da“ braucht (Zurücksetzen, Zurück-Geste), fragt damit.
let paket = null;
let laeuft = null;

// Die Ansichten, die das Büro-Paket zeichnet (paket_buero.js hat zu jeder einen Eintrag in VIEW; tests/nachladen.test.mjs prüft das).
export const BUERO_ANSICHTEN = new Set([
  "buero", "laeden", "beleg", "abschluss", "vergleich", "preisrunde", "ware", "portion", "inventur", "verkauf", "bestand", "aktionen",
  "tafel", "hinweise", "geld3", "getraenke", "lieferanten", "kuehlware", "ordner-amt", "ordner-steuer", "ordner-buch",
]);
export const istBueroAnsicht = (a) => BUERO_ANSICHTEN.has(a);

export const bueroPaket = () => paket;
export function bueroPaketLaden() {
  if (paket) return Promise.resolve(paket);
  if (!laeuft) laeuft = import("./paket_buero.js").then((m) => { paket = m; return m; }, (e) => { laeuft = null; throw e; }); // Fehler: beim nächsten Mal neu versuchen
  return laeuft;
}
