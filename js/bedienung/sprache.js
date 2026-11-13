// Sprache: setzen (der Name des Beispiel-Ladens zieht mit) und die Sprache des Geräts als Vorschlag.
import { setzeSprache as setzeSpracheI18n, t, SPRACHEN } from "../i18n.js";
import { beispielNamenFolgen } from "../beispiel.js";
import { Z } from "../bedienung/zustand.js";
import { NICHT } from "./tabellen.js";
import { zeichne } from "./zeichnen.js";
import { speichern } from "./speichern.js";

// Sprache setzen und dabei den Namen des Beispiel-Ladens nachziehen (nicht erst beim Zeichnen).
export function setzeSprache(code, danach) {
  setzeSpracheI18n(code, () => { beispielNamenFolgen(Z.wurzel, t("beispiel.name")); if (danach) danach(); });
  beispielNamenFolgen(Z.wurzel, t("beispiel.name"));
}

export function spracheDesGeraets() {
  const code = (navigator.language || "de").slice(0, 2).toLowerCase();
  return SPRACHEN.includes(code) ? code : "de";
}

export const KLICK = {
  sprache: (el) => {
    if (Z.stand.phase !== "app") return NICHT;
    Z.wurzel.sprache = el.dataset.wert; setzeSprache(Z.wurzel.sprache, () => zeichne()); speichern(Z.wurzel); return zeichne();
  },
};
