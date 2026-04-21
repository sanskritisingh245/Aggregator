import { Token } from "../../types/token"

export function normaliseJupiter(jupiterData:any[]):Token[]{
    return jupiterData.map((token)=>{
        return {
            address:token.address,
            name:token.name,
            symbol:token.symbol,
            price:null,
            volume24h:token.daily_volume || null,
            marketCap:null,
            priceChange24h:null,
            liquidity:null,
            source:"jupiter"   

        }
    })
}