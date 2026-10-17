// Bildliste (17.10.2026): App und tools/bildliste.mjs müssen denselben Bildnamen bilden, und ein Einzelbild geht dem Sammelbild vor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fotoSlug } from "../js/util.js";
const { FOTOS } = await import("../js/data/fotos.js");
const { wareBild } = await import("../js/screens/muell.js");
const { fotoName } = await import("../js/bilder.js"); // Trennung 2 (17.10.2026): Bildzuordnung im Rechenwerk

test("fotoSlug: Umlaute, ß, Türkisch, Sonderzeichen", () => {
  assert.equal(fotoSlug("Dönerspieß Kalb/Pute"), "doenerspiess-kalb-pute");
  assert.equal(fotoSlug("Ayran 0,25 l"), "ayran-0-25-l");
  assert.equal(fotoSlug("Çiğ Köfte"), "cig-koefte");
  assert.equal(fotoSlug("  Pide mit Käse & Ei "), "pide-mit-kaese-ei");
});

test("Einzelbild je Artikel und Gericht geht dem Sammelbild vor", () => {
  const art = { name: "Dönerspieß Kalb/Pute", gruppe: "fleisch" };
  assert.match(wareBild(art), /r-haehnchenspiess/); // heute: Sammelbild
  FOTOS.add("r-doenerspiess-kalb-pute"); FOTOS.add("g-dueruem-doener");
  try {
    assert.match(wareBild(art), /foto\/r-doenerspiess-kalb-pute\.webp/);
    assert.equal(fotoName({ name: "Dürüm Döner", rezeptFamilie: "duerum" }), "g-dueruem-doener");
    assert.match(wareBild({ name: "Dönertüte", gruppe: "verpackung" }), /v-doenertuete/);
  } finally { FOTOS.delete("r-doenerspiess-kalb-pute"); FOTOS.delete("g-dueruem-doener"); }
  assert.equal(fotoName({ name: "Dürüm Döner", rezeptFamilie: "duerum" }), "g-duerum");
});
