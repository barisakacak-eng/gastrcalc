// Speichern der Wurzel aus der Bedienschicht. Ein erfolgreiches Schreiben nimmt das Fehler-Banner weg. Das verzögerte Speichern meldet
// sein Ergebnis nicht – solange ein Speicherproblem offen ist, geht darum jedes Speichern über den sofortigen Weg, dessen Ergebnis bekannt ist.
import { Z } from "../bedienung/zustand.js";
import { personalKontext, personalAktiv, personalNachtragen } from "../screens/personal.js";
import { problemNachErfolg } from "../bedienhilfe.js";
import { sofortSpeichern as sofortSpeichernRoh, speichernAbbrechen, speichern as speichernVerzoegert } from "../store.js";
function personNachtragen() { if (Z.wurzel && Z.stand) { personalKontext(Z.wurzel); if (personalAktiv()) personalNachtragen(Z.stand); } }

function speicherErgebnis(ok) {
  if (ok === true) { const neu = problemNachErfolg(Z.speicherProblem); if (neu !== Z.speicherProblem) { Z.speicherProblem = neu; if (!neu) Z.root.querySelector(".speicherband")?.remove(); } }
  return ok;
}

const sofortSpeichernStore = (w, opts) => sofortSpeichernRoh(w, opts).then(speicherErgebnis);

const speichernStore = (w) => { if (Z.speicherProblem === "speichern" || Z.speicherProblem === "voll") { speichernAbbrechen(); return sofortSpeichernStore(w); } return speichernVerzoegert(w); };

export function speichern(w) { personNachtragen(); return speichernStore(w); }

export function sofortSpeichern(w, opts) { personNachtragen(); return sofortSpeichernStore(w, opts); }

export const ohneStempelSpeichern = () => { personNachtragen(); return sofortSpeichernStore(Z.wurzel, { stempel: false }); };
