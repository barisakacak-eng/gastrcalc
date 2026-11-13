// Läden verwalten: aktiven Laden setzen, neuen Laden anlegen, wechseln, löschen, Beispiel-Laden, „Alles löschen“.
// Strukturänderungen (neuer Laden, Wechsel, Löschen) werden sofort geschrieben, nicht erst nach der Verzögerung.
import { Z } from "../bedienung/zustand.js";
import { schrittIdMerken, schritteFuer, schrittWiederherstellen } from "../screens/onboarding.js";
import { alleZuruecksetzen } from "./zuruecksetzen.js";
import { leererBetrieb, ereignis, speichernAbbrechen, allesLoeschen, speicherVerfuegbar, leereWurzel } from "../store.js";
import { zeichne } from "./zeichnen.js";
import { sofortSpeichern } from "./speichern.js";
import { startAnsicht, codeAktiv, ebeneVergessen } from "../modus.js";
import { blattOffen, pinStarten, blattSchliessen } from "../screens/ebene.js";
import { t } from "../i18n.js";
import { beispielLaden } from "../beispiel.js";
import { heuteGeschaeft } from "../util.js";
import { ablageLeeren } from "../ablage.js";
import { meldung } from "./meldung.js";
import { setzeSprache, spracheDesGeraets } from "./sprache.js";

// Ein Schritt, der beim Betreten Daten vorbereitet (Einkaufspreise: Artikelliste abgleichen), tut das hier – beim Wechsel des Schritts
// oder Ladens, nicht im Zeichnen. Dazu wird hier auch die Kennung des Schritts gemerkt (schrittIdMerken).
export function schrittBetreten() { if (Z.stand?.phase !== "onboarding") return; schrittIdMerken(Z.stand); const s = schritteFuer(Z.stand)[Z.stand.schritt]; if (s?.beimBetreten) s.beimBetreten(Z.stand); }

export function aktivSetzen(id) {
  if (Z.stand && Z.stand.id !== id) alleZuruecksetzen(); // offene Formulare gehören zum alten Laden (W2-D: zentrale Liste)
  Z.stand = Z.wurzel.betriebe.find((b) => b.id === id) || null;
  if (!Z.stand) { Z.stand = Z.wurzel.betriebe[0] || null; }
  if (!Z.stand) { Z.stand = leererBetrieb(); Z.wurzel.betriebe.push(Z.stand); }
  Z.wurzel.aktiv = Z.stand.id;
  schrittWiederherstellen(Z.stand); // E: gespeicherter Onboarding-Schritt nach Kennung (alte Stände: Nummer → Kennung)
  schrittBetreten();
}

// Neuer Laden: Die Sprache ist schon gewählt, also beginnt der neue Laden beim Format (Schritt 1).
async function ladenNeu() {
  const neu = leererBetrieb(); neu.schritt = 1; neu.neuAus = Z.stand.id;
  Z.wurzel.betriebe.push(neu); aktivSetzen(neu.id);
  ereignis("laden-neu", { laden: neu.id, anzahl: Z.wurzel.betriebe.length });
  history.pushState({ schritt: 1 }, "");
  zeichne(); await sofortSpeichern(Z.wurzel);
}

async function ladenWechseln(id) {
  if (!Z.wurzel.betriebe.some((b) => b.id === id)) return;
  aktivSetzen(id); Z.ansicht = Z.stand.phase === "app" ? startAnsicht(Z.wurzel) : Z.ansicht;
  ereignis("laden-wechsel", { laden: id });
  zeichne(); await sofortSpeichern(Z.wurzel);
}

// Die eigentlichen Löschungen laufen erst nach dem Code (falls gesetzt), dann noch die Rückfrage.
function mitCode(zweck, ziel, weiter) {
  if (!codeAktiv(Z.wurzel)) return weiter();
  if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten(zweck, ziel, Z.wurzel);
}

export async function ladenLoeschenJetzt(id) {
  const b = Z.wurzel.betriebe.find((x) => x.id === id);
  if (!b || Z.wurzel.betriebe.length < 2 || !confirm(t("einstellungen.ladenLoeschenFrage", b.betrieb.name))) return;
  Z.wurzel.betriebe = Z.wurzel.betriebe.filter((x) => x.id !== id);
  aktivSetzen((Z.wurzel.betriebe.find((x) => x.phase === "app" && !x.beispiel) || Z.wurzel.betriebe.find((x) => x.phase === "app") || Z.wurzel.betriebe[0]).id); // Beispiel-Laden (17.10.2026): zurück zum eigenen Laden
  await ereignis("laden-geloescht", { laden: id, beispiel: !!b.beispiel }); Z.ansicht = "laeden"; await sofortSpeichern(Z.wurzel); return zeichne();
}

// Beispiel-Laden: zweiter Laden über die Mehr-Laden-Logik; gibt es ihn schon, nur dorthin wechseln. Der eigene Laden bleibt unberührt.
async function beispielAnlegen() {
  const da = Z.wurzel.betriebe.find((b) => b.beispiel);
  if (da) return ladenWechseln(da.id);
  const b = beispielLaden(heuteGeschaeft(), { name: t("beispiel.name"), jetzt: new Date().toISOString() });
  Z.wurzel.betriebe.push(b);
  await ereignis("beispiel-angelegt", { laden: b.id });
  return ladenWechseln(b.id);
}

// „Alles löschen“: Fotos nur weg, wenn die Daten wirklich gelöscht sind.
export async function allesLoeschenJetzt() {
  if (!confirm(t("einstellungen.loeschenFrage"))) return;
  speichernAbbrechen();
  const geloescht = await allesLoeschen();
  if (geloescht) await ablageLeeren();
  else if (speicherVerfuegbar()) { meldung(t("w2d.loeschenFehlgeschlagen")); return; }
  alleZuruecksetzen(); ebeneVergessen(); blattSchliessen();
  Z.wurzel = leereWurzel(); Z.stand = null; aktivSetzen(null); Z.ansicht = "start"; Z.ereignisAnzahl = 0;
  setzeSprache(spracheDesGeraets()); return zeichne();
}

export const KLICK = {
  "laden-neu": () => ladenNeu(),
  "laden-wechseln": (el) => ladenWechseln(el.dataset.id),
  "laden-loeschen": () => { // mit Büro-Code
    if (Z.wurzel.betriebe.length < 2) return;
    return mitCode("ladenLoeschen", Z.stand.id, () => ladenLoeschenJetzt(Z.stand.id));
  },
  "beispiel-anlegen": () => beispielAnlegen(),
  "beispiel-loeschen": () => { // gleiche Rückfrage wie „Laden löschen“
    if (!Z.stand.beispiel || Z.wurzel.betriebe.length < 2) return;
    return mitCode("ladenLoeschen", Z.stand.id, () => ladenLoeschenJetzt(Z.stand.id));
  },
  loeschen: () => mitCode("loeschen", null, () => allesLoeschenJetzt()), // mit Büro-Code (auch auf der Fehlerseite)
};
