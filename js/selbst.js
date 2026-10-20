// Eigene Herstellung (Punkt 2): Antwort auf „Was macht ihr selbst?" in die Artikel übertragen.
import { ZWISCHENREZEPTE, vorauswahlFuer } from "./data/zwischen.js";
import { PRODUKT_INDEX } from "./data/katalog.js";
import { ladenArtVon } from "./profil.js";

// Die gewählten Kacheln: eigene Antwort, sonst die Vorauswahl der Laden-Art.
export const selbstGewaehlt = (stand) => (Array.isArray(stand.selbst) ? stand.selbst : vorauswahlFuer(ladenArtVon(stand)));

const neuerArtikel = (name, einheit) => {
  const kat = PRODUKT_INDEX[name]; const e = kat?.e || (einheit === "stk" ? "stk" : "kg");
  return { name, gruppe: kat?.g || "teig", einheit: e, packung: { menge: null, einheit: e }, preis: null, preisBasis: "netto", preisHistorie: [], status: "offen" };
};

// Setzt herkunft „selbst" mit Start-Rezept für gewählte Teile, „gekauft" für die anderen. Ein vom Wirt geändertes Rezept bleibt.
// Wechsel auf gekauft: das Rezept bleibt gespeichert (für den Rückweg), der Preis wird wieder ein Einkaufspreis (leer, bis bekannt).
export function selbstAnwenden(stand, ids = selbstGewaehlt(stand)) {
  stand.selbst = [...ids];
  stand.artikel ??= [];
  for (const r of ZWISCHENREZEPTE) {
    let a = stand.artikel.find((x) => x.name === r.name);
    const an = ids.includes(r.kachel);
    if (!a && !an) continue;
    if (!a) { a = neuerArtikel(r.name, r.einheit); stand.artikel.push(a); }
    if (an) {
      if (a.herkunft !== "selbst") { a.gekauftVorher = a.preis !== null && a.herkunft !== "selbst" ? { preis: a.preis, packung: a.packung, preisBasis: a.preisBasis } : a.gekauftVorher || null; }
      a.herkunft = "selbst";
      if (!a.rezept || a.rezept.quelle === "baukasten") a.rezept = { zutaten: r.zutaten.map((z) => ({ ...z })), ausbeute: { ...r.ausbeute }, arbeitMin: r.arbeitMin, quelle: "baukasten", ...(r.stueck ? { stueck: { ...r.stueck } } : {}) };
    } else if (a.herkunft === "selbst") {
      a.herkunft = "gekauft";
      const v = a.gekauftVorher; a.preis = v?.preis ?? null; a.packung = v?.packung || { menge: null, einheit: a.einheit }; a.preisBasis = v?.preisBasis || "netto"; a.status = a.preis === null ? "offen" : "bekannt";
    }
  }
  return stand;
}

// Trennung (17.10.2026): aus js/screens/onboarding.js ins Rechenwerk verschoben (unverändert).
// Vorauswahl „selbst gemacht“ nach Laden-Art – still angewendet, ohne Frage. Eine eigene Antwort des Wirts (im Büro geändert) bleibt.
const gleich = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
export function selbstStandard(stand) {
  const art = ladenArtVon(stand); if (!art) return false;
  const eigeneAntwort = Array.isArray(stand.selbst) && !(stand.selbstAutoArt && gleich(stand.selbst, vorauswahlFuer(stand.selbstAutoArt)));
  if (eigeneAntwort) return false;
  selbstAnwenden(stand, vorauswahlFuer(art)); stand.selbstAutoArt = art;
  return true;
}
