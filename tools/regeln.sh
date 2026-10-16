#!/usr/bin/env bash
# Paket 7 (16.10.2026): alle Browser-Durchläufe nacheinander, am Ende eine Zeile je Lauf.
# Start: bash tools/regeln.sh   (aus dem Repo-Ordner; Python-Playwright mit Chromium muss da sein)
# Jeder Lauf startet seinen eigenen Webserver; damit sich Ports nicht beißen, bekommt jeder Lauf hier einen eigenen.
# Bilder landen unter $REGELN_AUSGABE (Standard: ../audit/laeufe neben dem Repo), getrennt je Lauf.
set -u
HIER="$(cd "$(dirname "$0")/.." && pwd)"; cd "$HIER"
AUSGABE="${REGELN_AUSGABE:-$HIER/../audit/laeufe}"; mkdir -p "$AUSGABE"
LAEUFE="durchlauf.py durchlauf_inventur.py durchlauf_waage.py durchlauf_foto.py durchlauf_e5.py durchlauf_personal.py regeln.py"
PORT=8810; ERGEBNIS=(); FEHLER=0; START_ALLE=$(date +%s)
for lauf in $LAEUFE; do
  PORT=$((PORT + 1)); name="${lauf%.py}"; log="$AUSGABE/$name.log"; start=$(date +%s)
  if DURCHLAUF_PORT=$PORT DURCHLAUF_OUT="$AUSGABE/$name" E5_OUT="$AUSGABE/$name" REGELN_OUT="$AUSGABE/$name" \
     timeout 900 python3 "tests/$lauf" >"$log" 2>&1; then lage="OK"; else lage="FEHLER (Exit $?)"; FEHLER=$((FEHLER + 1)); fi
  dauer=$(( $(date +%s) - start ))
  ERGEBNIS+=("$(printf '%-24s %-18s %4d s  %s' "$lauf" "$lage" "$dauer" "$log")")
done
echo; echo "Durchläufe GastroCalc $(git rev-parse --short HEAD 2>/dev/null) · $(( $(date +%s) - START_ALLE )) s gesamt"
for z in "${ERGEBNIS[@]}"; do echo "  $z"; done
echo "  Fehlerhafte Läufe: $FEHLER"
exit $(( FEHLER > 0 ))
