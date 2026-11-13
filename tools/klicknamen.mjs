// Sammelt alle data-a-Namen, die die Bedienschicht (js/app.js und js/bedienung/) behandelt, und die in js/screens/*Aktion-Funktionen.
// Gezählt wird, was gegen den Namen verglichen wird (name === "x", case "x", name.startsWith("x"), Regeln, Listen mit includes(name))
// und jeder Schlüssel einer Klick-Tabelle (export const KLICK = { "name": … }). Aufruf: node tools/klicknamen.mjs [Ausgabedatei.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Braucht den Parser „acorn“ (liegt als tools/vendor/acorn.mjs bei, MIT-Lizenz); er gehört nicht zur App und wird nur von diesem Werkzeug gebraucht.
const acorn = await import("./vendor/acorn.mjs");

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lesen = (f) => fs.readFileSync(path.join(WURZEL, f), "utf8");

function kinder(n) {
  const out = [];
  for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) out.push(...v.filter((x) => x && typeof x.type === "string")); else if (v && typeof v.type === "string") out.push(v); }
  return out;
}
function geh(n, f, eltern = []) { f(n, eltern); for (const c of kinder(n)) geh(c, f, [...eltern, n]); }
const istName = (n, namen) => n && n.type === "Identifier" && namen.has(n.name);
const lit = (n) => (n && n.type === "Literal" && typeof n.value === "string" ? n.value : null);

// namen: Bezeichner, die den data-a-Namen tragen (name, n, a …)
export function namenAusQuelle(src, namen = new Set(["name"]), { tabellen = true } = {}) {
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  const aus = new Set(); const mengen = new Map();
  geh(ast, (n) => { // Konstanten-Mengen: const X = new Set([...]) und const X = [...]
    if (n.type === "VariableDeclarator" && n.id.type === "Identifier") {
      const w = n.init?.type === "NewExpression" && n.init.callee.name === "Set" ? n.init.arguments[0] : n.init;
      if (w?.type === "ArrayExpression" && w.elements.every((e) => lit(e) !== null)) mengen.set(n.id.name, w.elements.map(lit));
    }
  });
  geh(ast, (n, eltern) => {
    if (n.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(n.operator)) {
      if (istName(n.left, namen) && lit(n.right) !== null) aus.add(lit(n.right));
      if (istName(n.right, namen) && lit(n.left) !== null) aus.add(lit(n.left));
    }
    if (n.type === "SwitchCase" && lit(n.test) !== null && eltern.at(-1)?.discriminant && istName(eltern.at(-1).discriminant, namen)) aus.add(lit(n.test));
    if (n.type === "CallExpression" && n.callee.type === "MemberExpression") {
      const m = n.callee.property.name;
      if (m === "startsWith" && istName(n.callee.object, namen) && lit(n.arguments[0]) !== null) aus.add("^" + lit(n.arguments[0]));
      if ((m === "includes" || m === "has") && istName(n.arguments[0], namen)) {
        const o = n.callee.object;
        if (o.type === "ArrayExpression") o.elements.forEach((e) => lit(e) !== null && aus.add(lit(e)));
        else if (o.type === "Identifier" && mengen.has(o.name)) mengen.get(o.name).forEach((x) => aus.add(x));
      }
      if (m === "test" && n.callee.object.regex && istName(n.arguments[0], namen)) aus.add("re:" + n.callee.object.regex.pattern);
    }
    if (tabellen && n.type === "VariableDeclarator" && n.id.type === "Identifier" && /^KLICK/.test(n.id.name) && n.init?.type === "ObjectExpression")
      for (const p of n.init.properties) { const k = p.key.type === "Literal" ? String(p.key.value) : p.key.name; if (k) aus.add(k); }
  });
  return [...aus];
}

const gehDatei = (d) => (fs.existsSync(path.join(WURZEL, d)) ? fs.readdirSync(path.join(WURZEL, d)).filter((f) => f.endsWith(".js")).map((f) => d + "/" + f) : []);
export function klickNamen() {
  const app = new Set();
  for (const f of ["js/app.js", ...gehDatei("js/bedienung")]) for (const x of namenAusQuelle(lesen(f))) app.add(x);
  const screens = new Set();
  for (const f of gehDatei("js/screens")) for (const x of namenAusQuelle(lesen(f), new Set(["name", "n", "a"]), { tabellen: false })) screens.add(x);
  return { app: [...app].sort(), screens: [...screens].sort() };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const k = klickNamen(); const alle = new Set([...k.app, ...k.screens]);
  console.log(`Bedienschicht: ${k.app.length} Namen, Bildschirme: ${k.screens.length} Namen, zusammen ${alle.size}`);
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(k, null, 1));
}
