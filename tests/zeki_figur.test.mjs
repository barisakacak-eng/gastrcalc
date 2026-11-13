// Salbei & Papier: Zeki neu – Zuordnung Bühne/Folgen gleich den JSON-Dateien, Deckung von Bild und Folge, Regeln aus Übergabe Abschnitt 4, Abspieler mit Fake-Element.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as Z from "../js/zeki_figur.js";
import { SCHRITTE, SCHNELL } from "../js/screens/onboarding.js";
const W = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (p) => JSON.parse(fs.readFileSync(path.join(W, p), "utf8"));
const zuordnung = json("assets/brand/zeki-buehne/zuordnung.json"), ablauf = json("assets/brand/zeki/ablauf.json"), gelenke = json("assets/brand/zeki-gelenke.json");
function webpMasse(p) { // Breite und Höhe aus dem Kopf einer WebP-Datei (VP8, VP8L, VP8X)
  const b = fs.readFileSync(path.join(W, p)); assert.equal(b.toString("ascii", 0, 4), "RIFF", p); const art = b.toString("ascii", 12, 16);
  if (art === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (art === "VP8L") { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

test("Bühnen-Bilder: eingebettete Konstante = zuordnung.json, jede Datei existiert, Maße 512 × 354", () => {
  assert.equal(zuordnung.length, 24); assert.equal(Z.BUEHNEN_SCHLUESSEL.length, 24);
  for (const e of zuordnung) {
    assert.deepEqual(Z.buehnenBild(e.ansicht), { datei: e.datei, haltung: e.haltung, miene: e.miene }, e.ansicht);
    assert.ok(fs.existsSync(path.join(W, e.datei)), e.datei);
    assert.deepEqual(e.masse, Z.BUEHNE_MASSE); assert.equal(e.schnitt_y, Z.SCHNITT_Y);
    assert.deepEqual(webpMasse(e.datei), Z.BUEHNE_MASSE, e.datei);
  }
  assert.equal(Z.buehnenBild("gibt-es-nicht"), null);
  assert.equal(Z.buehnenBild("constructor"), null);
});

test("Folgen: eingebettete Konstante = ablauf.json, Raster 5 × 5, Datei der kleinen Fassung da, Maße 1280 × 1590", () => {
  assert.equal(ablauf.length, 25); assert.deepEqual(Z.FOLGEN_NAMEN.sort(), ablauf.map((e) => e.name).sort());
  for (const e of ablauf) {
    const f = Z.folge(e.name);
    assert.deepEqual(f, { datei: `assets/brand/zeki-klein/${e.name}.webp`, bilder: 25, spalten: 5, zeilen: 5, dauerMs: e.dauer_ms, schleife: e.schleife, beginntInRuhe: e.beginnt_in_ruhe, endetInRuhe: e.endet_in_ruhe }, e.name);
    assert.deepEqual(e.raster, [5, 5]); assert.equal(e.bilder, 25); assert.deepEqual(e.zelle_klein, Z.ZELLE_KLEIN); assert.deepEqual(e.registrierung_viewBox, Z.FILMFENSTER);
    assert.equal(Z.ZEKI_FOLGEN[e.name].miene, e.miene);
    assert.deepEqual(webpMasse(f.datei), [5 * Z.ZELLE_KLEIN[0], 5 * Z.ZELLE_KLEIN[1]], f.datei);
  }
  assert.equal(Z.folge("gibt-es-nicht"), null);
  assert.deepEqual(gelenke.filmfenster, Z.FILMFENSTER); assert.equal(gelenke.buehne_schnitt_y, Z.SCHNITT_Y);
  assert.deepEqual(ablauf.filter((e) => e.schleife).map((e) => e.name), ["warten"], "nur der Leerlauf ist eine Schleife");
  assert.deepEqual(ablauf.filter((e) => !e.beginnt_in_ruhe).map((e) => e.name), ["auftreten"]); assert.deepEqual(ablauf.filter((e) => !e.endet_in_ruhe).map((e) => e.name), ["abgehen"]);
});

test("Mienen: zwölf Zustände, Datei da, unbekannt → neutral", () => {
  assert.equal(Z.MIENEN.length, 12); assert.deepEqual(gelenke.mienen.filter((m) => !Z.MIENEN.includes(m)), []);
  for (const m of Z.MIENEN) { const d = Z.mienenBild(m); assert.ok(fs.existsSync(path.join(W, d)), d); }
  assert.equal(Z.mienenBild("blabla"), "assets/brand/zeki-mienen/zeki-neutral.webp"); assert.equal(Z.mienenBild(undefined), Z.mienenBild("neutral"));
  assert.ok(!Z.MIENEN.includes("zwinkern"), "Zwinkern ist keine Miene");
});

test("Deckung: gleiche Figur-Koordinate → gleiche Bildschirm-Position in Bild und Folge (< 1 px bei 116 px Breite, alle 25 Bilder)", () => {
  const a = Z.ausschnitt(116);
  assert.equal(a.zelleB, 116); assert.ok(Math.abs(a.zelleH - 144.09375) < 1e-9); assert.ok(Math.abs(a.hoehe - 80.203125) < 1e-9);
  // Zelle 256 × 318 und Filmfenster 420 × 521,71875 haben dasselbe Seitenverhältnis (Rundung unter 0,001 px)
  assert.ok(Math.abs(Z.ZELLE_KLEIN[0] / Z.FILMFENSTER[2] - Z.ZELLE_KLEIN[1] / Z.FILMFENSTER[3]) * 116 < 0.001);
  const punkte = [[-80, -45], [118.5, 150], [57, 181], [180, 181], [91.5, 88], [145.5, 88], [118.5, 109], [237, 245], [0, 8], [340, 100], [118.5, 245]];
  let groesste = 0;
  for (const [fx, fy] of punkte) {
    const b = Z.bildPunkt(fx, fy, 116);
    for (let i = 0; i < 25; i++) {
      const f = Z.folgePunkt(fx, fy, 116, i), [px, py] = a.position(i), vor = Z.folgePunkt(fx, fy, 116, 0);
      // Position im Fenster: Raster-Punkt plus background-position; Bild i und Bild 0 liegen deckungsgleich übereinander
      groesste = Math.max(groesste, Math.abs(f[0] - b[0]), Math.abs(f[1] - b[1]), Math.abs(f[0] - vor[0]), Math.abs(f[1] - vor[1]));
      assert.ok(px <= 0 && py <= 0);
    }
  }
  assert.ok(groesste < 1, "größte Abweichung " + groesste);
  // untere Bühnenkante: Figur-Koordinate 245 liegt auf der Unterkante des Bühnen-Bildes (354 von 354 Pixeln, hier 80,2 px) – Abweichung < 1 px
  assert.ok(Math.abs(Z.bildPunkt(0, Z.SCHNITT_Y, 116)[1] - a.hoehe) < 1);
  assert.ok(Math.abs(Z.folgePunkt(0, Z.SCHNITT_Y, 116, 0)[1] - a.hoehe) < 1);
  // auch bei anderen Breiten
  for (const breite of [100, 116, 140, 200]) for (const [fx, fy] of punkte) { const b = Z.bildPunkt(fx, fy, breite), f = Z.folgePunkt(fx, fy, breite, 7); assert.ok(Math.abs(b[0] - f[0]) < 1 && Math.abs(b[1] - f[1]) < 1, `Breite ${breite}`); }
  assert.equal(a.position(0).join(), "0,0"); assert.equal(a.position(4)[0], -4 * 116); assert.ok(a.position(5)[0] === 0); assert.ok(Math.abs(a.position(24)[1] + 4 * a.zelleH) < 1e-9);
});

test("Regeln: Leerlauf nie zwinkern, zwinkern nur bei Lob, Warnung nie grinsen oder jubeln", () => {
  assert.equal(Z.LEERLAUF_FOLGE, "warten"); assert.ok(Z.leerlaufErlaubt("warten")); assert.ok(!Z.leerlaufErlaubt("zwinkern")); assert.ok(!Z.leerlaufErlaubt("grinsen"));
  assert.equal(Z.leerlaufAbstand(() => 0), 6000); assert.equal(Z.leerlaufAbstand(() => 1), 14000); assert.ok(Z.leerlaufAbstand(() => 0.5) > 6000 && Z.leerlaufAbstand(() => 0.5) < 14000);
  const alle = ["erfolg", "lob", "tagGeschafft", "warnung", "fehler", "unsinn", "", undefined, ...Object.values(Z.ZEKI_BUEHNE).map((b) => "ankommen:" + b.haltung), ...Z.FOLGEN_NAMEN.map((n) => "ankommen:" + n)];
  for (const e of alle) if (e !== "lob") assert.notEqual(Z.folgeFuer(e), "zwinkern", String(e));
  assert.equal(Z.folgeFuer("lob"), "zwinkern"); assert.equal(Z.folgeFuer("tagGeschafft"), "jubeln"); assert.equal(Z.folgeFuer("erfolg"), "nicken");
  for (const e of ["warnung", "fehler"]) { const n = Z.folgeFuer(e); assert.ok(["kopfschuetteln", "pruefen"].includes(n), e); assert.ok(!Z.NIE_BEI_WARNUNG.includes(n)); }
  assert.equal(Z.folgeFuer("ankommen:warten"), null, "Haltung warten: keine Ankunftsbewegung"); assert.equal(Z.folgeFuer("ankommen:hand"), "hand"); assert.equal(Z.folgeFuer("ankommen:schreiben"), "schreiben");
  for (const b of Object.values(Z.ZEKI_BUEHNE)) {
    assert.ok(!["zwinkern", "grinsen"].includes(b.haltung), "ruhendes Bild ohne Zwinkern/Grinsen: " + b.datei);
    if (["warnung", "fehler"].includes(b.miene)) assert.ok(!Z.NIE_BEI_WARNUNG.includes(b.haltung), "Warn-Miene nie mit Jubel: " + b.datei);
  }
  assert.ok(!Z.ZEKI_FOLGEN.kopfschuetteln.schleife && Z.ZEKI_FOLGEN.kopfschuetteln.miene === "warnung");
});

const APP_ANSICHTEN = ["start", "muell", "kuehl", "putzplan", "karte", "kartebuero", "umsatz", "umsatzheute", "listen", "laeden", "beleg", "abschluss", "kartefoto", "vergleich", "preisrunde", "ware", "portion", "inventur", "verkauf", "bestand", "aktionen", "tafel", "hinweise", "geld3", "getraenke", "lieferanten", "kuehlware", "personal", "ordner-amt", "ordner-steuer", "ordner-buch", "buero", "einstellungen"];
test("Ansichten: jede App-Ansicht und jeder Einrichtungs-Schritt hat ein Bühnen-Bild und eine der zwölf Bauarten (oder Tafel II)", () => {
  for (const a of APP_ANSICHTEN) { const k = Z.buehnenSchluessel(a, { stunde: 12 }); assert.ok(Z.buehnenBild(k), a); assert.ok(Object.hasOwn(Z.ZEKI_ANSICHT, a), "ohne Eintrag: " + a); }
  const ids = new Set([...SCHRITTE, ...SCHNELL].map((s) => s.id));
  for (const id of ids) assert.ok(Object.hasOwn(Z.ZEKI_ANSICHT, "einrichtung:" + id), "Einrichtungsschritt ohne Bild: " + id);
  for (const [k, s] of Object.entries(Z.ZEKI_ANSICHT)) { assert.ok(Z.buehnenBild(s), k + " → " + s); const b = Z.ZEKI_BAUART[k]; assert.ok(b === "II" || (Number.isInteger(b) && b >= 1 && b <= 12), k); }
  for (let b = 1; b <= 12; b++) assert.ok(Object.values(Z.ZEKI_BAUART).includes(b), "Bauart ohne Ansicht: " + b);
  for (const k of ["intro", "fuehrung", "menue-blatt", "blatt", "sperre"]) assert.ok(Z.buehnenBild(Z.buehnenSchluessel(k)), k);
  // Unterzustände
  assert.equal(Z.buehnenSchluessel("muell", { schritt: "eingabe" }), "zahl-eingeben"); assert.equal(Z.buehnenSchluessel("muell"), "foto-auswahl");
  assert.equal(Z.buehnenSchluessel("einrichtung", { schritt: "format" }), "laden"); assert.equal(Z.buehnenSchluessel("einrichtung", { schritt: "ergebnis" }), "fertig");
  assert.equal(Z.buehnenSchluessel("abschluss", { schritt: "bilanz" }), "geschafft"); assert.equal(Z.buehnenSchluessel("kuehl", { schritt: "rundgang" }), "rundgang");
  assert.equal(Z.buehnenSchluessel("gibt-es-nicht"), "intro", "unbekannt: ruhige Haltung statt keine Figur");
});

test("Start: Bild nach Tageszeit (Berliner Zeit): vor 11 Uhr morgen, ab 18 Uhr abend, dazwischen mittendrin", () => {
  const e = (h) => Z.buehnenSchluessel("start", { stunde: h });
  assert.equal(e(0), "heute-morgen"); assert.equal(e(10), "heute-morgen"); assert.equal(e(11), "heute-mittendrin"); assert.equal(e(17), "heute-mittendrin"); assert.equal(e(18), "heute-abend"); assert.equal(e(23), "heute-abend");
  assert.equal(Z.buehnenSchluessel("start", {}), "start"); assert.equal(Z.buehnenSchluessel("start"), "start");
  assert.equal(Z.berlinStunde(new Date("2026-11-12T08:30:00Z")), 9); assert.equal(Z.berlinStunde(new Date("2026-07-12T08:30:00Z")), 10);
});

test("docs/aussehen.md: Tabelle nennt jede Ansicht mit Bauart und Bühnen-Bild wie das Modul", () => {
  const doc = fs.readFileSync(path.join(W, "docs", "aussehen.md"), "utf8");
  for (const z of Z.ANSICHT_TABELLE) assert.ok(doc.includes(`| \`${z.ansicht}\` | ${z.bauart} | \`${z.buehne}\` |`), "Zeile fehlt: " + z.ansicht);
});

test("figurHtml: genau ein Bild, leeres alt, feste Maße, Behälter gc-figur, keine Blase", () => {
  const h = Z.figurHtml({ schluessel: "start" });
  assert.equal((h.match(/<img /g) || []).length, 1); assert.match(h, /alt=""/); assert.match(h, /width="116" height="80"/); assert.match(h, /class="gc-zeki"/);
  assert.match(h, /^<div class="gc-figur" data-zeki-buehne="start">/); assert.doesNotMatch(h, /blase/i); assert.match(h, /src="assets\/brand\/zeki-buehne\/start\.webp"/);
  assert.match(Z.figurHtml({ schluessel: "kosten", rtl: true }), /data-gespiegelt="1"/); assert.doesNotMatch(h, /gespiegelt|dir=/);
  assert.match(Z.figurHtml({ schluessel: "\"><script>" }), /data-zeki-buehne="intro"/, "unbekannter Schlüssel: kein Einschleusen, ruhige Haltung");
  assert.match(Z.figurHtml(), /data-zeki-buehne="intro"/);
});

// ---------- Abspieler mit Fake-Element und Fake-Uhr ----------
function bauen({ verbunden = true } = {}) {
  const kinder = []; const bild = { style: {}, getAttribute: (n) => (n === "width" ? "116" : null) };
  const win = { matchMedia: () => ({ matches: false }) };
  const doc = { defaultView: win, createElement: () => ({ style: {}, className: "", setAttribute() {} }) };
  const el = { isConnected: verbunden, ownerDocument: doc, appendChild: (k) => kinder.push(k), querySelector: (s) => (s === "img.gc-zeki" ? bild : s === ".gc-zeki-folge" ? kinder.find((k) => k.className === "gc-zeki-folge") || null : null) };
  const uhr = { t: 0, rafs: new Map(), timers: new Map(), n: 0, geladen: [], gesehen: [] };
  const opt = (extra = {}) => ({ raf: (f) => { uhr.rafs.set(++uhr.n, f); return uhr.n; }, caf: (id) => uhr.rafs.delete(id), jetzt: () => uhr.t, setTimeout: (f, ms) => { uhr.timers.set(++uhr.n, { an: uhr.t + ms, f }); return uhr.n; }, clearTimeout: (id) => uhr.timers.delete(id),
    zufall: () => 0, laden: async (d) => { uhr.geladen.push(d); return true; }, ...extra });
  const tick = async (ms, schritt = 16) => { for (let g = 0; g < ms; g += schritt) { uhr.t += schritt; for (const [id, x] of [...uhr.timers]) if (x.an <= uhr.t) { uhr.timers.delete(id); x.f(); } await new Promise((r) => setImmediate(r)); const fs = [...uhr.rafs]; uhr.rafs.clear(); for (const [, f] of fs) f(uhr.t); const o = kinder[0]; if (o) uhr.gesehen.push(o.style.backgroundImage + "|" + o.style.backgroundPosition + "|" + o.style.display + "|" + (bild.style.visibility || "sichtbar")); } };
  return { el, bild, kinder, uhr, opt, tick };
}
const frames = (g) => g.uhr.gesehen.filter((s) => s.split("|")[2] === "block").map((s) => s.split("|")[1]);

test("Abspieler: eine Folge einmal, 25 Bilder in Reihenfolge, danach wieder das ruhende Bild", async () => {
  const g = bauen(); const h = Z.zekiSpielen(g.el, "nicken", g.opt()); assert.ok(h);
  await g.tick(1500); assert.equal(await h.fertig, "ende");
  const pos = [...new Set(frames(g))]; const a = Z.ausschnitt(116);
  assert.equal(pos.length, 25, "alle 25 Bilder gezeigt");
  assert.deepEqual(pos, Array.from({ length: 25 }, (_, i) => a.position(i).map((v) => v + "px").join(" ")));
  assert.equal(g.kinder.length, 1, "ein Überzug, nicht mehrere"); const o = g.kinder[0];
  assert.match(o.style.backgroundImage, /zeki-klein\/nicken\.webp/); assert.equal(o.style.backgroundSize, `${5 * 116}px ${5 * a.zelleH}px`); assert.equal(o.style.width, "116px"); assert.ok(Math.abs(parseFloat(o.style.height) - a.hoehe) < 1e-9);
  assert.equal(o.style.display, "none"); assert.equal(g.bild.style.visibility, ""); assert.equal(g.uhr.rafs.size, 0, "kein Lauf übrig");
  assert.ok(g.uhr.gesehen.some((s) => s.endsWith("|block|hidden")), "Ruhebild liegt unter der Folge nicht doppelt sichtbar");
});

test("Abspieler: Bewegung reduzieren → nichts bewegt sich; unbekannte Folge → null", async () => {
  const g = bauen(); assert.equal(Z.zekiSpielen(g.el, "nicken", g.opt({ reduziert: true })), null); assert.equal(Z.zekiSpielen(g.el, "warten", g.opt({ reduziert: true })), null);
  await g.tick(200); assert.equal(g.kinder.length, 0); assert.equal(g.uhr.rafs.size + g.uhr.timers.size, 0); assert.notEqual(g.bild.style.visibility, "hidden");
  assert.equal(Z.zekiSpielen(g.el, "gibt-es-nicht", g.opt()), null);
  const g2 = bauen(); g2.el.ownerDocument.defaultView.matchMedia = () => ({ matches: true }); assert.equal(Z.zekiSpielen(g2.el, "hand", g2.opt()), null, "prefers-reduced-motion aus matchMedia");
});

test("Abspieler: Element nicht mehr im Dokument → Abbruch, keine weitere Arbeit", async () => {
  const g = bauen(); const h = Z.zekiSpielen(g.el, "schreiben", g.opt()); await g.tick(300); g.el.isConnected = false; await g.tick(50);
  assert.equal(await h.fertig, "abbruch"); assert.equal(g.uhr.rafs.size, 0);
  const g2 = bauen(); const h2 = Z.zekiSpielen(g2.el, "warten", g2.opt()); g2.el.isConnected = false; await g2.tick(7000); assert.equal(await h2.fertig, "abbruch"); assert.equal(g2.uhr.timers.size, 0);
  const g3 = bauen({ verbunden: false }); const h3 = Z.zekiSpielen(g3.el, "hand", g3.opt()); await g3.tick(100); assert.equal(await h3.fertig, "abbruch"); assert.equal(g3.kinder.length, 0);
});

test("Abspieler: nur eine Folge gleichzeitig je Element – die zweite wartet, höchstens eine wartet", async () => {
  const g = bauen(); const a = Z.zekiSpielen(g.el, "nicken", g.opt()), b = Z.zekiSpielen(g.el, "preis", g.opt()), c = Z.zekiSpielen(g.el, "daumen", g.opt());
  await g.tick(100); assert.ok(g.uhr.rafs.size <= 1); assert.match(g.kinder[0].style.backgroundImage, /nicken/);
  assert.equal(await b.fertig, "ersetzt", "die mittlere wurde von der neueren verdrängt");
  await g.tick(1300); assert.equal(await a.fertig, "ende"); await g.tick(1400); assert.equal(await c.fertig, "ende");
  assert.ok(g.uhr.geladen.includes("assets/brand/zeki-klein/daumen.webp")); assert.ok(!g.uhr.geladen.includes("assets/brand/zeki-klein/preis.webp"));
  assert.equal(g.kinder.length, 1); assert.equal(g.uhr.rafs.size, 0);
});

test("Leerlauf: warten nach 6–14 s, unregelmäßig, nie zwinkern; Bewegung unterbricht ihn, danach geht er weiter", async () => {
  const g = bauen(); let z = 0; const folge = [0, 1, 0.5, 0.25]; const h = Z.zekiSpielen(g.el, "warten", g.opt({ zufall: () => folge[z++ % 4] }));
  await g.tick(5900); assert.equal(g.kinder.length, 0, "vor 6 s nichts");
  await g.tick(200); assert.equal(g.kinder.length, 1); assert.match(g.kinder[0].style.backgroundImage, /warten\.webp/);
  await g.tick(4300); assert.equal(g.kinder[0].style.display, "none", "nach 4,2 s wieder Ruhe");
  await g.tick(60000);
  assert.ok(g.uhr.gesehen.every((s) => !s.includes("zwinkern") && !s.includes("grinsen")), "im Leerlauf nie zwinkern");
  const starts = g.uhr.gesehen.filter((s, i, a) => s.includes("|block|") && (i === 0 || !a[i - 1].includes("|block|"))).length; assert.ok(starts >= 4 && starts <= 12, "Wiederholungen: " + starts);
  assert.equal(Z.zekiSpielen(g.el, "warten", g.opt()).fertig, h.fertig, "zweiter Aufruf startet keinen zweiten Leerlauf");
  const m = Z.zekiSpielen(g.el, "zwinkern", g.opt()); await g.tick(1000); assert.equal(await m.fertig, "ende");
  assert.equal(await h.fertig, "ersetzt"); await g.tick(30000); assert.ok(g.uhr.gesehen.some((s) => s.includes("warten")), "Leerlauf setzt sich fort");
  g.el.isConnected = false; await g.tick(20000); assert.equal(g.uhr.rafs.size + g.uhr.timers.size, 0);
});

test("Abspieler: abgehen lässt die Bühne leer, auftreten holt Zeki zurück; fehlende Folge → Zeki bleibt stehen", async () => {
  const g = bauen(); const h = Z.zekiSpielen(g.el, "abgehen", g.opt()); await g.tick(2600); assert.equal(await h.fertig, "ende"); assert.equal(g.bild.style.visibility, "hidden"); assert.equal(g.kinder[0].style.display, "none");
  const h2 = Z.zekiSpielen(g.el, "auftreten", g.opt()); await g.tick(2600); assert.equal(await h2.fertig, "ende"); assert.equal(g.bild.style.visibility, "");
  const g3 = bauen(); const h3 = Z.zekiSpielen(g3.el, "hand", g3.opt({ laden: async () => false })); await g3.tick(100); assert.equal(await h3.fertig, "fehlt"); assert.equal(g3.kinder.length, 0); assert.notEqual(g3.bild.style.visibility, "hidden");
});

test("Abspieler: abbrechen() mittendrin zeigt sofort wieder das ruhende Bild", async () => {
  const g = bauen(); const h = Z.zekiSpielen(g.el, "jubeln", g.opt()); await g.tick(400); assert.equal(g.bild.style.visibility, "hidden"); h.abbrechen(); assert.equal(await h.fertig, "abbruch");
  assert.equal(g.bild.style.visibility, ""); assert.equal(g.kinder[0].style.display, "none"); assert.equal(g.uhr.rafs.size, 0);
});

test("Halte-Bild: Bühnen-Bild = gehaltene Pose der Folge; Konstante = haltebild.json, jede Haltung der Bühne hat ein Bild", () => {
  const j = json("assets/brand/zeki-buehne/haltebild.json"); assert.deepEqual({ ...Z.HALTEBILD }, j);
  for (const b of Object.values(Z.ZEKI_BUEHNE)) { assert.ok(Object.hasOwn(Z.HALTEBILD, b.haltung), b.haltung); assert.ok(Z.HALTEBILD[b.haltung] >= 0 && Z.HALTEBILD[b.haltung] < 25); assert.ok(Z.folge(b.haltung)); }
  assert.equal(Z.HALTEBILD.warten, 0, "Ruhe = Bild 0");
});

function bauenMitBuehne(schluessel) { const g = bauen(); const k = schluessel; g.el.getAttribute = (n) => (n === "data-zeki-buehne" ? k : null); return g; }
test("Ankommen: Folge der Haltung von der Ruhe bis zur Pose, dann das Bühnen-Bild; nur wenn geladen; reduziert → nichts", async () => {
  const g = bauenMitBuehne("start"); // Haltung hand, Pose = Bild 9
  assert.equal(Z.zekiEreignis(g.el, "ankommen:hand", g.opt({ laden: async (d) => { g.uhr.geladen.push(d); return true; } })), null, "noch nicht geladen: Bild bleibt, Folge wird vorgeladen");
  assert.notEqual(g.bild.style.visibility, "hidden"); await g.tick(50); assert.ok(g.uhr.geladen.includes("assets/brand/zeki-klein/hand.webp")); assert.ok(Z.folgeBereit("hand"));
  const h = Z.zekiEreignis(g.el, "ankommen:hand", g.opt()); assert.ok(h); assert.equal(g.bild.style.visibility, "hidden", "Bild sofort versteckt, kein Aufblitzen der Pose");
  await g.tick(1500); assert.equal(await h.fertig, "ende");
  const a = Z.ausschnitt(116), pos = [...new Set(frames(g))]; assert.deepEqual(pos, Array.from({ length: 10 }, (_, i) => a.position(i).map((v) => v + "px").join(" ")), "Bild 0 bis 9");
  assert.equal(g.bild.style.visibility, ""); assert.equal(g.kinder[0].style.display, "none");
  assert.equal(Z.zekiEreignis(g.el, "ankommen:warten", g.opt()), null); assert.equal(Z.zekiEreignis(g.el, "ankommen:hand", g.opt({ reduziert: true })), null);
});

test("Ereignis über gehaltener Pose: zurück in die Ruhe, Bewegung, wieder in die Pose – ohne Lücke und ohne Sprung; Lob = zwinkern", async () => {
  const g = bauenMitBuehne("start"); const h = Z.zekiEreignis(g.el, "lob", g.opt()); assert.ok(h);
  await g.tick(4000); assert.equal(await h.fertig, "ende");
  const s = g.uhr.gesehen.filter((x) => x.split("|")[2] === "block"); const dateien = [...new Set(s.map((x) => x.split("|")[0].replace(/.*klein\/|\.webp.*/g, "")))];
  assert.deepEqual(dateien, ["hand", "zwinkern"], "hand rückwärts, zwinkern, hand vorwärts");
  const a = Z.ausschnitt(116); const erstes = s[0].split("|")[1], letztes = s[s.length - 1].split("|")[1];
  assert.equal(erstes, a.position(9).map((v) => v + "px").join(" "), "beginnt in der Pose (= Bühnen-Bild)"); assert.equal(letztes, a.position(9).map((v) => v + "px").join(" "), "endet in der Pose");
  const anzeige = g.uhr.gesehen.map((x) => x.split("|")[2]).join(""); assert.match(anzeige, /^(block)+(none)+$/, "zwischen den Teilen kein Zurück auf das Bühnen-Bild, nur am Ende");
  assert.equal(g.bild.style.visibility, ""); assert.equal(g.uhr.rafs.size, 0);
  // Ruhehaltung (warten): einfach die Bewegung
  const r = bauenMitBuehne("buero"); const h2 = Z.zekiEreignis(r.el, "erfolg", r.opt()); await r.tick(1500); assert.equal(await h2.fertig, "ende"); assert.deepEqual([...new Set(frames(r))].length, 25);
});

test("Leerlauf nur in der Ruhe-Haltung: über einer gehaltenen Pose bleibt Zeki stehen (sonst Sprung bei jedem Atemzug)", async () => {
  const pose = bauenMitBuehne("start"); assert.equal(Z.zekiSpielen(pose.el, "warten", pose.opt()), null);
  const ruheg = bauenMitBuehne("intro"); const h = Z.zekiSpielen(ruheg.el, "warten", ruheg.opt()); assert.ok(h); ruheg.el.isConnected = false; await ruheg.tick(7000); assert.equal(await h.fertig, "abbruch");
});
