// Trennung 2 (17.10.2026): Zahlen für den Personal-Start (ohne Euro) – offene Kühl-Messungen und Putzstand heute.
// Vorher in js/screens/personal.js. Die Schicht-Person (Gerätespeicher) bleibt beim Bildschirm, sie ist kein Laden-Datum.
import { kuehlStatus, offeneNachkontrollen } from "./engine.js";
import { planVon, planGruppen } from "./putzplan.js";

// kuehlOffen: Stellen ohne Messung heute + offene Nachkontrollen (null = Kühlung nicht eingerichtet);
// putzen: { erledigt, gesamt } heute (null = kein Putzplan).
export function personalZahlen(stand) {
  const ks = kuehlStatus(stand);
  const kuehlOffen = ks.eingerichtet ? Math.max(0, ks.stellen - ks.heuteGemessen) + offeneNachkontrollen(stand).length : null;
  const plan = planVon(stand)?.aktiv ? planGruppen(stand) : null;
  return { kuehlOffen, putzen: plan ? { erledigt: plan.erledigt, gesamt: plan.gesamt } : null };
}
