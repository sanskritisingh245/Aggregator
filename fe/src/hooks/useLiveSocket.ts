import { useEffect, useRef, useState } from "react";
import type { Token, WSMessage } from "../lib/types";

const WS_URL = "ws://localhost:8080";

export type ConnectionState = "connecting" | "open" | "closed";

export function useLiveSocket(onTokens: (tokens: Token[]) => void) {
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const handlerRef = useRef(onTokens);

  useEffect(() => {
    handlerRef.current = onTokens;
  }, [onTokens]);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let retryTimer: number | null = null;

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      ws = new WebSocket(WS_URL);
      ws.onopen = () => setStatus("open");
      ws.onclose = () => {
        setStatus("closed");
        retryTimer = window.setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as WSMessage;
          if (msg.type === "TOKEN_UPDATE" && Array.isArray(msg.data)) {
            handlerRef.current(msg.data);
            setLastTickAt(Date.now());
          }
        } catch {
          /* ignore malformed frames */
        }
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return { status, lastTickAt };
}
