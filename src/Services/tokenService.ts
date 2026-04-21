import { Token } from "../types/token";
import { normaliseDex } from "../utils/Normalise/normaliseDex";
import { normaliseGecko } from "../utils/Normalise/normaliseGecko";
import { normaliseJupiter } from "../utils/Normalise/normaliseJupiter";
import { fetchDataWithRetry } from "../utils/Retry/retryData";

export async function getFinalTokens():Promise<Token[]> {
    try{
        const [dex, jupiter, gecko] = await Promise.allSettled ([
            fetchDataWithRetry('https://api.dexscreener.com/latest/dex/search?q=SOL'),
            fetchDataWithRetry('https://lite-api.jup.ag/tokens/v2/search?query=SOL'),
            fetchDataWithRetry('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd')
        ]);
    
        let storage:  Record<string, Token> ={};
        let normaliseDexData:Token[]=[];
        let normaliseJupiterData:Token[] =[];
        let normaliseGeckoData:Token[]=[];
    
        if(dex.status === "fulfilled" && dex.value != null ){
            const dexData=dex.value;
            normaliseDexData=normaliseDex(dexData);
        }
    
        if(jupiter.status=== "fulfilled" && jupiter.value != null ){
            const jupiterData=jupiter.value;
            normaliseJupiterData=normaliseJupiter(jupiterData);
        }
    
        if(gecko.status ==="fulfilled" && gecko.value != null){
            const geckoData=gecko.value;
            normaliseGeckoData=normaliseGecko(geckoData);
        }
            
    
        normaliseDexData.forEach((token)=>{
            storage[token.address]=token;
        })
    
    
        normaliseJupiterData.forEach((token)=>{
            if(storage[token.address]){
                const existing=storage[token.address]
                if(existing){
                    if(existing.volume24h=== null && token.volume24h != null){
                        existing.volume24h=token.volume24h
                    }
                }
            }else {
                storage[token.address]=token;
            }
        })
    
        const finalToken=Object.values(storage)
        finalToken.forEach((token)=>{
            const geckoMatch=normaliseGeckoData.find(geckoToken =>
                geckoToken.symbol.toLowerCase() ===token.symbol.toLowerCase() && 
                geckoToken.name.toLowerCase() === token.name.toLowerCase()
            )
            if(geckoMatch){
                if(token.marketCap === null){
                    token.marketCap=geckoMatch.marketCap
                }
                if(token.priceChange24h === null){
                    token.priceChange24h = geckoMatch.priceChange24h
                }
                if(token.volume24h === null){
                    token.volume24h = geckoMatch.volume24h
                }
            }
                
        })
        return finalToken;
    }catch (err: any) {
        console.log(err.message);
        return [];
    }
}