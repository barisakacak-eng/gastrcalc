// Testhilfe (19.10.2026): Die Büro-Bereiche sind aufklappbar (details). Durchläufe klicken Einträge direkt an –
// deshalb klappt diese Hilfe im Testbrowser jeden Büro-Bereich sofort auf. Kein App-Code.
new MutationObserver(() => {
  for (const d of document.querySelectorAll("details.b-bereich:not([open]), details.b-offen-mehr:not([open])")) d.open = true;
}).observe(document, { childList: true, subtree: true });
