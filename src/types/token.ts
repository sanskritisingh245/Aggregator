export interface Token {
    address:string,
    name:string,
    symbol:string,
    price:number | null,
    volume24h:number | null,
    marketCap:number | null,
    priceChange24h:number | null,
    liquidity:number | null,
    source: "dex" | "jupiter" |"coingecko"
}