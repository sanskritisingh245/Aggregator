# Aggregator

> A real-time Solana token aggregator. Pulls live market data from DexScreener, Jupiter, and CoinGecko, merges and de-duplicates by token address, caches in Redis, and streams updates to the browser over WebSockets.

---










## Why

Token data is fragmented. DexScreener has DEX trades, Jupiter has Solana liquidity, CoinGecko has market caps and 24h price change — but none of them have everything in one place. This project unifies all three behind a single normalised schema, a single REST endpoint, and a single live WebSocket feed.

## Features

- **Multi-source aggregation** — DexScreener, Jupiter, and CoinGecko fetched in parallel, merged by address.
- **Gap-filling** — fields missing from one source (e.g. `marketCap`, `priceChange24h`) are backfilled from another.
- **Live updates** — broadcasts a fresh snapshot to all WebSocket clients every 30 seconds.
- **REST with sort + pagination** — `GET /tokens?sortBy=&order=&cursor=&limit=`, results cached in Redis for 30s.
- **Resilient fetches** — each upstream call goes through a retry helper; one source failing does not break the others (`Promise.allSettled`).
- **Singleton Redis client** — used both for the latest snapshot and for per-query response caching.
- **React + Tailwind dashboard** — sortable ledger, top-movers rail, and a "RaceTrack" visualisation, all driven by the live socket.

## Architecture

```
┌──────────────┐   every 30s    ┌────────────────────┐
│  cron job    │ ─────────────► │  tokenService      │
└──────────────┘                │  fetch + normalise │
                                │  + merge by address│
                                └─────────┬──────────┘
                                          │
                          ┌───────────────┼────────────────┐
                          ▼               ▼                ▼
                    ┌──────────┐    ┌──────────┐    ┌─────────────┐
                    │  Redis   │    │  REST    │    │  WebSocket  │
                    │  cache   │    │ /tokens  │    │   :8080     │
                    └──────────┘    └──────────┘    └─────────────┘
                                          │                │
                                          ▼                ▼
                                       React frontend (Vite, :5173)
```

Merge strategy:
1. DexScreener tokens are written first (keyed by `address`).
2. Jupiter tokens are merged in — fills `volume24h` if Dex left it null, otherwise inserts as a new token.
3. CoinGecko tokens are matched by `(symbol, name)` and used to backfill `marketCap`, `priceChange24h`, and `volume24h`.

## Tech stack

**Backend** — TypeScript, Express 5, `ws`, `node-cron`, `ioredis`, `axios`
**Frontend** — React 19, Vite, TailwindCSS 4, native `WebSocket`
**Infra** — Redis (local, `127.0.0.1:6379`)

## Project layout

```
.
├── be/src/                     # Express + WS backend
│   ├── index.ts                # HTTP server, cron job, WebSocket server
│   ├── redis.ts                # Singleton ioredis client
│   ├── Services/
│   │   └── tokenService.ts     # fetch + normalise + merge
│   ├── utils/
│   │   ├── Normalise/          # normaliseDex / normaliseJupiter / normaliseGecko
│   │   └── Retry/retryData.ts  # fetchDataWithRetry
│   ├── ws/clientManger.ts      # WS client registry + broadcast
│   └── types/token.ts          # Shared Token interface
└── fe/                         # React + Vite + Tailwind frontend
    ├── src/App.tsx
    ├── src/components/         # Ledger, Movers, RaceTrack, Spotlight, ...
    ├── src/hooks/useLiveSocket.ts
    └── src/lib/{api,format,types}.ts
```

## Getting started

### Prerequisites

- Node.js 20+
- Redis running on `127.0.0.1:6379`
  ```bash
  # macOS
  brew install redis && brew services start redis
  # or via docker
  docker run -p 6379:6379 -d redis:7
  ```

### 1. Backend

```bash
cd be/src
npm install
npm run dev
```

This starts:
- HTTP API on `http://localhost:3000`
- WebSocket server on `ws://localhost:8080`

The cron job kicks off immediately; first broadcast lands within ~30 seconds.

### 2. Frontend

```bash
cd fe
npm install
npm run dev
```

Vite dev server runs on `http://localhost:5173` and proxies `/api/*` to the backend on port 3000. Open the URL — the dashboard subscribes to the WebSocket on connect, then re-renders on every tick.

## API reference

### `GET /tokens`

Returns a sorted, paginated slice of the latest aggregated tokens.

| Query param | Type    | Default  | Notes |
|-------------|---------|----------|-------|
| `sortBy`    | string  | `volume` | `volume`, `price`, `marketCap`, or `priceChange` |
| `order`     | string  | `desc`   | `asc` or `desc` |
| `cursor`    | number  | `0`      | Offset into the sorted list |
| `limit`     | number  | `20`     | Clamped to `[1, 50]` |

**Response**

```json
{
  "success": true,
  "count": 20,
  "limit": 20,
  "nextCursor": 20,
  "data": [
    {
      "address": "...",
      "name": "...",
      "symbol": "...",
      "price": 0,
      "volume24h": 0,
      "marketCap": 0,
      "priceChange24h": 0,
      "liquidity": 0,
      "source": "dex"
    }
  ]
}
```

`nextCursor` is `null` once the end of the list is reached. Each unique query is cached in Redis for 30s.

### WebSocket — `ws://localhost:8080`

On connect, clients are registered with the broadcaster. Every 30 seconds (or whenever the cron tick completes), every connected client receives:

```json
{ "type": "TOKEN_UPDATE", "data": [ /* Token[] */ ] }
```

The frontend hook `useLiveSocket` handles auto-reconnect with a 2-second backoff.

## Token shape

```ts
interface Token {
  address: string;
  name: string;
  symbol: string;
  price: number | null;
  volume24h: number | null;
  marketCap: number | null;
  priceChange24h: number | null;
  liquidity: number | null;
  source: "dex" | "jupiter" | "coingecko";
}
```

Any numeric field may be `null` if no upstream source provided it. The frontend pushes nulls to the bottom when sorting.

