/**
 * Körs en gång när servern startar. Värmer upp analysen i bakgrunden så att
 * första sidladdningen går snabbare (endast i Node-miljön).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/warmup");
  }
}
