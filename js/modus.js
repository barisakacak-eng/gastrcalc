// Ebenen-Schnittstelle (gehört Entwickler A) – Stub-Fassung laut Bauvertrag, wird beim Zusammenführen durch A ersetzt.
export const MODI = ["laden", "personal", "buero"];
export function modus(wurzel) { return wurzel?.modus || "laden"; }
export function modusSetzen(wurzel, m) { if (wurzel && MODI.includes(m)) wurzel.modus = m; return modus(wurzel); }
