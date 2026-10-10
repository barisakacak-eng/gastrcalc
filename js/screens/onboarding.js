// Onboarding: eine Frage je Bildschirm, jeder Schritt wird sofort gespeichert,
// jeder Schritt lässt sich mit „weiß ich gerade nicht" offen lassen. Nichts blockiert.
import { t, SPRACHEN } from "../i18n.js";
import { esc, parseZahl, fmtEuro, uid, wertAnzeige } from "../util.js";
import { FORMATE, FORMAT_GRUPPEN, findeFormat } from "../data/formate.js";
import { KUECHEN } from "../data/kuechen.js";
import { KATEGORIEN, postenJeKategorie, istTypisch } from "../data/kosten.js";
import { fixkosten } from "../engine.js";
import { karte, rezepte, preise, verkauf, ergebnis } from "./karte.js";

// ---------- Bausteine ----------

const zahlfeld = ({ feld, wert, einheit, platzhalter = "0", klein = false, status = "" }) => `
  <div class="zahlfeld ${klein ? "klein" : ""} ${status}">
    <input inputmode="decimal" autocomplete="off" data-f="${feld}" value="${esc(wertAnzeige(wert))}" placeholder="${esc(platzhalter)}" aria-label="${esc(einheit)}">
    <span class="einheit">${esc(einheit)}</span>
  </div>`;

const stepper = (feld, wert, text) => `
  <div class="stepper" data-stepper="${feld}">
    <button type="button" data-a="minus" data-feld="${feld}" aria-label="−">−</button>
    <div class="wert">${esc(text)}</div>
    <button type="button" data-a="plus" data-feld="${feld}" aria-label="+">+</button>
  </div>`;

const knopfWeiter = (text = t("allgemein.weiter"), extra = "") => `<button type="button" class="knopf ${extra}" data-a="weiter">${esc(text)}</button>`;
const knopfOffen = (text = t("allgemein.weissNicht")) => `<button type="button" class="leise" data-a="offen">${esc(text)}</button>`;

// Kostenposten eines Betriebs holen oder anlegen
function postenEintrag(stand, postenId, kat) {
  let e = stand.kosten.find((k) => k.posten === postenId);
  if (!e) { e = { id: uid(), posten: postenId, kategorie: kat, betrag: null, status: "aus", periode: "monat" }; stand.kosten.push(e); }
  return e;
}

// ---------- Schritte ----------

const sprache = {
  id: "sprache",
  view: () => `
    <h1 class="frage">${esc(t("sprache.frage"))}</h1>
    <p class="hinweis">${esc(t("sprache.hinweis"))}</p>
    <div class="kacheln">
      ${SPRACHEN.map((s) => `<button type="button" class="kachel breit" data-a="sprache" data-wert="${s}"><b>${esc(t("sprache." + s))}</b></button>`).join("")}
    </div>`,
  fuss: () => "",
  aktion(name, el, stand, ctx) {
    if (name === "sprache") { ctx.setzeSprache(el.dataset.wert); ctx.weiter(); return true; }
  },
};

const format = {
  id: "format",
  view: (stand) => `
    <h1 class="frage">${esc(t("format.frage"))}</h1>
    <p class="hinweis">${esc(t("format.hinweis"))}</p>
    ${FORMAT_GRUPPEN.map((g) => `
      <div class="gruppe">${esc(t("format.gruppen." + g))}</div>
      <div class="kacheln">
        ${FORMATE.filter((f) => f.gruppe === g).map((f) => {
          const [name, hint] = t("format." + f.id);
          return `<button type="button" class="kachel ${stand.betrieb.format === f.id ? "an" : ""}" data-a="format" data-wert="${f.id}"><b>${esc(name)}</b><small>${esc(hint)}</small></button>`;
        }).join("")}
      </div>`).join("")}`,
  fuss: (stand) => stand.betrieb.format ? knopfWeiter() : "",
  aktion(name, el, stand, ctx) {
    if (name === "format") { stand.betrieb.format = el.dataset.wert; return true; }
  },
};

const kueche = {
  id: "kueche",
  view: (stand) => `
    <h1 class="frage">${esc(t("kueche.frage"))}</h1>
    <p class="hinweis">${esc(t("kueche.hinweis"))}</p>
    <div class="kacheln">
      ${KUECHEN.map((k) => `<button type="button" class="kachel ${stand.betrieb.kuechen.includes(k.id) ? "an" : ""}" data-a="kueche" data-wert="${k.id}"><b>${esc(t("kueche." + k.id))}</b></button>`).join("")}
    </div>`,
  fuss: (stand) => stand.betrieb.kuechen.length ? knopfWeiter() : "",
  aktion(name, el, stand) {
    if (name === "kueche") {
      const id = el.dataset.wert; const k = stand.betrieb.kuechen;
      const i = k.indexOf(id); if (i >= 0) k.splice(i, 1); else k.push(id);
      return true;
    }
  },
};

const betrieb = {
  id: "betrieb",
  view: (stand) => `
    <h1 class="frage">${esc(t("betrieb.frageName"))}</h1>
    <input class="textfeld gross" data-f="betrieb.name" maxlength="40" value="${esc(stand.betrieb.name)}" placeholder="${esc(t("betrieb.namePlatzhalter"))}" autocomplete="off">
    <div class="feldzeile"><label>${esc(t("betrieb.frageTage"))}</label>${stepper("tage", stand.betrieb.tageProWoche, t("betrieb.tage", stand.betrieb.tageProWoche))}</div>
    <div class="feldzeile"><label>${esc(t("betrieb.frageMonate"))}</label>${stepper("monate", stand.betrieb.monate, t("betrieb.monate", stand.betrieb.monate))}</div>
    ${stand.betrieb.monate < 12 ? `<p class="tipp">${esc(t("betrieb.monateHinweis"))}</p>` : ""}`,
  fuss: () => knopfWeiter(),
  eingabe(feld, wert, stand) { if (feld === "betrieb.name") stand.betrieb.name = wert; },
  aktion(name, el, stand) {
    if (name === "minus" || name === "plus") {
      const d = name === "plus" ? 1 : -1;
      if (el.dataset.feld === "tage") stand.betrieb.tageProWoche = Math.min(7, Math.max(1, stand.betrieb.tageProWoche + d));
      if (el.dataset.feld === "monate") stand.betrieb.monate = Math.min(12, Math.max(1, stand.betrieb.monate + d));
      return true;
    }
  },
};

const team = {
  id: "team",
  view: (stand) => `
    <h1 class="frage">${esc(t("team.fragePersonen"))}</h1>
    <p class="hinweis">${esc(t("team.personenHinweis"))}</p>
    ${zahlfeld({ feld: "team.personen", wert: stand.team.personen, einheit: t("allgemein.personen"), platzhalter: "" })}
    <div class="feldzeile" style="margin-top:8px">
      <label>${esc(t("team.frageStunden"))}</label>
      <p class="hinweis">${esc(t("team.stundenHinweis"))}</p>
      ${zahlfeld({ feld: "team.stundenProPerson", wert: stand.team.stundenProPerson, einheit: t("allgemein.stunden"), platzhalter: "", klein: true })}
    </div>`,
  fuss: () => knopfWeiter(),
  eingabe(feld, wert, stand) {
    if (feld === "team.personen") stand.team.personen = parseZahl(wert);
    if (feld === "team.stundenProPerson") stand.team.stundenProPerson = parseZahl(wert);
  },
};

const lohn = {
  id: "lohn",
  view: (stand) => `
    <h1 class="frage">${esc(t("team.frageLohn"))}</h1>
    <p class="hinweis">${esc(t("team.lohnHinweis"))}</p>
    ${zahlfeld({ feld: "team.lohnkosten", wert: stand.team.lohnkosten, einheit: `${t("allgemein.euro")} ${t("allgemein.proMonat")}`, platzhalter: "", status: stand.team.lohnkosten === null && stand.team.lohnOffen ? "offen" : "" })}
    <p class="tipp">${esc(t("team.lohnTipp"))}</p>`,
  fuss: () => knopfOffen() + knopfWeiter(),
  eingabe(feld, wert, stand) { if (feld === "team.lohnkosten") { stand.team.lohnkosten = parseZahl(wert); stand.team.lohnOffen = false; } },
  aktion(name, el, stand, ctx) { if (name === "offen") { stand.team.lohnkosten = null; stand.team.lohnOffen = true; ctx.weiter("uebersprungen"); return true; } },
};

const kostenIntro = {
  id: "kosten-intro",
  view: () => `
    <h1 class="frage">${esc(t("kosten.titel"))}</h1>
    <p class="hinweis">${esc(t("kosten.einleitung"))}</p>
    <div class="liste">
      ${KATEGORIEN.map((k, i) => `<div class="zeile" style="padding:10px 14px"><div class="oben"><span class="name">${i + 1}. ${esc(t("kosten.kategorien." + k)[0])}</span></div></div>`).join("")}
    </div>`,
  fuss: () => knopfWeiter(t("kosten.los"), "glut"),
};

function kostenSchritt(kat) {
  return {
    id: "kosten-" + kat,
    view(stand) {
      const f = findeFormat(stand.betrieb.format);
      const [titel, text] = t("kosten.kategorien." + kat);
      const posten = postenJeKategorie(kat).filter((p) => istTypisch(p, stand.betrieb.format));
      const fk = fixkosten(stand);
      return `
        <h1 class="frage">${esc(titel)}</h1>
        <p class="hinweis">${esc(text)}</p>
        <div class="liste">
          ${posten.map((p) => {
            const e = stand.kosten.find((k) => k.posten === p.id) || { status: "aus", betrag: null, periode: "monat" };
            const [name, hint] = t("kosten.posten." + p.id);
            const an = e.status !== "aus";
            const rw = p.rw(f);
            return `
              <div class="zeile ${an ? (e.status === "offen" ? "offen" : "an") : ""}">
                <div class="oben">
                  <div class="name">${esc(name)}${hint ? `<small>${esc(hint)}</small>` : ""}</div>
                  <button type="button" class="schalter ${an ? "an" : ""}" data-a="posten" data-posten="${p.id}" data-kat="${kat}" aria-pressed="${an}" aria-label="${esc(name)}"></button>
                </div>
                ${an ? `
                  <div class="betrag ${e.status}">
                    <input inputmode="decimal" autocomplete="off" data-f="posten:${p.id}" value="${esc(wertAnzeige(e.betrag))}" placeholder="${esc(t("kosten.betragFrage"))}" aria-label="${esc(name)}">
                    <span class="einheit">${esc(t("allgemein.euro"))}</span>
                    <div class="periode">
                      <button type="button" class="${e.periode === "monat" ? "an" : ""}" data-a="periode" data-posten="${p.id}" data-wert="monat">${esc(t("allgemein.proMonat"))}</button>
                      <button type="button" class="${e.periode === "jahr" ? "an" : ""}" data-a="periode" data-posten="${p.id}" data-wert="jahr">${esc(t("allgemein.proJahr"))}</button>
                    </div>
                  </div>
                  <div class="unterzeile">
                    ${e.status === "geschaetzt" ? `<span class="marke geschaetzt">${esc(t("kosten.richtwertHinweis", fmtEuro(rw)))}</span>`
                      : e.status === "offen" ? `<span class="marke offen">${esc(t("kosten.offenHinweis"))}</span>`
                      : `<span class="marke">${esc(t("allgemein.bekannt"))}</span>`}
                    ${e.status !== "offen" ? `<button type="button" class="leise" data-a="posten-offen" data-posten="${p.id}">${esc(t("allgemein.weissNicht"))}</button>` : ""}
                  </div>` : ""}
              </div>`;
          }).join("")}
        </div>
        <p class="hinweis">${esc(t("kosten.zwischenstand", fmtEuro(fk.gesamt)))}</p>`;
    },
    fuss(stand) {
      const aktiv = stand.kosten.some((k) => k.kategorie === kat && k.status !== "aus");
      return (aktiv ? "" : `<button type="button" class="knopf zweit" data-a="weiter">${esc(t("kosten.kategorieLeer"))}</button>`) + (aktiv ? knopfWeiter() : "");
    },
    eingabe(feld, wert, stand) {
      if (!feld.startsWith("posten:")) return;
      const e = postenEintrag(stand, feld.slice(7), kat);
      e.betrag = parseZahl(wert);
      e.status = e.betrag === null ? "offen" : "bekannt";
    },
    aktion(name, el, stand) {
      if (name === "posten") {
        const e = postenEintrag(stand, el.dataset.posten, kat);
        if (e.status !== "aus") { e.status = "aus"; e.betrag = null; }
        else {
          const p = postenJeKategorie(kat).find((x) => x.id === el.dataset.posten);
          const rw = p.rw(findeFormat(stand.betrieb.format));
          if (rw) { e.betrag = rw; e.status = "geschaetzt"; e.periode = "monat"; } else { e.betrag = null; e.status = "offen"; }
        }
        return true;
      }
      if (name === "periode") {
        const e = postenEintrag(stand, el.dataset.posten, kat);
        const neu = el.dataset.wert; if (e.periode === neu) return false;
        if (e.status === "geschaetzt" && e.betrag !== null) e.betrag = neu === "jahr" ? e.betrag * 12 : e.betrag / 12; // Richtwert mitnehmen
        e.periode = neu; return true;
      }
      if (name === "posten-offen") { const e = postenEintrag(stand, el.dataset.posten, kat); e.betrag = null; e.status = "offen"; return true; }
    },
    beimVerlassen(stand) { if (!stand.kostenKategorienGeprueft.includes(kat)) stand.kostenKategorienGeprueft.push(kat); },
  };
}

const kanaele = {
  id: "kanaele",
  view(stand) {
    const k = stand.kanaele;
    const chip = (key, an) => `<button type="button" class="chip ${an ? "an" : ""}" data-a="kanal" data-wert="${key}">${esc(t("kanaele." + key))}</button>`;
    return `
      <h1 class="frage">${esc(t("kanaele.frage"))}</h1>
      <p class="hinweis">${esc(t("kanaele.hinweis"))}</p>
      <div class="chips">${chip("vorOrt", k.vorOrt)}${chip("abholung", k.abholung)}${chip("eigeneLieferung", k.eigeneLieferung)}${chip("portale", k.portale.length > 0)}</div>
      ${k.portale.length ? `<div class="liste">${k.portale.map((p, i) => `
        <div class="zeile an">
          <div class="feldzeile"><label>${esc(t("kanaele.portalName"))}</label>
            <input class="textfeld" data-f="portal:${i}:name" value="${esc(p.name)}" placeholder="${esc(t("kanaele.portalPlatzhalter"))}" autocomplete="off"></div>
          <div class="feldzeile"><label>${esc(t("kanaele.portalProvision"))}</label>
            <div class="betrag"><input inputmode="decimal" data-f="portal:${i}:provision" value="${esc(wertAnzeige(p.provision))}" placeholder="" aria-label="%"><span class="einheit">%</span></div>
            ${Number(p.provision) >= 25 ? `<span class="marke offen">${esc(t("kanaele.provisionHoch"))}</span>` : ""}</div>
          <div class="feldzeile"><label>${esc(t("kanaele.portalBasis"))}</label>
            <div class="chips">
              ${["netto", "brutto", "unbekannt"].map((b) => `<button type="button" class="chip ${p.basis === b ? "an" : ""}" data-a="basis" data-i="${i}" data-wert="${b}">${esc(t("kanaele.basis" + b[0].toUpperCase() + b.slice(1)))}</button>`).join("")}
            </div>
            ${p.basis === "unbekannt" ? `<span class="marke">${esc(t("kanaele.basisHinweis"))}</span>` : ""}</div>
          <button type="button" class="leise" data-a="portal-weg" data-i="${i}">${esc(t("allgemein.loeschen"))}</button>
        </div>`).join("")}
        <button type="button" class="knopf weich" data-a="portal-neu">${esc(t("kanaele.portalHinzu"))}</button></div>` : ""}`;
  },
  fuss: () => knopfWeiter(),
  eingabe(feld, wert, stand) {
    const m = feld.match(/^portal:(\d+):(\w+)$/); if (!m) return;
    const p = stand.kanaele.portale[Number(m[1])]; if (!p) return;
    if (m[2] === "name") p.name = wert;
    if (m[2] === "provision") p.provision = parseZahl(wert);
  },
  aktion(name, el, stand) {
    const k = stand.kanaele;
    if (name === "kanal") {
      const w = el.dataset.wert;
      if (w === "portale") { if (k.portale.length) k.portale = []; else k.portale.push({ id: uid(), name: "", provision: null, basis: "unbekannt" }); }
      else k[w] = !k[w];
      return true;
    }
    if (name === "portal-neu") { k.portale.push({ id: uid(), name: "", provision: null, basis: "unbekannt" }); return true; }
    if (name === "portal-weg") { k.portale.splice(Number(el.dataset.i), 1); return true; }
    if (name === "basis") { const p = k.portale[Number(el.dataset.i)]; if (p) p.basis = el.dataset.wert; return true; }
  },
};

export const SCHRITTE = [sprache, format, kueche, betrieb, team, lohn, kostenIntro, ...KATEGORIEN.map(kostenSchritt), kanaele, karte, rezepte, preise, verkauf, ergebnis];
export const schrittIndex = (id) => SCHRITTE.findIndex((s) => s.id === id);
