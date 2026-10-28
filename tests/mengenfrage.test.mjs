// Mengenfrage (Baris 28.10.2026): in den Döner kommt Fleisch, nicht der Spieß; Frage grammatisch für Gramm, Milliliter und Stück.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mengenName } from "../js/data/artikelnamen.js";
import de from "../js/lang/de.js";
import tr from "../js/lang/tr.js";
import en from "../js/lang/en.js";

test("Wort für das, was in die Portion kommt", () => {
  assert.equal(mengenName("Dönerspieß Kalb/Pute", "de"), "Dönerfleisch");
  assert.equal(mengenName("Dönerspieß Kalb/Pute", "tr"), "döner eti");
  assert.equal(mengenName("Dönerspieß Kalb/Pute", "en"), "döner meat");
  assert.equal(mengenName("Pizzatomaten (Dose)", "de"), "Pizzatomaten");
  assert.equal(mengenName("Tomaten", "en"), "tomatoes");
  assert.equal(mengenName("BBQ-Sauce", "en").startsWith("BBQ"), true);
});

test("Frage je Einheit", () => {
  assert.equal(de.waage.frage("Dönerfleisch", "Döner Kebab", "g"), "Wie viel Gramm Dönerfleisch kommen in „Döner Kebab“?");
  assert.equal(de.waage.frage("Dönerbrot", "Döner Kebab", "stk"), "Wie viele Stück Dönerbrot kommen in „Döner Kebab“?");
  assert.equal(tr.waage.frage("döner eti", "Döner kebap", "g"), "“Döner kebap” içine kaç gram döner eti giriyor?");
  assert.equal(en.waage.frage("döner meat", "Döner kebab", "g"), "How many grams of döner meat go into “Döner kebab”?");
});
