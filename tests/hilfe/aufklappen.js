// Testhilfe (19.10.2026): Die Büro-Bereiche sind aufklappbar (details). Durchläufe klicken Einträge direkt an –
// deshalb klappt diese Hilfe im Testbrowser jeden Büro-Bereich sofort auf. Kein App-Code.
new MutationObserver(() => {
  for (const d of document.querySelectorAll("details.b-bereich:not([open]), details.b-offen-mehr:not([open]), details.einklapp:not([open])")) d.open = true;
}).observe(document, { childList: true, subtree: true });
// Testhilfe (27.10.2026): Die Führung mit Zeki nach der Einrichtung klickt diese Hilfe wie ein Mensch durch (Weiter … „Ja, alles klar“),
// damit Durchläufe, die direkt klicken, nicht hängen. Wer die Führung prüfen will, setzt vorher window.__gcFuehrungZeigen = true.
new MutationObserver(() => {
  if (window.__gcFuehrungZeigen) return;
  const h = document.querySelector(".rg-huelle"); if (!h) return;
  setTimeout(() => { const k = h.querySelector('[data-rg="ja"]') || h.querySelector(".rg-weiter"); if (k && k.isConnected) k.click(); }, 30);
}).observe(document, { childList: true, subtree: true });
