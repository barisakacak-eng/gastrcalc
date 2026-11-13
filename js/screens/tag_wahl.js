// Der gewählte Tag auf „Heute“ (null = heute; Vergangenheit = Nacherfassung, gekennzeichnet). Eigene Datei, weil tag.js und muell.js ihn beide brauchen.
import { heuteGeschaeft } from "../util.js";

let tagDatum = null;
export const tagGewaehlt = () => tagDatum || heuteGeschaeft();
export const tagWaehlen = (datum) => { tagDatum = datum; };
export const tagZuruecksetzen = () => { tagDatum = null; };
