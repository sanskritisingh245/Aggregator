import { Token } from "../../types/token"

export function normaliseGecko(geckoData:any[]):Token[]{
    return geckoData.map((coin)=>{
        return {
            address:coin.id,
            name:coin.name,
            symbol:coin.symbol,
            price:coin.current_price,
            volume24h:coin.total_volume,
            marketCap:coin.market_cap,
            priceChange24h:coin.price_change_percentage_24h,
            liquidity:null,
            source:"coingecko" 
        }
    })  
}