export type TokenSource = "dex" | "jupiter" | "coingecko";

export interface Token {
  address: string;
  name: string;
  symbol: string;
  price: number | null;
  volume24h: number | null;
  marketCap: number | null;
  priceChange24h: number | null;
  liquidity: number | null;
  source: TokenSource;
}

export type SortKey = "volume" | "price" | "marketCap" | "priceChange";
export type SortOrder = "asc" | "desc";

export interface TokensResponse {
  success: boolean;
  count: number;
  limit: number;
  nextCursor: number | null;
  data: Token[];
}

export interface WSMessage {
  type: "TOKEN_UPDATE";
  data: Token[];
}
