#!/bin/bash
# Körs automatiskt varje gång din Codespace öppnas:
# hämtar senaste versionen, installerar och startar appen.
cd "$(dirname "$0")/.."
echo ""
echo "▶ Hämtar senaste versionen av Terminalen…"
git checkout -- package-lock.json 2>/dev/null
git pull --ff-only 2>/dev/null || echo "  (kunde inte uppdatera – startar nuvarande version)"
echo "▶ Installerar…"
npm install --no-audit --no-fund --loglevel=error
echo ""
echo "▶ Startar! Öppna fliken PORTS nedan och klicka på jordgloben vid 3000."
echo ""
npm run dev
