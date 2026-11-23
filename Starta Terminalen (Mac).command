#!/bin/bash
# Dubbelklicka på den här filen för att starta Terminalen på en Mac.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Node.js saknas. Webbsidan för nedladdning öppnas nu."
  echo "Installera 'LTS'-versionen och dubbelklicka sedan på den här filen igen."
  open "https://nodejs.org/sv/download"
  read -n 1 -s -r -p "Tryck på valfri tangent för att stänga…"
  exit 1
fi
node scripts/start.mjs
