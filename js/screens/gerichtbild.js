// Das Bild eines Gerichts (Foto oder Piktogramm) als HTML. Vorher in vergleich.js; dort wird es weiter ausgegeben.
import { esc } from "../util.js";
import { gerichtBildQuelle } from "../bilder.js"; // Trennung 2 (17.10.2026): Bildzuordnung

export function gerichtBild(g) {
  const q = gerichtBildQuelle(g); // Trennung 2 (17.10.2026): Zuordnung in js/bilder.js
  if (q.eigen) return `<img class="gerichtbild" data-foto="${esc(q.eigen)}" src="bilder/${q.pikto}.svg" alt="" loading="lazy" decoding="async">`; // eigenes Foto des Wirts, wird nach dem Zeichnen aus der Ablage geladen
  return q.foto ? `<img class="gerichtbild" src="foto/${q.foto}.webp" alt="" loading="lazy" decoding="async">` : `<img class="gerichtbild pikto" src="bilder/${q.pikto}.svg" alt="" loading="lazy" decoding="async">`;
}
