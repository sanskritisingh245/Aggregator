import expres from "express";
import cron from 'node-cron';
import axios from "axios";

import { Token } from "./types/token";
import { symbol } from "zod";


const sleep = (delay: number) => {
    return new Promise((resolve)=> {
        setTimeout(()=> {resolve(0)}, delay)
    })
}


const max_attempt=5;
async function fetchDataWithRetry(url: string){
    let attempt=0;
    while(attempt < max_attempt){
        try{
            const response= await axios.get(url)
            return response.data;
        }catch(err:any){
            attempt++;
            if(err.response){
                if(err.response.status >= 400 &&  err.response.status <500 ){
                   return null 
                }  
            }
            if(attempt >= max_attempt) {
                return null
            }
            const time = 1000 * (2 ** attempt-1);
            await sleep(time);
        } 
    }
    return null 
}
cron.schedule('*/30 * * * * *',async()=>{
    try{
        const [dex, jupiter, gecko] = await Promise.allSettled ([
            fetchDataWithRetry('https://api.dexscreener.com/latest/dex/tokens/{tokenAddress} or /latest/dex/search?q={query}'),
            fetchDataWithRetry('https://lite-api.jup.ag/tokens/v2/search?query=SOL'),
            fetchDataWithRetry('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd or https://api.coingecko.com/api/v3/coins/solana')
        ]);

        const validresponse=[];


        if(dex.status === "fulfilled" && dex.value != null ){
            const dexData=dex.value;
            normaliseDex(dexData)
        }

        if(jupiter.status=== "fulfilled" && jupiter.value != null ){
            const jupiterData=jupiter.value;
            normaliseJupiter(jupiterData)
        }

        if(gecko.status ==="fulfilled" && gecko.value != null){
            const geckoData=gecko.value;
            normaliseGecko(geckoData)
        }


    }catch(err:any){
        console.log(err.message)
    }
})

function normaliseDex(dexData):Token[]{
    //let tokens=[];
    return dexData.pairs.map((pair)=>{
        return {
            address:pair.baseToken.address,
            name:pair.baseToken.name,
            symbol:pair.baseToken.symbol,
            price:pair.priceUsd,
            volume24h:pair.volume.h24,
            marketCap:null,
            priceChange24h:null,
            liquidity:pair.liquidity.usd,
            source:"dex"    
        }
    }) 
}

function normaliseJupiter(jupiterData):Token[]{
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

function normaliseGecko(geckoData):Token[]{
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