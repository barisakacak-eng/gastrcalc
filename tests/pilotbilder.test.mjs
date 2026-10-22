import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fotoName, wareBildQuelle } from "../js/bilder.js";
import { FOTOS } from "../js/data/fotos.js";

test("Pilotbild: Döner im Brot darf nicht als Dürüm dargestellt sein", () => {
  assert.equal(fotoName({ name: "Döner Kebab", rezeptFamilie: "doener" }), "g-doener");
  assert.equal(fotoName({ name: "Döner Teller", rezeptFamilie: "doener-teller" }), "g-doener-teller");
});
test("Pilotbild: Burger-Rohware zeigt eine ehrliche, eindeutige Bildquelle", () => {
  const ware = (name) => wareBildQuelle({ name, gruppe: "ware" });
  assert.deepEqual(ware("Cheddar"), { foto: "r-cheddar" });
  assert.deepEqual(ware("Burgersoße"), { foto: "r-burgersauce" });
  assert.deepEqual(ware("Burger Sauce"), { foto: "r-burgersauce" });
  assert.deepEqual(ware("Pickles"), { foto: "r-pickles" });
  assert.deepEqual(ware("Gewürzgurken"), { foto: "r-pickles" });
  assert.deepEqual(ware("Burgerbrötchen"), { foto: "r-burger-bun" });
  assert.deepEqual(ware("Vollkorn Burger Bun"), { foto: "r-vollkorn-bun" });
  assert.deepEqual(ware("Eisbergsalat"), { foto: "r-eisbergsalat" });
});
test("Pilotbild: jedes neue Pilotfoto und Piktogramm existiert lokal", () => {
  const fotos = ["r-burger-bun","r-vollkorn-bun","r-eisbergsalat","r-salatgurke","r-pide-brot","r-patty","r-cheddar","r-burgersauce","r-pickles","r-fladenbrot","g-doener","g-doener-teller","g-burger","g-cheeseburger","g-double-smash-burger","g-burger-menue"];
  for(const name of fotos) {
    assert.ok(FOTOS.has(name), `nicht im Fotokatalog: ${name}`);
    assert.ok(existsSync(new URL(`../foto/${name}.webp`,import.meta.url)), `fehlende Fotodatei: ${name}`);
  }
  for(const name of ["r-pickles", "r-cheddar", "r-sauce"]) {
    const p = new URL(`../bilder/${name}.svg`,import.meta.url);
    assert.ok(existsSync(p), `fehlendes SVG: ${name}`);
    assert.match(readFileSync(p,"utf8"), /viewBox="0 0 64 64"/);
  }
});

test("Pilotbild: Smash-Burger-Gerichte bekommen die tatsächlich freigegebenen Einzelmotive", () => {
  assert.equal(fotoName({name:"Smash Burger",rezeptFamilie:"burger"}),"g-burger");
  assert.equal(fotoName({name:"Cheeseburger",rezeptFamilie:"burger"}),"g-cheeseburger");
  assert.equal(fotoName({name:"Doppel Smash Burger",rezeptFamilie:"burger"}),"g-double-smash-burger");
  assert.equal(fotoName({name:"Double Smash Burger",rezeptFamilie:"burger"}),"g-double-smash-burger");
  assert.equal(fotoName({name:"Burger Menü",rezeptFamilie:"burger"}),"g-burger-menue");
});
