// Zeichenfläche (Canvas) des Browsers. Die Rechenmodule (Bilder verkleinern, Tafel, Belegauswertung) sprechen nur über diese Datei mit dem DOM.
// In Node (ohne document) gibt es keine Fläche: leinwandDa() ist dann false und die Aufrufer weichen aus.
export const leinwandDa = () => typeof document !== "undefined";
export function leinwand(breite, hoehe) {
  const c = document.createElement("canvas"); c.width = breite; c.height = hoehe; return c;
}
export const istLeinwand = (x) => typeof HTMLCanvasElement !== "undefined" && x instanceof HTMLCanvasElement;
