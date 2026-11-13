// GastroCash – Einstieg. Hier wird nur verdrahtet: die Rückrufe eintragen, die Ereignisse des Browsers anmelden, starten.
// Der Zustand der Bedienschicht liegt in js/bedienung/zustand.js, jeder Bereich in einer eigenen Datei in js/bedienung/
// (Klick-Tabellen: KLICK, ANSICHT_KLICK, ANSICHT_EINGABE, AENDERUNG). Wo ein neuer data-a-Name hingehört: docs/architektur.md.
import "./adapter/brand_start.js"; // Zekis Bewegungen starten, sobald sie erscheinen
import { haken } from "./bedienung/zustand.js";
import { fehlerSammlerAnmelden } from "./bedienung/sicherung.js";
import { meldungAnmelden } from "./bedienung/meldung.js";
import { updateAnmelden, fremderStandAnmelden } from "./bedienung/update.js";
import { ebeneAnmelden } from "./bedienung/ebene.js";
import { klickAnmelden } from "./bedienung/klick.js";
import { eingabeAnmelden } from "./bedienung/eingabe.js";
import { zurueckAnmelden } from "./bedienung/zurueck.js";
import { tagAnmelden } from "./bedienung/tag.js";
import { speicherFehlerAnmelden } from "./bedienung/zeichnen.js";
import { fuehrungStartPlanen } from "./bedienung/rundgang.js";
import { starten, zahlenfelderAnmelden, debugAnmelden } from "./bedienung/start.js";

haken.fuehrungStartPlanen = fuehrungStartPlanen; // zeichne() ruft die Führung von unten nach oben, ohne rundgang.js zu importieren

// Die Reihenfolge der Anmeldungen ist die der alten app.js (gleiche Ereignisse, gleiche Reihenfolge).
fehlerSammlerAnmelden();
meldungAnmelden();
updateAnmelden();
ebeneAnmelden();
klickAnmelden();
eingabeAnmelden();
zurueckAnmelden();
tagAnmelden();
speicherFehlerAnmelden();
fremderStandAnmelden();
starten();
zahlenfelderAnmelden();
debugAnmelden();
