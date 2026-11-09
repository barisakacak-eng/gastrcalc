# Umzug auf Uberspace – Kurzanleitung (Lauf 3, 09.11.2026)

Stand: vorbereitet, nichts eingeschaltet. Die Action `deploy-uberspace` läuft nach jedem grünen „Pages“-Lauf auf `main`, überspringt aber
sauber, solange die Secrets fehlen. Im Repo stehen keine Zugangsdaten, kein Hostname und kein Benutzername.

## Was Baris einmal einrichtet (am Laptop, ≈ 30 Minuten)

1. Uberspace-Konto anlegen und den Vertrag zur Auftragsverarbeitung im Dashboard abschließen.
2. Domain beim Registrar auf Uberspace zeigen lassen. Zuerst eine **Test-Subdomain** (zum Beispiel `test.` vor der Firmendomain) aufschalten:
   `uberspace web domain add <test-subdomain>`
3. Einen **eigenen SSH-Schlüssel nur für den Deploy** erzeugen (am eigenen Rechner, nie im Chat):
   `ssh-keygen -t ed25519 -f deploy_gastrocash -N "" -C deploy-gastrocash`
   Den öffentlichen Teil (`deploy_gastrocash.pub`) im Uberspace-Dashboard unter SSH-Schlüssel eintragen.
4. Webroot für die Test-Subdomain anlegen: `mkdir -p /var/www/virtual/$USER/<test-subdomain>`
5. In GitHub unter Settings → Secrets and variables → Actions diese Secrets anlegen (Werte nur dort, nie in Dateien oder Chats):
   - `UBERSPACE_SSH_KEY` – Inhalt der privaten Datei `deploy_gastrocash`
   - `UBERSPACE_HOST` – Rechnername des Uberspace (steht im Dashboard)
   - `UBERSPACE_USER` – Uberspace-Benutzername
   - `UBERSPACE_WEBROOT` – Pfad aus Schritt 4
   - optional `UBERSPACE_KNOWN_HOSTS` – Ausgabe von `ssh-keyscan <host>`, sonst holt die Action sie selbst

## Was danach automatisch passiert

- Grüner Wächter auf `main` → rsync von `main` in den Webroot. `.git`, `.github`, `tests`, `tools`, `docs`, `bruecke`, `design-handoffs` und Markdown gehen nicht mit.
- `.htaccess` liegt im Repo: HTTPS erzwingen, `sw.js`, `index.html` und Manifest ohne Cache, Manifest als `application/manifest+json`.
- Von Hand auslösen: Actions → deploy-uberspace → „Run workflow“.

## Prüfen auf der Test-Subdomain (Bau-Chat, vor dem Umschalten)

- Offline: Seite laden, Flugmodus, neu laden – App startet.
- Service-Worker-Wechsel: neue Fassung auf `main`, Seite zweimal laden, Fassungsnummer in Einstellungen prüfen.
- `tests/umzug_browser.py` mit einer Sicherung von github.io, Prüfstand-Import.
- Header: `curl -sI https://<test-subdomain>/sw.js` zeigt `Cache-Control: no-cache`.

## Erst nach Baris' Ja

- Hauptadresse aufschalten (`UBERSPACE_WEBROOT` auf den Webroot der Hauptadresse umstellen).
- github.io bekommt eine Hinweisseite: „Sicherung speichern → auf der neuen Adresse einlesen“ (Daten hängen an der Adresse, sie ziehen nicht von selbst mit).
- Rechtstexte: Hosting-Abschnitt auf Uberspace, nur was auf der Uberspace-Datenschutzseite belegt ist.
