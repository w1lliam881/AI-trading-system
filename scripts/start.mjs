// Startar Terminalen och öppnar webbläsaren automatiskt.
// Körs av "Starta Terminalen"-filerna (Mac/Windows) men går också att köra med: node scripts/start.mjs
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const isWin = process.platform === "win32";
const npm = isWin ? "npm.cmd" : "npm";
const URL = "http://localhost:3000";

const [major] = process.versions.node.split(".").map(Number);
if (major < 20) {
  console.log(`\nDin Node.js är version ${process.versions.node}. Terminalen behöver version 20 eller senare.`);
  console.log("Ladda ner LTS-versionen från https://nodejs.org och kör sedan startfilen igen.\n");
  process.exit(1);
}

if (!existsSync(path.join(root, "node_modules", "next"))) {
  console.log("\n▶ Första starten: installerar programdelar (1–3 minuter)…\n");
  const r = spawnSync(npm, ["install"], { stdio: "inherit", shell: isWin });
  if (r.status !== 0) {
    console.log("\n✖ Installationen misslyckades. Kontrollera internetanslutningen och försök igen.\n");
    process.exit(1);
  }
}

console.log("\n▶ Startar Terminalen… webbläsaren öppnas automatiskt om en liten stund.");
console.log("  Stäng det här fönstret (eller tryck Ctrl+C) för att stänga av appen.\n");
const server = spawn(npm, ["run", "dev"], { stdio: "inherit", shell: isWin });
server.on("exit", (code) => process.exit(code ?? 0));

function openBrowser() {
  const cmd = isWin ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = isWin ? ["/c", "start", "", URL] : [URL];
  const p = spawn(cmd, args, { stdio: "ignore", detached: true });
  p.on("error", () => console.log(`Öppna ${URL} i webbläsaren.`));
  p.unref();
}

// Vänta tills servern svarar, värm upp startsidan och öppna sedan webbläsaren.
const started = Date.now();
(async function waitForServer() {
  while (Date.now() - started < 180_000) {
    try {
      const r = await fetch(URL);
      if (r.ok) {
        console.log(`\n✔ Terminalen är igång: ${URL}\n`);
        openBrowser();
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(`\nÖppna ${URL} i webbläsaren manuellt.\n`);
})();

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { server.kill(sig); process.exit(0); });
