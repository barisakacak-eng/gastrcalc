// Ebenen-Schnittstelle (Bauvertrag 15.10.2026) – Stub-Fassung, gehört Entwickler A und wird beim Zusammenführen ersetzt.
export const MODI = ["laden", "personal", "buero"];
export function modus(wurzel) { return wurzel?.modus || "laden"; }
export function modusSetzen(wurzel, m) { if (wurzel && MODI.includes(m)) wurzel.modus = m; return modus(wurzel); }
