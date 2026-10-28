// Testhilfe (19.10.2026): Die Büro-Bereiche sind aufklappbar (details). Durchläufe klicken Einträge direkt an –
// deshalb klappt diese Hilfe im Testbrowser jeden Büro-Bereich sofort auf. Kein App-Code.
new MutationObserver(() => {
  for (const d of document.querySelectorAll("details.b-bereich:not([open]), details.b-offen-mehr:not([open]), details.einklapp:not([open])")) d.open = true;
}).observe(document, { childList: true, subtree: true });
// Testhilfe (27.10.2026, angepasst 28.10.2026 für den Mitmach-Rundgang): Die Führung mit Zeki nach der Einrichtung beendet diese Hilfe
// wie ein Mensch („Überspringen“ → „Später“ bzw. „Nein, war Übung“ → nach 3 s „Verstanden“), damit Durchläufe, die direkt klicken,
// nicht hängen. Wer die Führung prüfen will, setzt vorher window.__gcFuehrungZeigen = true.
new MutationObserver(() => {
  if (window.__gcFuehrungZeigen) return;
  const h = document.querySelector(".rg-huelle"); if (!h) return;
  setTimeout(() => { const k = h.querySelector('[data-rg="verstanden"]:not([disabled]), [data-rg="spaeter"], [data-rg="verwerfen"], [data-rg="ueberspringen"]'); if (k && k.isConnected) k.click(); }, 30);
}).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
