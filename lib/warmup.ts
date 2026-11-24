import { analyzeAll } from "./engine";

setTimeout(() => {
  analyzeAll().catch(() => {});
}, 1500);
