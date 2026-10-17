// Onboarding: eine Frage je Bildschirm, jeder Schritt wird sofort gespeichert,
// jeder Schritt lässt sich mit „weiß ich gerade nicht" offen lassen. Nichts blockiert.
import { selbstGewaehlt, selbstAnwenden } from "../selbst.js";
import { kachelnFuer, vorauswahlFuer } from "../data/zwischen.js";
import { ladenArtVon } from "../profil.js";
import { einrichtungStand } from "../einrichtung.js";
import { ring } from "./home.js";
import { FOTOS } from "../data/fotos.js";
import { sym } from "../symbole.js";
import { t, SPRACHEN, SPRACH_NAMEN } from "../i18n.js";
import { kuehlstelleAnzeige, kuehlTypVon, TYP_AUS_ART } from "../kuehlname.js"; // Paket 6 (17.10.2026)
import { esc, parseZahl, fmtEuro, fmtZahl, uid, wertAnzeige } from "../util.js";
import { reinigungVon, putzzeitMonat, REINIGUNG_LEER } from "../reinigung.js";
import { FORMATE, FORMAT_GRUPPEN, findeFormat } from "../data/formate.js";
import { KUECHEN } from "../data/kuechen.js";
import { KATEGORIEN, postenJeKategorie, istTypisch, basisStandard, satzStandard } from "../data/kosten.js";
import { VORSTEUER_SAETZE } from "../engine.js"; // Paket 3 (16.10.2026), M1: Vorsteuersatz je Posten
import { fixkosten, EIGENER_LOHN_RICHTWERT, eigenerLohnJeMonat, grenzenVon } from "../engine.js";
import { heute } from "../util.js";
import { karte, rezepte, preise, verkauf, ergebnis } from "./karte.js";
import { karteFotoView, kartePruefenView, kartePruefenEingabe, kartePruefenAktion, karteUebernehmen, karteFussKnopf, karteZeigtPruefliste, karteModus, serieStand, fotoLauf, fotoVorbereiten } from "./foto.js";
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
  if (!e) { e = { id: uid(), posten: postenId, kategorie: kat, betrag: null, status: "aus", periode: "monat", basis: basisStandard(postenId), satz: satzStandard(postenId) }; stand.kosten.push(e); }
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
      ${SPRACHEN.map((s) => `<button type="button" class="kachel sprachkachel" data-a="sprache" data-wert="${s}" lang="${s}"><b>${esc(SPRACH_NAMEN[s] || s)}</b></button>`).join("")}
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
                  ${(e.basis || basisStandard(p.id)) === "brutto" && !stand.betrieb.kleinunternehmer ? `<div class="chips satzwahl">${VORSTEUER_SAETZE.map((sz) => `<button type="button" class="chip klein ${(VORSTEUER_SAETZE.includes(Number(e.satz)) ? Number(e.satz) : satzStandard(p.id)) === sz ? "an" : ""}" data-a="satz-posten" data-posten="${p.id}" data-wert="${sz}">${esc(t("kosten.satz." + sz))}</button>`).join("")}</div>` : ""}
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
      if (name === "satz-posten") { const e = postenEintrag(stand, el.dataset.posten, kat); const sz = Number(el.dataset.wert); e.satz = VORSTEUER_SAETZE.includes(sz) ? sz : satzStandard(el.dataset.posten); return true; } // Paket 3, M1
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
          <input class="textfeld" data-f="ob-stelle:${esc(k.id)}" value="${esc(kuehlstelleAnzeige(k))}" maxlength="40" placeholder="${esc(t("kuehl.namePlatzhalter"))}" autocomplete="off">
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
      stand.kuehlstellen.push({ id: uid(), name: nameNeu, art, typ: art === "tk" ? "tiefkuehler" : "kuehlschrank", min: null, max: null, reihe: stand.kuehlstellen.length, archiviert: false }); return true;
    }
    if (name === "minus" && el.dataset.feld === "stellen") { const l = aktiv(); const k = l[l.length - 1]; if (!k) return false; if (stand.messungen.some((m) => m.stelle === k.id)) k.archiviert = true; else stand.kuehlstellen = stand.kuehlstellen.filter((x) => x.id !== k.id); return true; }
    if (name === "ob-art") { const k = stand.kuehlstellen.find((x) => x.id === el.dataset.id); if (!k) return false; k.art = el.dataset.wert; k.min = null; k.max = null; k.typ = TYP_AUS_ART[k.art]; if (k.art === "tk" && /^Kühlschrank|^Fridge|^Buzdolabı/.test(k.name)) k.name = t("kuehl.obNameTk"); if (k.art === "warm" && /^Kühlschrank|^Fridge|^Buzdolabı|^Tiefkühler|^Freezer|^Derin/.test(k.name)) k.name = t("kuehl.obNameWarm"); return true; }
  },
  beimVerlassen(stand) { stand.kuehl.eingerichtet = stand.kuehlstellen.some((k) => !k.archiviert); },
};


// Punkt 5 – Reinigung (Entscheidung Baris 15.10., 12:43: Variante B1, alles auf einer Seite).
// Firma = Geld vom Konto (Zeile im Zähler). Eigene Putzzeit = Einsicht, keine Kosten (Teamlohn steckt im Personal).
export const reinigungSchritt = {
  id: "reinigung",
  view(stand) {
    const r = reinigungVon(stand);
    const wahl = (w, s) => `<button type="button" class="wahl ${r.wer === w ? "an" : ""}" data-a="rein-wer" data-wert="${w}" aria-pressed="${r.wer === w}">
      <span class="wahlsym">${sym(s)}</span><span class="fuell"><b>${esc(t("reinigung.wer." + w))}</b><small class="block">${esc(t("reinigung.werHinweis." + w))}</small></span><span class="haken">${r.wer === w ? "✓" : ""}</span></button>`;
    const z = putzzeitMonat(stand);
    return `
      <h1 class="frage">${esc(t("reinigung.frage"))}</h1>
      <p class="hinweis">${esc(t("reinigung.hinweis"))}</p>
      <div class="liste">${wahl("firma", "store")}${wahl("selbst", "users")}${wahl("beides", "sprout")}</div>
      ${r.wer && r.wer !== "firma" ? `
        <div class="feldzeile"><label>${esc(t("reinigung.minutenFrage"))}</label>
          <div class="stepper"><button type="button" data-a="rein-min" data-d="-15" aria-label="−15">−</button><span class="wert">${esc(t("reinigung.minuten", r.minutenTag))}</span><button type="button" data-a="rein-min" data-d="15" aria-label="+15">+</button></div></div>
        <div class="feldzeile"><label>${esc(t("reinigung.durchFrage"))}</label>
          <div class="chips">${["team", "inhaber"].map((d) => `<button type="button" class="chip ${r.durch === d ? "an" : ""}" data-a="rein-durch" data-wert="${d}">${esc(t("reinigung.durch." + d))}</button>`).join("")}</div></div>
        ${z ? `<div class="karte einsicht"><span class="einsichtsym">${sym("chef-hat")}</span><div><p>${esc(z.euro !== null ? t("reinigung.einsichtEuro", r.minutenTag, fmtEuro(Math.round(z.euro / 10) * 10)) : t("reinigung.einsichtStunden", r.minutenTag, fmtZahl(z.stunden, 0)))}</p>
          <small>${esc(t(r.durch === "team" ? "reinigung.nichtDoppelt" : "reinigung.inhaberZeit"))}</small></div></div>` : ""}` : ""}
      ${r.wer && r.wer !== "selbst" ? `<div class="feldzeile"><label>${esc(t("reinigung.firmaFrage"))}</label>${zahlfeld({ feld: "rein-firma", wert: r.firmaBetrag, einheit: t("reinigung.jeMonat"), klein: true })}</div>` : ""}
      ${r.wer ? `<div class="chips basiswahl">${["brutto", "netto"].map((b) => `<button type="button" class="chip klein ${(r.basis || "brutto") === b ? "an" : ""}" data-a="rein-basis" data-wert="${b}">${esc(t("reinigung.basis." + b))}</button>`).join("")}</div>` : ""}
      ${r.wer ? `<div class="feldzeile"><label>${esc(t("reinigung.mittelFrage"))}</label><p class="hinweis">${esc(t("reinigung.mittelHinweis"))}</p>${zahlfeld({ feld: "rein-mittel", wert: r.mittelSchaetzung, einheit: t("reinigung.jeMonat"), klein: true, platzhalter: "–", status: typeof r.mittelSchaetzung === "number" ? "geschaetzt" : "" })}</div>` : ""}`;
  },
  fuss: () => knopfWeiter(),
  eingabe(feld, wert, stand) {
    const r = (stand.betrieb.reinigung ??= { ...REINIGUNG_LEER });
    if (feld === "rein-firma") r.firmaBetrag = parseZahl(wert);
    if (feld === "rein-mittel") r.mittelSchaetzung = parseZahl(wert);
  },
  aktion(name, el, stand) {
    const r = (stand.betrieb.reinigung ??= { ...REINIGUNG_LEER });
    if (name === "rein-wer") { r.wer = el.dataset.wert; return true; }
    if (name === "rein-min") { r.minutenTag = Math.min(240, Math.max(15, (Number(r.minutenTag) || 45) + Number(el.dataset.d))); return true; }
    if (name === "rein-basis") { r.basis = el.dataset.wert === "netto" ? "netto" : "brutto"; return true; }
    if (name === "rein-durch") { r.durch = el.dataset.wert === "inhaber" ? "inhaber" : "team"; return true; }
  },
};

export const SCHRITTE = [sprache, format, kueche, betrieb, team, lohn, kostenIntro, ...KATEGORIEN.map(kostenSchritt), reinigungSchritt, kanaele, kuehlstellen, karte, rezepte, preise, verkauf, ergebnis];
export const schrittIndex = (id) => SCHRITTE.findIndex((s) => s.id === id);
// 17.10.2026 Fehler F1: Ohne Gerichte zeigten „Rezepte“ und „Einkaufspreise“ (Büro, Speisekarte) eine leere Seite mit „Übernehmen“, das nichts übernahm.
// Dann zuerst die Gerichte-Auswahl mit den Vorlagen öffnen; danach geht es weiter bis zum gewünschten Schritt.
// „Verkauf“ bleibt, wie er ist: Tagesmenge und Ziel gehen auch ohne Gerichte.
export function bearbeitenZiel(stand, von, bis) {
  if (["rezepte", "preise"].includes(von) && !(stand?.gerichte || []).length) return { von: "karte", bis: bis || von };
  return { von, bis };
}

// ---------- Schnellstart: Laden-Arten (Etappe 6a) ----------
export const LADEN_ARTEN = [ // Reihenfolge wie im Zielbild (15.10.): Döner, Pizza, Asia, Foodtruck, Bäckerei, Kiosk – dann die übrigen
  { id: "doener", format: "imbiss", kuechen: ["doener"] }, { id: "pizza", format: "imbiss", kuechen: ["pizza"] },
  { id: "asia", format: "imbiss", kuechen: ["asiatisch"] }, { id: "foodtruck", format: "foodtruck", kuechen: ["burger"] },
  { id: "baeckerei", format: "baeckerei", kuechen: ["fruehstueck"] }, { id: "kiosk", format: "imbiss", kuechen: ["burger"] },
  { id: "imbiss", format: "imbiss", kuechen: ["burger"] }, { id: "cafe", format: "cafe", kuechen: ["bistro"] },
  { id: "anders", format: "eigen", kuechen: ["eigene"] },
];

// Die vier Kostenfragen des alten Schnellwegs (Etappe 6a). Kein eigener Bildschirm mehr – „Geld“ schreibt über diese Eingabe, damit die Daten gleich bleiben.
const KS_POSTEN = { miete: "miete", energie: "strom" };
export const kostenSchnell = {
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

// ---------- Schnellweg 2 (Entwickler E, 15.10.2026): höchstens 6 Bildschirme, zusammen höchstens 120 Wörter ----------
// Sprache → Laden → Karte → Kühlung → Geld → Fertig. Keine Erklär-Absätze: Erklärung nur hinter einem „?“ (höchstens 2 Sätze).
// „Was macht ihr selbst?“ fragt der Schnellweg nicht mehr: Startwerte nach Laden-Art, Korrektur im Büro (Rezepte/Einkaufspreise: „selbst machen“ / „doch kaufen“).
// Der genaue Weg (SCHRITTE) bleibt unverändert und ist aus dem Büro über data-a="bearbeiten" data-schritt="format" data-bis="ergebnis" erreichbar.

// „?“ – je Bildschirm höchstens eine aufklappbare Erklärung. Der Zustand gilt nur für den Bildschirm, auf dem sie geöffnet wurde.
let hilfeAuf = null;
export function onboardingZuruecksetzen() { hilfeAuf = null; } // Paket 2 (16.10.2026): Ladenwechsel – zentrale Liste in app.js
const kopfS2 = (id, titel, hilfeText, extra = "") => `
    <div class="s2kopf"><h1 class="frage" dir="auto">${esc(titel)}</h1>${hilfeText ? `<button type="button" class="s2fragezeichen" data-a="s2-hilfe" data-wert="${id}" aria-expanded="${hilfeAuf === id}" aria-label="${esc(t("schnell2.hilfe"))}">?</button>` : ""}</div>
    ${hilfeText && hilfeAuf === id ? `<div class="s2hilfe" role="note"><p>${esc(hilfeText)}</p>${extra}</div>` : ""}`;
const hilfeAktion = (name, el) => { if (name !== "s2-hilfe") return false; hilfeAuf = hilfeAuf === el.dataset.wert ? null : el.dataset.wert; return true; };

// Vorauswahl „selbst gemacht“ nach Laden-Art – still angewendet, ohne Frage. Eine eigene Antwort des Wirts (im Büro geändert) bleibt.
const gleich = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
export function selbstStandard(stand) {
  const art = ladenArtVon(stand); if (!art) return false;
  const eigeneAntwort = Array.isArray(stand.selbst) && !(stand.selbstAutoArt && gleich(stand.selbst, vorauswahlFuer(stand.selbstAutoArt)));
  if (eigeneAntwort) return false;
  selbstAnwenden(stand, vorauswahlFuer(art)); stand.selbstAutoArt = art;
  return true;
}

const spracheSchnell = {
  id: "sprache",
  view: () => `
    <div class="s2sprache">
      <h1 class="frage">${esc(t("schnell2.sprache"))}</h1>
      <div class="kacheln s2sprachen">
        ${SPRACHEN.map((s) => `<button type="button" class="kachel sprachkachel" data-a="sprache" data-wert="${s}" lang="${s}" dir="auto"><b>${esc(SPRACH_NAMEN[s] || s)}</b></button>`).join("")}
      </div>
    </div>`,
  fuss: () => "",
  aktion: sprache.aktion,
};

// Foto je Laden-Art (foto/laden-*.webp, sobald Sanjis Bildpaket da ist), sonst Sanjis Piktogramm
const LADEN_PIKTO = { imbiss: "laden-burger", kiosk: "laden-anders" };
const LADEN_FOTO = { imbiss: ["laden-imbiss", "laden-kiosk"], cafe: ["laden-cafe", "laden-baeckerei"] }; // erst eigenes Foto, sonst das ähnlichste Ladenbild
const ladenBild = (id) => { const f = [...(LADEN_FOTO[id] || []), "laden-" + id].find((n) => FOTOS.has(n));
  return f ? `<img class="kachelfoto" src="foto/${f}.webp" alt="" aria-hidden="true">` : `<img class="kachelfoto pikto" src="bilder/${LADEN_PIKTO[id] || "laden-" + id}.svg" alt="" aria-hidden="true">`; };
const ladenSchnell = {
  id: "laden-schnell",
  view: (stand) => `
    ${kopfS2("laden-schnell", t("schnell2.laden"), t("schnell2.ladenHilfe"), `<button type="button" class="leise" data-a="weg-genau">${esc(t("schnell2.allesGenau"))}</button>`)}
    <input class="textfeld s2name" data-f="betrieb.name" maxlength="40" value="${esc(stand.betrieb.name)}" placeholder="${esc(t("schnell2.namePlatzhalter"))}" aria-label="${esc(t("schnell2.namePlatzhalter"))}" autocomplete="off">
    <div class="kacheln fotokacheln s2arten">${LADEN_ARTEN.map((a) => `<button type="button" class="kachel fotokachel ${stand.ladenArt === a.id ? "an" : ""}" aria-pressed="${stand.ladenArt === a.id}" data-a="laden-art" data-wert="${a.id}">${ladenBild(a.id)}<b>${esc(t("schnell.arten." + a.id))}</b></button>`).join("")}</div>`,
  fuss: (stand) => stand.ladenArt ? knopfWeiter() : "",
  eingabe(feld, wert, stand) { if (feld === "betrieb.name") stand.betrieb.name = wert; },
  aktion(name, el, stand) {
    if (hilfeAktion(name, el)) return true;
    if (name === "laden-art") { const a = LADEN_ARTEN.find((x) => x.id === el.dataset.wert); if (!a) return false; stand.ladenArt = a.id; stand.betrieb.format = a.format; stand.betrieb.kuechen = [...a.kuechen]; return true; }
    if (name === "weg-genau") { hilfeAuf = null; stand.weg = "genau"; stand.schritt = schrittIndex("format"); stand.schrittId = "format"; return true; }
  },
  beimVerlassen(stand) { selbstStandard(stand); },
};

// Karte: eine große Foto-Fläche (Kamera), darunter leise „Fotos oder PDF“. Läuft das Lesen oder steht die Prüfliste, zeigt foto.js wie bisher.
const karteSchnell = {
  id: "karte-foto",
  view(stand) {
    if (karteZeigtPruefliste()) return kartePruefenView(stand);
    const st = serieStand();
    if (karteModus() !== "sammeln" || st.aufgenommen || fotoLauf()?.status === "fehler" || fotoLauf()?.hinweis) return karteFotoView(stand);
    fotoVorbereiten();
    return `
      ${kopfS2("karte-foto", t("schnell2.karte"), t("schnell2.karteHilfe"))}
      <label class="s2fotoflaeche">
        ${FOTOS.has("g-doener-teller") ? `<img src="foto/g-doener-teller.webp" alt="" aria-hidden="true">` : ""}
        <span class="s2fotoknopf"><span class="s2kamera" aria-hidden="true">${sym("camera")}</span>${esc(t("schnell2.karteFoto"))}</span>
        <input type="file" accept="image/*" capture="environment" data-f="foto" data-zweck="speisekarte" class="dateifeld">
      </label>
      <label class="leise s2galerie">${esc(t("schnell2.karteGalerie"))}
        <input type="file" accept="image/*,application/pdf,.pdf" multiple data-f="foto" data-zweck="speisekarte" class="dateifeld"></label>`;
  },
  fuss: () => karteFussKnopf(`<button type="button" class="knopf zweit" data-a="weiter">${esc(t("schnell2.spaeter"))}</button>`),
  eingabe: (feld, wert) => kartePruefenEingabe(feld, wert),
  aktion(name, el, stand, ctx) {
    if (hilfeAktion(name, el)) return true;
    if (name === "fv-uebernehmen") { selbstStandard(stand); stand.schnellErgebnis = karteUebernehmen(stand); ctx.weiter(); return true; }
    return kartePruefenAktion(name, el);
  },
  beimVerlassen(stand) { selbstStandard(stand); },
};

// Kühlung: vier Foto-Zeilen mit Anzahl. Jede Stelle bekommt `typ` (neu, tolerant), damit die Zeile weiß, was zu ihr gehört.
// Namen ändert man später (Büro → Kühlstellen); die Grenzwerte gelten nach Gesetz (Standard), wie bisher.
export const KUEHL_TYPEN = [
  { typ: "kuehlschrank", art: "kuehl", foto: "k-kuehlschrank-foto", pikto: "k-kuehlschrank" },
  { typ: "saladette", art: "kuehl", foto: "k-saladette-foto", pikto: "k-theke" },
  { typ: "tiefkuehler", art: "tk", foto: "k-tiefkuehler-foto", pikto: "k-tiefkuehler" },
  { typ: "warmhalter", art: "warm", foto: "k-warmhalter-foto", pikto: "k-warmhalter" },
];
// Paket 6 (17.10.2026): Typ ohne gespeicherten Schlüssel auch aus dem Standardnamen (de/tr/en) erkennen – kuehlname.js
export const kuehlTyp = (k) => kuehlTypVon(k);
const aktiveStellen = (stand) => stand.kuehlstellen.filter((k) => !k.archiviert).sort((a, b) => a.reihe - b.reihe);
export function kuehlAnzahlAendern(stand, typ, d) {
  const T = KUEHL_TYPEN.find((x) => x.typ === typ); if (!T) return false;
  const gleiche = aktiveStellen(stand).filter((k) => kuehlTyp(k) === typ);
  if (d > 0) {
    if (aktiveStellen(stand).length >= 20) return false;
    const n = gleiche.length; const name = t("schnell2.arten." + typ) + (n ? " " + (n + 1) : "");
    if (!stand.kuehl.seit) stand.kuehl.seit = heute();
    stand.kuehlstellen.push({ id: uid(), name, art: T.art, typ, min: null, max: null, reihe: stand.kuehlstellen.length, archiviert: false });
    return true;
  }
  const k = gleiche[gleiche.length - 1]; if (!k) return false;
  if (stand.messungen.some((m) => m.stelle === k.id)) k.archiviert = true; // Messungen bleiben nachweisbar
  else stand.kuehlstellen = stand.kuehlstellen.filter((x) => x.id !== k.id);
  return true;
}
const kuehlSchnell = {
  id: "kuehl-schnell",
  view(stand) {
    const alle = aktiveStellen(stand);
    return `
      ${kopfS2("kuehl-schnell", t("schnell2.kuehl"), t("schnell2.kuehlHilfe"))}
      <div class="s2kuehl">${KUEHL_TYPEN.map((T) => {
        const n = alle.filter((k) => kuehlTyp(k) === T.typ).length; const name = t("schnell2.arten." + T.typ);
        return `<div class="s2kuehlzeile ${n ? "an" : ""}">
          ${FOTOS.has(T.foto) ? `<img src="foto/${T.foto}.webp" alt="" aria-hidden="true">` : `<img class="pikto" src="bilder/${T.pikto}.svg" alt="" aria-hidden="true">`}
          <b>${esc(name)}</b>
          <div class="s2zaehler">
            <button type="button" data-a="s2-kuehl" data-wert="${T.typ}" data-d="-1" aria-label="${esc(name)} −" ${n ? "" : "disabled"}>−</button>
            <span class="s2anzahl" aria-live="polite">${n}</span>
            <button type="button" data-a="s2-kuehl" data-wert="${T.typ}" data-d="1" aria-label="${esc(name)} +">+</button>
          </div></div>`;
      }).join("")}</div>`;
  },
  fuss: () => knopfWeiter(),
  aktion(name, el, stand) {
    if (hilfeAktion(name, el)) return true;
    if (name === "s2-kuehl") return kuehlAnzahlAendern(stand, el.dataset.wert, Number(el.dataset.d));
  },
  beimVerlassen(stand) { stand.kuehl.eingerichtet = stand.kuehlstellen.some((k) => !k.archiviert); },
};

// Geld: die vier Kostenfragen und „Wer putzt?“ auf einem Bildschirm. Geschrieben wird genau wie bisher
// (kostenSchnell.eingabe: Posten miete/strom, team.lohnkosten, team.eigenerLohn; reinigungSchritt: betrieb.reinigung).
const geld = {
  id: "geld",
  view(stand) {
    const f = findeFormat(stand.betrieb.format);
    const wert = (posten) => stand.kosten.find((k) => k.posten === posten && k.status === "bekannt")?.betrag ?? null;
    const eigen = stand.team.eigenerLohnStatus === "eigen" ? stand.team.eigenerLohn : null;
    const r = reinigungVon(stand);
    const feld = (f2, label, w, ph) => `<label class="s2geldzeile"><span>${esc(label)}</span><span class="betrag"><input inputmode="decimal" autocomplete="off" data-f="${f2}" value="${esc(wertAnzeige(w))}" placeholder="${esc(ph ? String(ph) : "0")}" aria-label="${esc(label)}"><span class="einheit">${esc(t("allgemein.euro"))}</span></span></label>`;
    return `
      ${kopfS2("geld", t("schnell2.geld"), t("schnell2.geldHilfe"))}
      <div class="s2geld">
        ${feld("ks:miete", t("schnell2.miete"), wert("miete"), f?.rw.miete)}
        ${feld("ks:personal", t("schnell2.personal"), stand.team.lohnkosten, null)}
        ${feld("ks:eigen", t("schnell2.eigen"), eigen, EIGENER_LOHN_RICHTWERT)}
        ${feld("ks:energie", t("schnell2.strom"), wert("strom"), null)}
      </div>
      <div class="s2putz"><b>${esc(t("schnell2.putzt"))}</b>
        <div class="chips">${["selbst", "firma", "beides"].map((w) => `<button type="button" class="chip ${r.wer === w ? "an" : ""}" data-a="rein-wer" data-wert="${w}" aria-pressed="${r.wer === w}">${esc(t("schnell2.wer." + w))}</button>`).join("")}</div>
        ${r.wer === "firma" || r.wer === "beides" ? `<div class="s2geld">${feld("rein-firma", t("schnell2.firma"), r.firmaBetrag, null)}</div>` : ""}
      </div>`;
  },
  fuss: () => knopfWeiter(),
  eingabe(feld, wert, stand) {
    if (feld.startsWith("ks:")) return kostenSchnell.eingabe(feld, wert, stand);
    if (feld === "rein-firma") return reinigungSchritt.eingabe(feld, wert, stand);
  },
  aktion(name, el, stand) {
    if (hilfeAktion(name, el)) return true;
    if (name === "rein-wer") return reinigungSchritt.aktion(name, el, stand);
  },
};

// Fertig: großer Haken, Einrichtungsring, EIN Hauptknopf (ohne Gerichte: Karte fotografieren, sonst „Los geht's“), leise „Büro-PIN festlegen“.
const fertigSchnell = {
  id: "fertig-schnell",
  view(stand) {
    const e = einrichtungStand(stand);
    return `
      <div class="s2fertig">
        <span class="s2haken" aria-hidden="true">${sym("check")}</span>
        <h1 class="frage" dir="auto">${esc(t("schnell2.fertig"))}</h1>
        <div class="s2ring">${ring(e.prozent)}<span>${esc(t("schnell2.eingerichtet"))}</span></div>
        <button type="button" class="leise" data-a="ob-fertig" data-ziel="buero" data-pin="1">${esc(t("schnell2.pin"))}</button>
      </div>`;
  },
  fuss: (stand) => stand && !stand.gerichte.length
    ? `<button type="button" class="knopf glut s2los" data-a="ob-fertig" data-ziel="kartefoto">${esc(t("schnell2.karteFoto"))}</button>`
    : `<button type="button" class="knopf glut s2los" data-a="ob-fertig" data-ziel="start">${esc(t("schnell2.los"))}</button>`,
  aktion(name, el, stand, ctx) {
    if (name !== "ob-fertig") return false;
    delete stand.schnellErgebnis;
    if (el.dataset.pin) stand.pinFestlegen = true; // W2-S: app.js (fertig) öffnet damit gleich das PIN-Blatt
    ctx.fertig(["kartefoto", "buero"].includes(el.dataset.ziel) ? el.dataset.ziel : "start");
    return false;
  },
};

export const SCHNELL = [spracheSchnell, ladenSchnell, karteSchnell, kuehlSchnell, geld, fertigSchnell];
export const schritteFuer = (stand) => (stand?.weg === "schnell" ? SCHNELL : SCHRITTE);

// ---------- Gespeicherter Schritt: nach Kennung, nicht nur nach Nummer ----------
// stand.schritt (Nummer) bleibt für app.js; stand.schrittId (neu) ist maßgeblich beim Laden. So verschiebt ein neuer
// oder entfernter Schritt niemanden. Alte Stände ohne Kennung: Nummer im alten Schnellweg (7 Schritte) → neue Kennung.
export const ALT_SCHNELL = ["sprache", "laden-schnell", "selbst", "karte-foto", "kosten-schnell", "reinigung", "fertig-schnell"];
const ALT_NACH_NEU = { sprache: "sprache", "laden-schnell": "laden-schnell", selbst: "karte-foto", "karte-foto": "karte-foto", "kosten-schnell": "geld", reinigung: "geld", "fertig-schnell": "fertig-schnell", kuehlstellen: "kuehl-schnell" };

export function schrittIdMerken(stand) {
  if (!stand || stand.phase !== "onboarding") return;
  const liste = schritteFuer(stand);
  stand.schritt = Math.min(Math.max(0, stand.schritt || 0), liste.length - 1);
  stand.schrittId = liste[stand.schritt].id;
}

export function schrittWiederherstellen(stand) {
  if (!stand || stand.phase !== "onboarding") return stand;
  const liste = schritteFuer(stand);
  let id = typeof stand.schrittId === "string" ? stand.schrittId : null;
  if (!id && stand.weg === "schnell") id = ALT_SCHNELL[Math.min(stand.schritt || 0, ALT_SCHNELL.length - 1)];
  // Wer alt auf „Was macht ihr selbst?“ stand: seine Antwort (oder die Vorauswahl) jetzt übernehmen – die Frage gibt es nicht mehr
  if (id === "selbst" && stand.weg === "schnell") { if (Array.isArray(stand.selbst)) selbstAnwenden(stand); else selbstStandard(stand); }
  if (id && stand.weg === "schnell" && !liste.some((s) => s.id === id)) id = ALT_NACH_NEU[id] || null;
  const i = id ? liste.findIndex((s) => s.id === id) : -1;
  if (i >= 0) stand.schritt = i;
  schrittIdMerken(stand);
  return stand;
}
