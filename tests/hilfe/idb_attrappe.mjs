// Kleine IndexedDB-Attrappe für Node-Tests (npm install ist hier nicht möglich, fake-indexeddb fehlt).
// Kann genau das, was js/store.js braucht: open mit Upgrade, Transaktionen über mehrere Speicher (alles oder nichts),
// get/put/add/delete/clear/getAll/count. Werte werden wie im Browser per structuredClone kopiert.
// attrappe.scheitern = n lässt die nächsten n Schreib-Transaktionen fehlschlagen (nichts wird übernommen).

export function idbAttrappe() {
  const dbs = new Map(); // name → { version, stores: Map<name, {auto, n, daten: Map}> }
  const attrappe = { dbs, scheitern: 0, transaktionen: [], schreibvorgaenge: [] }; // schreibvorgaenge: [speicher, art, schlüssel] je übernommenem Schreiben

  class Anfrage { constructor() { this.result = undefined; this.error = null; this.onsuccess = null; this.onerror = null; } }
  globalThis.IDBRequest = Anfrage;

  function oeffnenDb(eintrag) {
    const db = {
      objectStoreNames: { contains: (n) => eintrag.stores.has(n) },
      createObjectStore(n, opt = {}) { eintrag.stores.set(n, { auto: !!opt.autoIncrement, n: 0, daten: new Map() }); },
      close() {},
      onversionchange: null,
      transaction(namen, modus = "readonly") {
        const liste = Array.isArray(namen) ? namen : [namen];
        for (const n of liste) if (!eintrag.stores.has(n)) throw new Error("NotFoundError: " + n);
        const ops = []; // Schreibvorgänge, erst beim Abschluss übernommen
        const t = { oncomplete: null, onerror: null, onabort: null, error: null, modus, namen: liste };
        attrappe.transaktionen.push(t);
        t.objectStore = (n) => {
          if (!liste.includes(n)) throw new Error("NotFoundError: " + n);
          const st = eintrag.stores.get(n);
          const anfrage = (wert) => { const r = new Anfrage(); r.result = wert; queueMicrotask(() => r.onsuccess && r.onsuccess({ target: r })); return r; };
          const schreib = (fn, art, k) => { if (modus !== "readwrite") throw new Error("ReadOnlyError"); ops.push(() => { fn(); attrappe.schreibvorgaenge.push([n, art, k]); }); };
          return {
            name: n,
            get: (k) => anfrage(st.daten.has(k) ? structuredClone(st.daten.get(k)) : undefined),
            getAll: () => anfrage([...st.daten.values()].map((v) => structuredClone(v))),
            getAllKeys: () => anfrage([...st.daten.keys()]),
            count: () => anfrage(st.daten.size),
            put: (v, k) => { const kopie = structuredClone(v); schreib(() => st.daten.set(k ?? ++st.n, kopie), "put", k); return anfrage(k); },
            add: (v, k) => { const kopie = structuredClone(v); schreib(() => st.daten.set(k ?? ++st.n, kopie), "add", k); return anfrage(k); },
            delete: (k) => { schreib(() => st.daten.delete(k), "delete", k); return anfrage(undefined); },
            clear: () => { schreib(() => st.daten.clear(), "clear", null); return anfrage(undefined); },
            openCursor: () => { throw new Error("openCursor nicht nachgebaut"); },
          };
        };
        setTimeout(() => {
          if (modus === "readwrite" && attrappe.scheitern > 0) {
            attrappe.scheitern -= 1; t.error = new Error("AbortError (Attrappe)");
            if (t.onerror) t.onerror({ target: t }); if (t.onabort) t.onabort({ target: t }); return;
          }
          for (const op of ops) op();
          if (t.oncomplete) t.oncomplete({ target: t });
        }, 0);
        return t;
      },
    };
    return db;
  }

  globalThis.indexedDB = {
    open(name, version = 1) {
      const r = new Anfrage(); r.onupgradeneeded = null; r.onblocked = null;
      setTimeout(() => {
        let e = dbs.get(name); if (!e) { e = { version: 0, stores: new Map() }; dbs.set(name, e); }
        const db = oeffnenDb(e); r.result = db;
        if (version > e.version) { e.version = version; if (r.onupgradeneeded) r.onupgradeneeded({ target: r }); }
        if (r.onsuccess) r.onsuccess({ target: r });
      }, 0);
      return r;
    },
  };
  // Inhalt eines Speichers direkt lesen/setzen (für Tests)
  attrappe.speicher = (db, n) => dbs.get(db)?.stores.get(n)?.daten;
  attrappe.anlegen = (name, version, stores) => { const e = { version, stores: new Map() }; for (const [n, auto] of stores) e.stores.set(n, { auto, n: 0, daten: new Map() }); dbs.set(name, e); return e; };
  return attrappe;
}
