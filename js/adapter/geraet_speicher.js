// Gerätespeicher des Browsers (localStorage) für Merker je Handy, die nicht in der Wurzel stehen. Ohne Speicher (privates Fenster, Node) passiert nichts.
export function merken(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ohne Speicher gilt nur die Wurzel */ } }
export function lesen(k) { try { return localStorage.getItem(k); } catch { return null; } }
