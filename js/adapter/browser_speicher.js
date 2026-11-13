// Der Gerätespeicher des Browsers (localStorage) für reine Komfort-Merker (gesehene Hinweise, Fehler-Rucksack).
// localStorage kann selbst werfen (gesperrter Speicher, privates Fenster): dann gibt es einen Ersatz ohne Speicher statt eines Absturzes.
const LEER = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const speicherLokal = () => { try { return globalThis.localStorage || LEER; } catch { return LEER; } };
