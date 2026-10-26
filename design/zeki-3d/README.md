# Zeki – 3D-Arbeitsquelle, 24.10.2026

Das Modell ist eine Vorschau zur Bildfreigabe. Front aus der vorhandenen Vektorisierung; Seiten/Rückseite ergänzt. Keine App-Datei geändert.

## Anzeigen
`Zeki_3D_Vorschau.html` ist eigenständig. Modell, Vektorfarben und Schrift sind eingebettet. Die lokale Vorschau verwendet natives WebGL. Für die App ist damit noch kein Renderer festgelegt.

`Zeki_3D.glb` enthält die editierbare räumliche Quelle mit Gelenken und Clips. Kopf/Nicken verwendet Rotation am Hals, keine Skalierung.

## Modell neu erzeugen
Python 3, dann `python3 -m pip install -r requirements.txt` und `python3 modell.py`.
Der Generator erzeugt `modell.json`, `atlas.svg` und die GLB. Die vorhandene `atlas.png` wird in die GLB eingebettet. Wenn die Vektorfarbe geändert wird, `atlas.svg` erneut in eine PNG mit transparentem Hintergrund rendern und den Generator nochmals aufrufen.

Die Entwicklungsansicht aus `index.html`, `renderer.js`, `modell.json`, `atlas.svg` und `tokens.css` wird mit einem lokalen HTTP-Server geöffnet. Die eigenständige HTML-Datei benötigt das nicht.

## Inhalt
- Quelle `traced-low.svg`/`traced-high.svg`: native Pfade, keine Bildflächen.
- `modell.py`: Volumen, Gelenke, Mimik-Geometrie, GLB-Export.
- `renderer.js`: Arbeitsviewer und Pose-Steuerung, keine fachliche Berechnung oder Speicherung.
- `atlas.svg`/`atlas.png`: Vektorfarbe auf dem realen Mesh, kein Referenzfoto.
- Schrift: lokale Inter, Lizenz beiliegend.

Produktintegration, Offline-Ausgabe und echter iPhone-Test stehen nach der Bildfreigabe aus.
