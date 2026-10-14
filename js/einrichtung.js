// Einrichtung in Prozent (Etappe 6, Punkt 6 – Baris 14.10.2026, 16:32/16:35): statt „fehlt noch"-Kästen auf jeder Seite
// zeigt das Cockpit einen Ring mit Prozent, den nächsten Schritt und die Checkliste. Rein rechnend, Texte über Schlüssel.
// Sieben Schritte, je 1/7, Teilerfüllung anteilig. 100 % nur, wenn wirklich alles erfüllt ist. Keine erfundenen Zahlen.
import { preisJeBasis, stelleBereit } from "./engine.js";

const PFLICHT = ["miete", "personal", "eigenerLohn", "energie"];
const SICHERUNG_TAGE = 7;

function kostenAnteil(stand) {
  const kosten = stand.kosten || [];
  const erledigt = (ids) => kosten.some((k) => ids.includes(k.posten) && ["bekannt", "geschaetzt", "aus"].includes(k.status) && (k.status === "aus" || typeof k.betrag === "number"));
  const team = stand.team || {};
  const teile = {
    miete: erledigt(["miete", "standgebuehr"]),
    personal: typeof team.lohnkosten === "number" || team.personen === 0,
    eigenerLohn: typeof team.eigenerLohn === "number",
    energie: erledigt(["strom", "gas"]),
  };
  const fehlt = PFLICHT.filter((p) => !teile[p]);
  return { anteil: (PFLICHT.length - fehlt.length) / PFLICHT.length, fehlt };
}

export function einrichtungStand(stand, wurzel = null, { jetzt = Date.now() } = {}) {
  const gerichte = stand.gerichte || [];
  const speisen = gerichte;
  const mitPreis = speisen.filter((g) => typeof g.preis === "number").length;
  const mitRezept = speisen.filter((g) => g.klasse === "getraenk" || (g.zutaten || []).length || g.rezeptBewusstLeer).length;
  const artikel = (stand.artikel || []).filter((a) => a.benutzt !== false);
  const mitEk = artikel.filter((a) => preisJeBasis(a) !== null).length;
  const k = kostenAnteil(stand);
  const kuehlFertig = (stand.kuehlstellen || []).some((x) => !x.archiviert && stelleBereit(x) && (x.max !== null || x.min !== null)) || stand.kuehl?.keine === true;
  const gesichert = wurzel?.letzteSicherung ? (jetzt - Date.parse(wurzel.letzteSicherung)) / 86400e3 < SICHERUNG_TAGE : false;
  const anteil = (n, von) => (von ? n / von : 0);
  const schritte = [
    { id: "karte", anteil: speisen.length ? 1 : 0, rest: speisen.length ? 0 : 1, ziel: { aktion: "nav", wert: "kartefoto" } },
    { id: "preise", anteil: anteil(mitPreis, speisen.length), rest: speisen.length - mitPreis, ziel: { aktion: "nav", wert: "kartefoto" } },
    { id: "rezepte", anteil: anteil(mitRezept, speisen.length), rest: speisen.length - mitRezept, ziel: { aktion: "bearbeiten", schritt: "rezepte" } },
    { id: "kosten", anteil: k.anteil, rest: k.fehlt.length, fehlt: k.fehlt, ziel: { aktion: "bearbeiten", schritt: "kosten-miete", bis: "kosten-sonstiges" } },
    { id: "einkauf", anteil: anteil(mitEk, artikel.length), rest: artikel.length - mitEk, ziel: { aktion: "nav", wert: "beleg" } },
    { id: "kuehlung", anteil: kuehlFertig ? 1 : 0, rest: kuehlFertig ? 0 : 1, ziel: { aktion: "nav", wert: "kuehl" } },
    { id: "sicherung", anteil: gesichert ? 1 : 0, rest: gesichert ? 0 : 1, ziel: { aktion: "export" } },
  ];
  // Preise: ohne Gerichte gibt es nichts zu bepreisen – der Schritt hängt an der Karte
  if (!speisen.length) { schritte[1].anteil = 0; schritte[2].anteil = 0; schritte[4].anteil = 0; }
  // Gerichte ohne Preis: zum Bearbeiten in die Karte
  if (speisen.length) schritte[1].ziel = { aktion: "bearbeiten", schritt: "verkauf" };
  for (const s of schritte) s.fertig = s.anteil >= 1;
  const prozent = Math.floor(schritte.reduce((x, s) => x + Math.min(1, s.anteil), 0) / schritte.length * 100 + 1e-9);
  const naechster = schritte.find((s) => !s.fertig) || null;
  return { prozent: schritte.every((s) => s.fertig) ? 100 : Math.min(99, prozent), schritte, naechster, offen: schritte.filter((s) => !s.fertig).length };
}
