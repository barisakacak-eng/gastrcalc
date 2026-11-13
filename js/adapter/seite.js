// Die Seite selbst: Sprach- und Schreibrichtung des Dokuments, „Seite ist versteckt“, Ereignis an das Fenster, Speicherplatz des Browsers.
// Ohne document/window/navigator (Node) tun diese Funktionen nichts und liefern „nicht da“.
export function sprachAttribute(code, rtl) {
  if (typeof document !== "undefined") { document.documentElement.lang = code; document.documentElement.dir = rtl ? "rtl" : "ltr"; }
}
export const seiteVersteckt = () => typeof document !== "undefined" && document.visibilityState === "hidden";
export function fensterMelden(name, detail) {
  if (typeof window !== "undefined" && typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent(name, { detail }));
}
export const speicherApi = () => globalThis.navigator?.storage || null;
