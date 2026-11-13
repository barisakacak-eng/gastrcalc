// Die Bühne nach dem Zeichnen einrichten (Salbei & Papier, Tafel I): Der Titelbereich der Ansicht (.kopfband, .kl-kopf, .h-kopf, .personalkopf) und Zekis Satz
// (.zeki-zeile, .kl-zeki) wandern aus dem Inhalt in den Innenbereich der Bühne, neben Zeki. Elemente werden VERSCHOBEN (nicht kopiert), Klassen und data-Namen bleiben.
// Idempotent (ein zweiter Aufruf ändert nichts) und wirft nie: geht etwas schief, bleibt die Ansicht, wie sie ist. Nur Anzeige, keine Rechen- oder Speicherlogik.
const TITEL = ".kopfband, .kl-kopf, .h-kopf, .personalkopf";
const SATZ = ".zeki-zeile, .kl-zeki";
const DRAUSSEN = ".gc-buehne, .zeki-stimme, .karte, details, .blatt, .blatthinten, [role=dialog], .druckkopf";
const frei = (el) => !el.classList.contains("druckkopf") && !el.parentElement?.closest(DRAUSSEN);
const erstes = (root, sel) => [...root.querySelectorAll(sel)].find(frei) || null;

// Rückgabe: { buehne, titel, satz } – was in diesem Aufruf in die Bühne gewandert ist (beim zweiten Aufruf: nichts)
export function buehneEinrichten(root) {
  let hatBuehne = false, hatTitel = false, hatSatz = false;
  try {
    const buehne = root?.querySelector?.(".gc-buehne"); const innen = buehne?.querySelector(".gc-buehne-innen");
    if (buehne && innen) {
      hatBuehne = true;
      const doc = root.ownerDocument;
      let text = innen.querySelector(".gc-buehne-text");
      const titel = erstes(root, TITEL), satz = erstes(root, SATZ);
      if (!text && (titel || satz)) { text = doc.createElement("div"); text.setAttribute("class", "gc-buehne-text"); innen.insertBefore(text, innen.firstChild); }
      if (titel) { text.append(titel); hatTitel = true; }
      if (satz) { text.append(satz); hatSatz = true; buehne.classList.add("spricht"); if (satz.classList.contains("a-rot")) buehne.classList.add("spricht-ernst"); }
      if (text?.childElementCount) buehne.classList.remove("gc-buehne-niedrig"); else buehne.classList.add("gc-buehne-niedrig");
      // Kein doppelter Titel: steht dieselbe Überschrift schon in der Kopfzeile, bleibt dort nur der Platz (die Mitte bleibt mittig)
      const kopftitel = buehne.querySelector(".gc-kopf .kopftitel"), h1 = text?.querySelector("h1");
      if (kopftitel && h1 && kopftitel.textContent.trim() && kopftitel.textContent.trim() === h1.textContent.trim()) kopftitel.classList.add("gc-doppelt");
    }
  } catch { /* die Ansicht bleibt, wie sie ist */ }
  return { buehne: hatBuehne, titel: hatTitel, satz: hatSatz };
}
