# Zeki – gesicherte 3D-Quelle, 26.10.2026

Aus dem freigegebenen Stand vom 24.10. wiederhergestellt. Die App verwendet native SVG-Pfade für die ruhende Figur und sieben transparente WebP-Bewegungsfolgen aus diesem echten Modell. Keine JPEG-Fototeile im SVG. Kein Canvas, WebGL oder Fremdpaket in der App. Nur der Entwicklungsviewer nutzt WebGL.

`index.html` per lokalem HTTP-Server öffnen. `Zeki_3D.glb` enthält Volumen und Gelenke; `modell.json`, `modell.py`, Vektorgrundlage, Atlas und Renderer sind bearbeitbare Quellen. Seiten/Rücken wurden aus der Front ergänzt.

Wiederherstellung: Python-Abhängigkeiten requirements.txt plus Pillow und Playwright/Chromium. `python3 tools/zeki_bauen.py` erzeugt die Front und Bewegungen, danach `python3 tools/sw_liste.py`. Atlas liegt platzsparend als verlustfreies WebP vor; der GLB-Generator bettet daraus eine PNG ein.

Schnittstelle und aktuelle Prüfung: ../../bruecke/an-zoro/2026-10-26-zeki-uebergabe.md (vom Repo aus lesen). Historische Arbeitsnotizen sind kein aktueller Prüfstand.
