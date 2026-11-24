"use client";
import { useEffect, useSyncExternalStore } from "react";
import type { LiveQuote } from "./data/live";

/**
 * Liten klientbutik för livekurser. Komponenter "prenumererar" på symboler och
 * en gemensam loop hämtar alla på en gång var 20:e sekund när fliken är synlig.
 */
export const LIVE_INTERVAL = 20_000;

const quotes = new Map<string, LiveQuote>();
const wanted = new Map<string, number>();
const listeners = new Set<() => void>();
let meta = { lastUpdate: 0, error: false, polling: false };
let timer: ReturnType<typeof setTimeout> | null = null;
let soon: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

async function poll() {
  const syms = [...wanted.keys()];
  if (!syms.length) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  meta = { ...meta, polling: true };
  emit();
  try {
    const res = await fetch(`/api/live?symbols=${syms.map(encodeURIComponent).join(",")}`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { quotes: Record<string, LiveQuote> };
    for (const [k, q] of Object.entries(j.quotes)) {
      const old = quotes.get(k);
      if (!old || old.price !== q.price || old.time !== q.time) quotes.set(k, q);
    }
    meta = { lastUpdate: Date.now(), error: false, polling: false };
  } catch {
    meta = { ...meta, error: true, polling: false };
  }
  emit();
}

function ensureLoop() {
  if (timer || typeof window === "undefined") return;
  const tick = async () => {
    await poll();
    timer = setTimeout(tick, LIVE_INTERVAL);
  };
  timer = setTimeout(tick, 400);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - meta.lastUpdate > LIVE_INTERVAL) void poll();
  });
}

function want(symbol: string) {
  const s = symbol.toUpperCase();
  const isNew = !wanted.has(s);
  wanted.set(s, (wanted.get(s) ?? 0) + 1);
  ensureLoop();
  if (isNew && meta.lastUpdate) {
    if (soon) clearTimeout(soon);
    soon = setTimeout(() => void poll(), 300);
  }
  return () => {
    const n = (wanted.get(s) ?? 1) - 1;
    if (n <= 0) wanted.delete(s);
    else wanted.set(s, n);
  };
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLiveQuote(symbol: string | undefined): LiveQuote | undefined {
  useEffect(() => (symbol ? want(symbol) : undefined), [symbol]);
  return useSyncExternalStore(subscribe, () => (symbol ? quotes.get(symbol.toUpperCase()) : undefined), () => undefined);
}

let metaSnapshot = meta;
export function useLiveMeta() {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (metaSnapshot.lastUpdate !== meta.lastUpdate || metaSnapshot.error !== meta.error || metaSnapshot.polling !== meta.polling) metaSnapshot = meta;
      return metaSnapshot;
    },
    () => metaSnapshot,
  );
}
