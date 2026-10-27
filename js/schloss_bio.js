// Face ID / Fingerabdruck als Schlüssel fürs Büro (Baris 26.10.2026 23:44, Entwurf 27.10.2026).
// Über die Passkey-Technik des Geräts (WebAuthn, „platform authenticator“). Ohne Server ist das ein Schloss am Gerät, kein Schutz
// der Daten selbst – für den Pilot reicht das, für Konten und Personal-Zugänge kommt später der Server.
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const vonB64 = (s) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const zufall = (n) => crypto.getRandomValues(new Uint8Array(n));

export async function bioVerfuegbar() {
  try { return !!(globalThis.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
// Neues Schlüsselpaar im Gerät anlegen; Rückgabe: Kennung (Text) oder null
export async function bioEinrichten() {
  try {
    const c = await navigator.credentials.create({ publicKey: {
      challenge: zufall(32), rp: { name: "GastroCash", id: location.hostname },
      user: { id: zufall(16), name: "chef", displayName: "Chef" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000, attestation: "none" } });
    return c ? b64(c.rawId) : null;
  } catch { return null; }
}
// Gesicht/Finger prüfen lassen; true nur, wenn das Gerät den Nutzer bestätigt hat
export async function bioPruefen(kennung) {
  if (!kennung) return false;
  try {
    const a = await navigator.credentials.get({ publicKey: { challenge: zufall(32), allowCredentials: [{ type: "public-key", id: vonB64(kennung), transports: ["internal"] }], userVerification: "required", timeout: 60000 } });
    return !!a;
  } catch { return false; }
}
