@echo off
chcp 65001 >nul
REM Dubbelklicka på den här filen för att starta Terminalen i Windows.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js saknas. Webbsidan for nedladdning oppnas nu.
  echo Installera 'LTS'-versionen och dubbelklicka sedan pa den har filen igen.
  start "" "https://nodejs.org/sv/download"
  pause
  exit /b 1
)
node scripts\start.mjs
pause
