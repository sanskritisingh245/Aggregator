import { Token } from "../../types/token"

export function normaliseDex(dexData: { pairs: any[] }):Token[]{
    //let tokens=[];
    return dexData.pairs.map((pair)=>{
        return {
            address:pair.baseToken.address,
            name:pair.baseToken.name,
            symbol:pair.baseToken.symbol,
            price:pair.priceUsd || null,
            volume24h:pair.volume?.h24 || null,
            marketCap:null,
            priceChange24h:null,
            liquidity:pair.liquidity?.usd || null,
            source:"dex"    
        }
    }) 
}
