// Einrichtung in Prozent (Etappe 6, Punkt 6 – Baris 14.10.2026, 16:32/16:35): statt „fehlt noch"-Kästen auf jeder Seite
// zeigt das Cockpit einen Ring mit Prozent, den nächsten Schritt und die Checkliste. Rein rechnend, Texte über Schlüssel.
// Sieben Schritte, je 1/7, Teilerfüllung anteilig. 100 % nur, wenn wirklich alles erfüllt ist. Keine erfundenen Zahlen.
import { preisJeBasis, stelleBereit, istRichtpreis, grenzenVon } from "./engine.js";
import { rezeptStempel } from "./rezept_quelle.js"; // 19.10.2026: Startwerte zählen nur halb

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
  // Baris 19.10.2026: 100 % erst mit echten Werten – ein Rezept mit Startwerten (geschätzte Mengen) zählt halb, selbst gewogen voll.
  const rezeptWert = (g) => { if (g.klasse === "getraenk" || g.rezeptBewusstLeer) return 1; if (!(g.zutaten || []).length) return 0; const st = rezeptStempel(g).stufe; return st === "eigen" || st === "eigen-abgeleitet" ? 1 : 0.5; };
  const mitRezept = speisen.reduce((x, g) => x + rezeptWert(g), 0);
  const artikel = (stand.artikel || []).filter((a) => a.benutzt !== false);
  // Richtpreise (17.10.2026): zählen NICHT als erledigt (sonst trägt der Wirt nie nach). Rezept-Startwerte zählen hier voll – das ist
  // bewusst anders: ein Startwert ist eine Menge, die meist passt; ein Richtpreis ist ein fremder Preis. Anteil für Richtpreise: 0.
  const mitEk = artikel.filter((a) => preisJeBasis(a) !== null && !istRichtpreis(a)).length;
  const k = kostenAnteil(stand);
  // Schwadron 18.10.2026, M4: fertig, sobald eine Stelle eine Grenze hat – auch die Standardgrenze (Schnellstart legt Stellen damit an,
  // die Kühlkontrolle läuft damit). Vorher zählte nur eine selbst eingetragene Grenze → „als Nächstes: Kühlung“ trotz laufender Kontrolle.
  const kuehlFertig = (stand.kuehlstellen || []).some((x) => { if (x.archiviert || !stelleBereit(x)) return false; const g = grenzenVon(x); return g.min !== null || g.max !== null; }) || stand.kuehl?.keine === true;
  const gesichert = wurzel?.letzteSicherung ? (jetzt - Date.parse(wurzel.letzteSicherung)) / 86400e3 < SICHERUNG_TAGE : false;
  const anteil = (n, von) => (von ? n / von : 0);
  const schritte = [
    { id: "karte", anteil: speisen.length ? 1 : 0, rest: speisen.length ? 0 : 1, ziel: { aktion: "nav", wert: "kartefoto" } },
    { id: "preise", anteil: anteil(mitPreis, speisen.length), rest: speisen.length - mitPreis, ziel: { aktion: "nav", wert: "kartefoto" } },
    { id: "rezepte", anteil: anteil(mitRezept, speisen.length), rest: Math.ceil(speisen.length - mitRezept), ziel: { aktion: "bearbeiten", schritt: "rezepte" } },
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
