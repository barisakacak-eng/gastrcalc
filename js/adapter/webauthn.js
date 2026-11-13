// Passkey-Technik des Geräts (WebAuthn) und der Name der Seite, an den der Schlüssel gebunden wird.
export const hostName = () => location.hostname;
export const schluesselAnlegen = (publicKey) => navigator.credentials.create({ publicKey });
export const schluesselPruefen = (publicKey) => navigator.credentials.get({ publicKey });
