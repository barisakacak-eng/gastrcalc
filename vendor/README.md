# Fremdbausteine (offline, ohne CDN)

- `tesseract/` – Texterkennung auf dem Gerät. tesseract.js-core (Apache-2.0, https://github.com/naptha/tesseract.js-core), Builds `simd-lstm` und `lstm` (Rückfall ohne SIMD). Sprachmodell `deu.traineddata` aus tessdata_fast (Apache-2.0, https://github.com/tesseract-ocr/tessdata_fast).
- `pdfjs/` – PDF lesen. pdf.js 3.2.146 aus mozilla/pdfjs-dist (Apache-2.0). Läuft mit `isEvalSupported: false` (schließt die bekannte Lücke CVE-2024-4367 der Fassungen vor 4.2.67). Später gegen eine neuere Fassung tauschen.

Beides wird erst beim ersten Foto bzw. PDF geladen und danach vom Service Worker für den Offline-Betrieb aufbewahrt.
