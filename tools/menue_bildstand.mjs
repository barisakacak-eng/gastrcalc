// Vollständige Fotozuordnung für die Übergabe, ohne Änderungen an Betriebsdaten.
import fs from 'node:fs';
import { KATALOG, VORLAGEN, PRODUKT_INDEX } from '../js/data/katalog.js';
import { MENUE_GERICHTE, MENUE_ARTIKEL, MENUE_QUELLE } from '../js/data/burger_ergaenzung.js';
import { gerichtBildQuelle, wareBildQuelle } from '../js/bilder.js';
import { FOTOS } from '../js/data/fotos.js';
const artikel=Object.values(PRODUKT_INDEX).map(p=>({name:p.n,gruppe:p.g,...wareBildQuelle({name:p.n,gruppe:p.g})}));
const gerichte=Object.entries(VORLAGEN).flatMap(([bereich,liste])=>liste.map(v=>({name:v.name,bereich,...gerichtBildQuelle({name:v.name,bereich})})));
console.log(JSON.stringify({datum:'2026-10-26',quelle:MENUE_QUELLE,menue:MENUE_GERICHTE,menue_artikel:MENUE_ARTIKEL,artikel,gerichte,
  fotodateien:fs.readdirSync(new URL('../foto',import.meta.url)).filter(n=>n.endsWith('.webp')),
  aktiv:[...FOTOS],katalog_bereiche:Object.keys(KATALOG)},null,2));
