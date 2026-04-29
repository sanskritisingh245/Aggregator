import type { SortKey, SortOrder, TokensResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function fetchTokens(params: {
  sortBy: SortKey;
  order: SortOrder;
  cursor: number;
  limit: number;
}): Promise<TokensResponse> {
  const qs = new URLSearchParams({
    sortBy: params.sortBy,
    order: params.order,
    cursor: String(params.cursor),
    limit: String(params.limit),
  });
  const res = await fetch(`${API_BASE}/tokens?${qs.toString()}`);
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return (await res.json()) as TokensResponse;
}
