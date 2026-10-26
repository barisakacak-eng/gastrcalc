import test from "node:test";
import assert from "node:assert/strict";
import { MENUE_GERICHTE, MENUE_QUELLE, MENUE_ARTIKEL, MENUE_FREIGEGEBEN } from "../js/data/burger_ergaenzung.js";
import { MENUE_VORLAGEN_ENTWURF, PRODUKT_INDEX, VORLAGEN as ALLE_VORLAGEN } from "../js/data/katalog.js";
const VORLAGEN = { finde: (n) => MENUE_VORLAGEN_ENTWURF.find((v) => v.name === n) || ALLE_VORLAGEN.burger.find((v) => v.name === n) }; // Zoro 26.10.2026: Menü-Vorlagen sind Entwurf, nicht im Wähler
import { gerichtAusVorlage } from "../js/karte_daten.js";
import { warenGericht } from "../js/engine.js";
import { fotoName, gerichtBildQuelle, wareBildQuelle } from "../js/bilder.js";
import { FOTOS } from "../js/data/fotos.js";
import { artikelAnzeige, ARTIKELNAMEN, GERICHTNAMEN } from "../js/data/artikelnamen.js";
import { existsSync } from "node:fs";

test("Menüreferenz: nur belegte Stückzahlen, keine erfundenen Grammwerte, Zeiten oder Preise", () => {
  assert.equal(MENUE_GERICHTE.length,28); // Zoro 26.10.2026: „Pommes frites“ und „Muffin“ doppelten bestehende Vorlagen
  assert.equal(MENUE_QUELLE.grammmengen,"offen");
  for(const g of MENUE_GERICHTE.filter(g=>!MENUE_FREIGEGEBEN[g.name])) { // freigegebene: eigener Test unten
    const v=VORLAGEN.finde(g.name);
    assert.ok(v,g.name); assert.equal(v.zeit,null,g.name);
    const gericht=gerichtAusVorlage({...v,bereich:g.bereich});
    assert.equal(gericht.preis,null,g.name);
    for(const z of gericht.zutaten) {
      assert.ok(PRODUKT_INDEX[z.name],`${g.name}: unbekannte Zutat ${z.name}`);
      if(z.einheit!=="stk") assert.equal(z.menge,null,`${g.name}: kein Grammwert aus einer Speisekarte`);
    }
  }
});
test("Menüreferenz: alle neuen Zutaten haben ein lokales Foto, Rinderspeck zeigt keinen Döner",()=>{
  for(const name of new Set([...MENUE_ARTIKEL.map(a=>a[0]),...MENUE_GERICHTE.flatMap(g=>g.zutaten.map(z=>z[0]))])) {
    const q=wareBildQuelle({name,gruppe:PRODUKT_INDEX[name].g});
    assert.ok(q.foto,`Foto fehlt: ${name}`);assert.ok(existsSync(new URL(`../foto/${q.foto}.webp`,import.meta.url)),`${name}: ${q.foto}`);
  }
  assert.equal(wareBildQuelle({name:"Rinderspeck",gruppe:"fleisch"}).foto,"r-rinderspeck");
  assert.equal(wareBildQuelle({name:"Rinderhack",gruppe:"fleisch"}).foto,"r-hack");
});
test("Menüreferenz: Nashville ohne Rind, Zwiebeln und erratene Standardzutaten",()=>{
  const n=MENUE_GERICHTE.find(g=>g.name==="Nashville Burger");
  assert.deepEqual(n.zutaten.map(z=>z[0]),["Burger-Bun","Chicken Tenders","Krautsalat","Burgersauce"]);
  const bacon=MENUE_GERICHTE.find(g=>g.name==="Bacon Cheeseburger");
  assert.ok(bacon.zutaten.some(z=>z[0]==="Rinderspeck"));
  assert.ok(!bacon.zutaten.some(z=>z[0]==="Bacon"),"kein stiller Wechsel auf Schweinespeck");
});
test("Menüreferenz: fehlende Mengen bleiben auch mit bekannten Einkaufspreisen unvollständig",()=>{
  for(const g of MENUE_GERICHTE.filter(g=>!MENUE_FREIGEGEBEN[g.name]&&g.zutaten.some(z=>z[1]===null))) {
    const gericht=gerichtAusVorlage({...VORLAGEN.finde(g.name),bereich:g.bereich});
    // Fiktive Testpreise machen aus fehlenden Mengen keine kostenlosen Zutaten.
    const index=Object.fromEntries(gericht.zutaten.map(z=>[z.name,{name:z.name,einheit:z.einheit,preis:1,preisBasis:"netto",packung:{menge:1000,einheit:z.einheit}}]));
    const k=warenGericht(gericht,index);
    assert.equal(k.vollstaendig,false,g.name);assert.ok(k.fehlt.length,g.name);
  }
});
test("Menüreferenz: individuelle Fotos gehen der pauschalen Cheeseburger-/Pommes-Regel vor",()=>{
  for(const g of MENUE_GERICHTE) {
    assert.ok(FOTOS.has(g.foto),g.name);
    assert.ok(existsSync(new URL(`../foto/${g.foto}.webp`,import.meta.url)),g.foto);
    assert.equal(fotoName({name:g.name}),g.foto,g.name);
    assert.deepEqual(gerichtBildQuelle({name:g.name,foto:"eigenes-bild"}),{eigen:"eigenes-bild",pikto:"g-teller"});
    for(const lang of ["tr","en"]) { assert.ok((ARTIKELNAMEN[g.name] || GERICHTNAMEN[g.name])?.[lang],`${g.name}: ${lang}`); assert.ok(artikelAnzeige(g.name,lang)); }
  }
});

test("Rinderpatty zeigt das Patty, Rinderhack das Hack, Dönerfleisch den Spieß (Zoro 26.10.2026)", () => {
  assert.equal(wareBildQuelle({ name: "Rinderpatty 150 g", gruppe: "fleisch" }).foto, "r-patty");
  assert.notEqual(wareBildQuelle({ name: "Rinder-Hackfleisch", gruppe: "fleisch" }).foto, "r-doenerspiess");
  assert.equal(wareBildQuelle({ name: "Dönerfleisch Kalb", gruppe: "fleisch" }).foto, "r-doenerspiess");
});

test("Go Burger 26.10.2026: Classic, Oklahoma, Super Smash im Wähler mit Grammwerten, Bacon und Chili bleiben Entwurf", () => {
  for (const n of ["Classic Smash Burger", "Oklahoma Smash Burger", "Super Smash Burger"]) {
    const v = ALLE_VORLAGEN.burger.find((x) => x.name === n);
    assert.ok(v, n); assert.ok(v.zeit > 0, n);
    for (const [name, menge] of v.zutaten) { assert.ok(menge > 0, `${n}: ${name}`); assert.ok(PRODUKT_INDEX[name], `${n}: ${name} fehlt im Katalog`); }
    assert.ok(!MENUE_VORLAGEN_ENTWURF.some((x) => x.name === n), n);
  }
  for (const n of ["Bacon Cheeseburger", "Chili Cheeseburger"]) assert.ok(MENUE_VORLAGEN_ENTWURF.some((x) => x.name === n), n);
});
