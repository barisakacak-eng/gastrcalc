// Onboarding: eine Frage je Bildschirm, jeder Schritt wird sofort gespeichert,
// jeder Schritt lässt sich mit „weiß ich gerade nicht" offen lassen. Nichts blockiert.
import { selbstGewaehlt, selbstAnwenden } from "../selbst.js";
import { kachelnFuer } from "../data/zwischen.js";
import { ladenArtVon } from "../profil.js";
import { einrichtungStand } from "../einrichtung.js";
import { ring } from "./home.js";
import { FOTOS } from "../data/fotos.js";
import { t, SPRACHEN } from "../i18n.js";
import { esc, parseZahl, fmtEuro, uid, wertAnzeige } from "../util.js";
import { FORMATE, FORMAT_GRUPPEN, findeFormat } from "../data/formate.js";
import { KUECHEN } from "../data/kuechen.js";
import { KATEGORIEN, postenJeKategorie, istTypisch, basisStandard } from "../data/kosten.js";
import { fixkosten, EIGENER_LOHN_RICHTWERT, eigenerLohnJeMonat, grenzenVon } from "../engine.js";
import { heute } from "../util.js";
import { karte, rezepte, preise, verkauf, ergebnis } from "./karte.js";
import { karteFotoView, kartePruefenView, kartePruefenEingabe, kartePruefenAktion, karteUebernehmen, karteFussKnopf, karteZeigtPruefliste } from "./foto.js";
import { monatsLast } from "../engine.js";

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
  if (!e) { e = { id: uid(), posten: postenId, kategorie: kat, betrag: null, status: "aus", periode: "monat", basis: basisStandard(postenId) }; stand.kosten.push(e); }
  return e;
}

// ---------- Schritte ----------

const sprache = {
  id: "sprache",
  view: () => `
    ${FOTOS.has("hero-doenergrill") ? `<img class="titelbild" src="foto/hero-doenergrill.webp" alt="">` : ""}
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
    <div class="feldzeile abstand-o">
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
    <p class="tipp">${esc(t("team.lohnTipp"))}</p>
    <div class="feldzeile abstand-o">
      <label>${esc(t("team.frageEigen"))}</label>
      <p class="hinweis">${esc(t("team.eigenHinweis"))}</p>
      ${(() => { const e = eigenerLohnJeMonat(stand.team); return zahlfeld({ feld: "team.eigenerLohn", wert: e.status === "eigen" ? stand.team.eigenerLohn : null, einheit: `${t("allgemein.euro")} ${t("allgemein.proMonat")}`, platzhalter: e.status === "offen" ? "" : String(EIGENER_LOHN_RICHTWERT), klein: true, status: e.status === "geschaetzt" ? "geschaetzt" : e.status === "offen" ? "offen" : "" }); })()}
      <span class="marke ${stand.team.eigenerLohnStatus === "offen" ? "offen" : "geschaetzt"}">${esc(stand.team.eigenerLohnStatus === "offen" ? t("allgemein.offen") : stand.team.eigenerLohnStatus === "eigen" ? t("allgemein.bekannt") : t("team.eigenRichtwert", fmtEuro(EIGENER_LOHN_RICHTWERT)))}</span>
      ${stand.team.eigenerLohnStatus === "offen" ? "" : `<button type="button" class="leise" data-a="eigen-offen">${esc(t("team.eigenOffen"))}</button>`}
    </div>`,
  fuss: () => knopfOffen() + knopfWeiter(),
  eingabe(feld, wert, stand) {
    if (feld === "team.lohnkosten") { stand.team.lohnkosten = parseZahl(wert); stand.team.lohnOffen = false; }
    if (feld === "team.eigenerLohn") { const n = parseZahl(wert); stand.team.eigenerLohn = n; stand.team.eigenerLohnStatus = n === null ? "geschaetzt" : "eigen"; }
  },
  aktion(name, el, stand, ctx) {
    if (name === "offen") { stand.team.lohnkosten = null; stand.team.lohnOffen = true; ctx.weiter("uebersprungen"); return true; }
    if (name === "eigen-offen") { stand.team.eigenerLohn = null; stand.team.eigenerLohnStatus = "offen"; return true; }
  },
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
                  <div class="seg klein"><button type="button" class="${(e.basis || basisStandard(p.id)) === "brutto" ? "an" : ""}" data-a="basis-posten" data-posten="${p.id}" data-wert="brutto">${esc(t("gebinde.brutto"))}</button><button type="button" class="${(e.basis || basisStandard(p.id)) === "netto" ? "an" : ""}" data-a="basis-posten" data-posten="${p.id}" data-wert="netto">${esc(t("gebinde.netto"))}</button></div>
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
      if (name === "basis-posten") { const e = postenEintrag(stand, el.dataset.posten, kat); e.basis = el.dataset.wert === "brutto" ? "brutto" : "netto"; return true; }
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

// Etappe 5 (Baris 12.10.): Kühlstellen direkt im Onboarding – wie viele, Namen, Art. Keine Grenzen: Standard nach Gesetz gilt, eigene später unter Mehr.
const kuehlstellen = {
  id: "kuehlstellen",
  view(stand) {
    const stellen = stand.kuehlstellen.filter((k) => !k.archiviert).sort((a, b) => a.reihe - b.reihe);
    const grenze = (k) => { const g = grenzenVon(k); return [typeof g.min === "number" ? `≥ ${g.min} °C` : "", typeof g.max === "number" ? `≤ ${g.max} °C` : ""].filter(Boolean).join(" · ") + (g.standard ? ` · ${t("kuehl.standard")}` : ""); };
    return `
      <h1 class="frage">${esc(t("kuehl.obFrage"))}</h1>
      <p class="hinweis">${esc(t("kuehl.obHinweis"))}</p>
      ${stepper("stellen", stellen.length, String(stellen.length))}
      <div class="liste">${stellen.map((k) => `
        <div class="zeile an">
          <input class="textfeld" data-f="ob-stelle:${esc(k.id)}" value="${esc(k.name)}" maxlength="40" placeholder="${esc(t("kuehl.namePlatzhalter"))}" autocomplete="off">
          <div class="unterzeile"><div class="seg klein">${["kuehl", "tk", "warm"].map((a) => `<button type="button" class="${k.art === a ? "an" : ""}" data-a="ob-art" data-id="${esc(k.id)}" data-wert="${a}">${esc(t("kuehl.artKurz." + a))}</button>`).join("")}</div>
          <span class="marke">${esc(grenze(k))}</span></div>
        </div>`).join("")}</div>
      ${stellen.length ? `<p class="tipp">${esc(t("kuehl.grenzeStandard"))}</p>` : ""}`;
  },
  fuss(stand) { return stand.kuehlstellen.some((k) => !k.archiviert) ? knopfWeiter() : `<button type="button" class="knopf zweit" data-a="weiter">${esc(t("kuehl.obKeine"))}</button>`; },
  eingabe(feld, wert, stand) { if (feld.startsWith("ob-stelle:")) { const k = stand.kuehlstellen.find((x) => x.id === feld.slice(10)); if (k) k.name = wert.slice(0, 40); } },
  aktion(name, el, stand) {
    const aktiv = () => stand.kuehlstellen.filter((k) => !k.archiviert).sort((a, b) => a.reihe - b.reihe);
    if (name === "plus" && el.dataset.feld === "stellen") {
      const n = aktiv().length; if (n >= 20) return false;
      const art = n === 0 ? "kuehl" : n === 1 ? "tk" : "kuehl"; const nK = aktiv().filter((k) => k.art === "kuehl").length;
      const nameNeu = art === "tk" ? t("kuehl.obNameTk") : t("kuehl.obName", nK + 1);
      if (!stand.kuehl.seit) stand.kuehl.seit = heute();
      stand.kuehlstellen.push({ id: uid(), name: nameNeu, art, min: null, max: null, reihe: stand.kuehlstellen.length, archiviert: false }); return true;
    }
    if (name === "minus" && el.dataset.feld === "stellen") { const l = aktiv(); const k = l[l.length - 1]; if (!k) return false; if (stand.messungen.some((m) => m.stelle === k.id)) k.archiviert = true; else stand.kuehlstellen = stand.kuehlstellen.filter((x) => x.id !== k.id); return true; }
    if (name === "ob-art") { const k = stand.kuehlstellen.find((x) => x.id === el.dataset.id); if (!k) return false; k.art = el.dataset.wert; k.min = null; k.max = null; if (k.art === "tk" && /^Kühlschrank|^Fridge|^Buzdolabı/.test(k.name)) k.name = t("kuehl.obNameTk"); if (k.art === "warm" && /^Kühlschrank|^Fridge|^Buzdolabı|^Tiefkühler|^Freezer|^Derin/.test(k.name)) k.name = t("kuehl.obNameWarm"); return true; }
  },
  beimVerlassen(stand) { stand.kuehl.eingerichtet = stand.kuehlstellen.some((k) => !k.archiviert); },
};

export const SCHRITTE = [sprache, format, kueche, betrieb, team, lohn, kostenIntro, ...KATEGORIEN.map(kostenSchritt), kanaele, kuehlstellen, karte, rezepte, preise, verkauf, ergebnis];
export const schrittIndex = (id) => SCHRITTE.findIndex((s) => s.id === id);

// ---------- Schnellstart (Etappe 6a, Baris 14.10.2026): Foto zuerst, in etwa zehn Minuten ----------
// Sprache → Laden (Name, Art, Tage) → Speisekarte fotografieren und prüfen → vier Kostenfragen → fertig.
// Alles andere (Rezepte verfeinern, Einkaufspreise, Kühlstellen) später in der App oder über Rechnungsfotos.

export const LADEN_ARTEN = [ // Reihenfolge wie im Zielbild (15.10.): Döner, Pizza, Asia, Foodtruck, Bäckerei, Kiosk – dann die übrigen
  { id: "doener", format: "imbiss", kuechen: ["doener"] }, { id: "pizza", format: "imbiss", kuechen: ["pizza"] },
  { id: "asia", format: "imbiss", kuechen: ["asiatisch"] }, { id: "foodtruck", format: "foodtruck", kuechen: ["burger"] },
  { id: "baeckerei", format: "baeckerei", kuechen: ["fruehstueck"] }, { id: "kiosk", format: "imbiss", kuechen: ["burger"] },
  { id: "imbiss", format: "imbiss", kuechen: ["burger"] }, { id: "cafe", format: "cafe", kuechen: ["bistro"] },
  { id: "anders", format: "eigen", kuechen: ["eigene"] },
];

// Foto je Laden-Art (foto/laden-*.webp, sobald Sanjis Bildpaket da ist), sonst Sanjis Piktogramm
const LADEN_PIKTO = { imbiss: "laden-burger", kiosk: "laden-anders" };
const LADEN_FOTO = { imbiss: ["laden-imbiss", "laden-kiosk"], cafe: ["laden-cafe", "laden-baeckerei"] }; // erst eigenes Foto, sonst das ähnlichste Ladenbild
const ladenBild = (id) => { const f = [...(LADEN_FOTO[id] || []), "laden-" + id].find((n) => FOTOS.has(n));
  return f ? `<img class="kachelfoto" src="foto/${f}.webp" alt="" aria-hidden="true">` : `<img class="kachelfoto pikto" src="bilder/${LADEN_PIKTO[id] || "laden-" + id}.svg" alt="" aria-hidden="true">`; };
const ladenSchnell = {
  id: "laden-schnell",
  view: (stand) => `
    <h1 class="frage">${esc(t("schnell.ladenArtFrage"))}</h1>
    <p class="hinweis">${esc(t("schnell.ladenArtHinweis"))}</p>
    <div class="kacheln fotokacheln">${LADEN_ARTEN.map((a) => `<button type="button" class="kachel fotokachel ${stand.ladenArt === a.id ? "an" : ""}" aria-pressed="${stand.ladenArt === a.id}" data-a="laden-art" data-wert="${a.id}">${ladenBild(a.id)}<b>${esc(t("schnell.arten." + a.id))}</b></button>`).join("")}</div>
    <div class="feldzeile"><label>${esc(t("schnell.ladenName"))}</label><input class="textfeld" data-f="betrieb.name" maxlength="40" value="${esc(stand.betrieb.name)}" placeholder="${esc(t("betrieb.namePlatzhalter"))}" autocomplete="off"></div>
    <div class="feldzeile"><label>${esc(t("betrieb.frageTage"))}</label>${stepper("tage", stand.betrieb.tageProWoche, t("betrieb.tage", stand.betrieb.tageProWoche))}</div>
    <button type="button" class="leise" data-a="weg-genau">${esc(t("schnell.genau"))}</button>`,
  fuss: (stand) => stand.ladenArt ? knopfWeiter() : "",
  eingabe(feld, wert, stand) { if (feld === "betrieb.name") stand.betrieb.name = wert; },
  aktion(name, el, stand) {
    if (name === "laden-art") { const a = LADEN_ARTEN.find((x) => x.id === el.dataset.wert); if (!a) return false; stand.ladenArt = a.id; stand.betrieb.format = a.format; stand.betrieb.kuechen = [...a.kuechen]; return true; }
    if ((name === "minus" || name === "plus") && el.dataset.feld === "tage") { stand.betrieb.tageProWoche = Math.min(7, Math.max(1, stand.betrieb.tageProWoche + (name === "plus" ? 1 : -1))); return true; }
    if (name === "weg-genau") { stand.weg = "genau"; stand.schritt = schrittIndex("format"); return true; }
  },
};

// Punkt 2 (Baris 14.10., 18:13): „Was macht ihr selbst?" – ein Tipp pro Kachel, typische sind je Laden-Art schon angetippt.
// Keine Mengen hier: die selbst gemachten Teile bekommen sofort Start-Rezepte (gelb, geschätzt), anpassen später.
const selbstSchnell = {
  id: "selbst",
  view: (stand) => {
    const an = new Set(selbstGewaehlt(stand));
    return `
    <h1 class="frage">${esc(t("schnell.selbstFrage"))}</h1>
    <p class="hinweis">${esc(t("schnell.selbstHinweis"))}</p>
    <div class="kacheln">${kachelnFuer(ladenArtVon(stand)).map((k) => `<button type="button" class="kachel ${an.has(k.id) ? "an" : ""}" aria-pressed="${an.has(k.id)}" data-a="selbst" data-wert="${k.id}"><img class="bildplatz klein" src="bilder/selbst-${k.id}.svg" alt="" aria-hidden="true"><b>${esc(t("schnell.selbstKacheln." + k.id))}</b></button>`).join("")}</div>
    <p class="hinweis">${esc(t("schnell.selbstRest"))}</p>`;
  },
  fuss: () => knopfWeiter(),
  aktion(name, el, stand) {
    if (name !== "selbst") return false;
    const an = new Set(selbstGewaehlt(stand)); const id = el.dataset.wert;
    if (an.has(id)) an.delete(id); else an.add(id);
    stand.selbst = [...an]; return true;
  },
  beimVerlassen(stand) { selbstAnwenden(stand); },
};

const karteSchnell = {
  id: "karte-foto",
  view: (stand) => (karteZeigtPruefliste() ? kartePruefenView(stand) : karteFotoView(stand)),
  fuss: () => karteFussKnopf(`<button type="button" class="knopf zweit" data-a="weiter">${esc(t("foto.ohneKarte"))}</button>`),
  eingabe: (feld, wert) => kartePruefenEingabe(feld, wert),
  aktion(name, el, stand, ctx) {
    if (name === "fv-uebernehmen") { stand.schnellErgebnis = karteUebernehmen(stand); ctx.weiter(); return true; }
    return kartePruefenAktion(name, el);
  },
};

const KS_POSTEN = { miete: "miete", energie: "strom" };
const kostenSchnell = {
  id: "kosten-schnell",
  view(stand) {
    const f = findeFormat(stand.betrieb.format);
    const wert = (posten) => stand.kosten.find((k) => k.posten === posten && k.status === "bekannt")?.betrag ?? null;
    const zeile = (feld, label, hint, w, rw) => `<div class="feldzeile"><label>${esc(label)}</label>${hint ? `<p class="hinweis">${esc(hint)}</p>` : ""}${zahlfeld({ feld, wert: w, einheit: `${t("allgemein.euro")} ${t("allgemein.proMonat")}`, platzhalter: rw ? String(rw) : "", klein: true })}</div>`;
    const eigen = stand.team.eigenerLohnStatus === "eigen" ? stand.team.eigenerLohn : null;
    return `
      <h1 class="frage">${esc(t("schnell.kostenFrage"))}</h1>
      <p class="hinweis">${esc(t("schnell.kostenHinweis"))}</p>
      ${zeile("ks:miete", t("schnell.miete"), t("schnell.mieteHinweis"), wert("miete"), f?.rw.miete)}
      ${zeile("ks:personal", t("schnell.personal"), t("schnell.personalHinweis"), stand.team.lohnkosten, null)}
      ${zeile("ks:eigen", t("schnell.eigen"), t("schnell.eigenHinweis", fmtEuro(EIGENER_LOHN_RICHTWERT)), eigen, EIGENER_LOHN_RICHTWERT)}
      ${zeile("ks:energie", t("schnell.energie"), t("schnell.energieHinweis"), wert("strom"), null)}
      <p class="tipp">${esc(t("schnell.kostenFoto"))}</p>`;
  },
  fuss: () => knopfWeiter(),
  eingabe(feld, wert, stand) {
    const m = feld.match(/^ks:(\w+)$/); if (!m) return;
    const n = parseZahl(wert);
    if (m[1] === "personal") { stand.team.lohnkosten = n; return; }
    if (m[1] === "eigen") { stand.team.eigenerLohn = n; stand.team.eigenerLohnStatus = n === null ? "geschaetzt" : "eigen"; return; }
    const posten = KS_POSTEN[m[1]]; if (!posten) return;
    const e = postenEintrag(stand, posten, posten === "miete" ? "miete" : "energie");
    e.betrag = n; e.status = n === null ? "aus" : "bekannt"; e.periode = "monat";
    if (posten === "strom") { e.sammel = "strom-gas"; e.basis = "brutto"; }
  },
};

const fertigSchnell = {
  id: "fertig-schnell",
  view(stand) {
    const r = stand.schnellErgebnis || { neu: stand.gerichte.length, artikel: stand.artikel.length, ohneRezept: 0 };
    const last = monatsLast(stand);
    return `
      <h1 class="frage">${esc(t(stand.gerichte.length ? "schnell.fertigFrage" : "schnell.fertigOhneKarte"))}</h1>
      <div class="liste">
        <div class="summenzeile"><span>${esc(t("schnell.gerichte"))}</span><span class="wert">${stand.gerichte.length}</span></div>
        <div class="summenzeile"><span>${esc(t("schnell.inventur"))}</span><span class="wert">${stand.artikel.length}</span></div>
        <div class="summenzeile"><span>${esc(t("schnell.kostenMonat"))}</span><span class="wert">${fmtEuro(last.gesamt)}</span></div>
      </div>
      ${(() => { const e = einrichtungStand(stand); return `<div class="karte einrichtung"><div class="einrichtung-kopf">${ring(e.prozent)}<div><b>${esc(t("einrichtung.titel", e.prozent))}</b><small>${esc(t("einrichtung.rest", e.offen))}</small></div></div></div>`; })()}
      <p class="hinweis">${esc(t("schnell.fertigHinweis"))}</p>`; // Punkt 6: Ring statt „fehlt noch"-Kästen; r.ohneRezept steckt im Ring
  },
  fuss: () => `<button type="button" class="knopf glut" data-a="ob-fertig" data-ziel="beleg">${esc(t("schnell.rechnungen"))}</button><button type="button" class="knopf zweit" data-a="ob-fertig" data-ziel="start">${esc(t("schnell.zumCockpit"))}</button>`,
  aktion(name, el, stand, ctx) { if (name === "ob-fertig") { delete stand.schnellErgebnis; ctx.fertig(el.dataset.ziel === "beleg" ? "beleg" : "start"); return false; } },
};

export const SCHNELL = [sprache, ladenSchnell, selbstSchnell, karteSchnell, kostenSchnell, fertigSchnell];
export const schritteFuer = (stand) => (stand?.weg === "schnell" ? SCHNELL : SCHRITTE);
