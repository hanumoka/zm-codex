import { APIRequestContext } from "@playwright/test";
import * as http from "node:http";
import { URL } from "node:url";

export interface SSEMessage {
  event: string;
  data: string;
  raw: string;
}

interface CollectOptions {
  timeoutMs: number;
  predicate?: (msg: SSEMessage) => boolean;
  max?: number;
  onReady?: () => void;
}

/**
 * Connect to an SSE endpoint and collect events until `predicate` returns true OR timeout.
 * Uses Node's http module for reliable line-by-line streaming (global fetch can buffer).
 */
export function collectSSE(url: string, options: CollectOptions): Promise<SSEMessage[]> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const collected: SSEMessage[] = [];
    const max = options.max ?? 100;
    let buf = "";
    let readyFired = false;
    let finished = false;

    const finish = (): void => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      req.destroy();
      resolve(collected);
    };

    const timer = setTimeout(finish, options.timeoutMs);

    const debug = process.env.SSE_DEBUG === "1";
    const req = http.request(
      {
        method: "GET",
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        family: 4, // Force IPv4 — localhost may resolve to ::1 on Windows
        headers: { Accept: "text/event-stream", "Cache-Control": "no-cache" },
      },
      (res) => {
        if (debug) console.log(`[SSE] status=${res.statusCode} headers=${JSON.stringify(res.headers)}`);
        if (res.statusCode !== 200) {
          finished = true;
          clearTimeout(timer);
          reject(new Error(`SSE connect failed HTTP ${res.statusCode}`));
          return;
        }
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          if (debug) console.log(`[SSE] chunk (${chunk.length} bytes): ${JSON.stringify(chunk.slice(0, 200))}`);
          if (!readyFired) { readyFired = true; options.onReady?.(); }
          buf += chunk;
          // Normalize CRLF → LF so split on "\n\n" works on Windows too
          const normalized = buf.replace(/\r\n/g, "\n");
          const frames = normalized.split("\n\n");
          buf = frames.pop() ?? "";
          for (const frame of frames) {
            if (!frame.trim()) continue;
            const msg = parseFrame(frame);
            if (debug) console.log(`[SSE] parsed: event=${msg?.event} data_len=${msg?.data.length}`);
            if (!msg) continue;
            collected.push(msg);
            if (options.predicate?.(msg) || collected.length >= max) {
              finish();
              return;
            }
          }
        });
        res.on("end", () => { if (debug) console.log("[SSE] end"); finish(); });
        res.on("error", (e) => { if (debug) console.log(`[SSE] error: ${e.message}`); finish(); });
      }
    );
    req.on("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(err);
    });
    req.end();
  });
}

function parseFrame(frame: string): SSEMessage | null {
  let event = "message";
  let data = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith(":")) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx);
    const value = line.slice(idx + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") data += (data ? "\n" : "") + value;
  }
  return { event, data, raw: frame };
}

/** Unused reference — kept to appease strict tsconfig if someone imports pw request. */
export type _UnusedCtx = APIRequestContext;
