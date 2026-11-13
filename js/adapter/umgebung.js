// Läuft die Seite im Browser oder in Node (Tests, Werkzeuge)? Große Sprachdaten laden im Browser erst bei Bedarf
// (js/sprachdaten.js, js/i18n.js); in Node sind sie sofort da, damit jeder Test sie wie bisher synchron lesen kann.
// Node erkennt man an process.versions.node – nicht an „document“, das manche Tests als Attrappe setzen.
export const imBrowser = !(typeof process !== "undefined" && !!process.versions?.node);
