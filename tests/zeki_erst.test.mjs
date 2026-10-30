// 6b R2 (Entwurf 28.10.2026): Zeki beim ersten Tipp – einmal je Punkt, nicht in der Stoßzeit, „wieder zeigen“ setzt zurück.
import { test } from "node:test";
import assert from "node:assert/strict";
import { erstSatz, erstGesehen, erstWiederZeigen } from "../js/screens/zeki_erst.js";
const speicher = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
test("erster Tipp: Satz, danach nicht mehr; Stoßzeit schweigt; „wieder zeigen“", () => {
  const sp = speicher();
  assert.ok(erstSatz("muell", { speicher: sp, stunde: 16 }));
  erstGesehen("muell", sp); assert.equal(erstSatz("muell", { speicher: sp, stunde: 16 }), null);
  assert.equal(erstSatz("kuehl", { speicher: sp, stunde: 12 }), null, "12 Uhr ist Stoßzeit (Standard 11:30–14:00)");
  assert.ok(erstSatz("kuehl", { speicher: sp, stunde: 15 }), "nach der Stoßzeit kommt er beim nächsten Tipp");
  erstWiederZeigen(sp); assert.ok(erstSatz("muell", { speicher: sp, stunde: 16 }));
  assert.equal(erstSatz("unbekannt", { speicher: sp, stunde: 16 }), null);
});
