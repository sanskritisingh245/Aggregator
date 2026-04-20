import express , {type Request  , type Response} from "express";
import cron from 'node-cron';
import axios from "axios";

import { Token } from "./types/token";
import RedisService from "./redis";


const app=express();
app.use(express.json());

let  latestToken:Token[] =[];
const max_attempt=5;

const sleep = (delay: number) => {
    return new Promise((resolve)=> {
        setTimeout(()=> {resolve(0)}, delay)
    })
}

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
            const time = 1000 * (2 ** (attempt-1));
            await sleep(time);
        } 
    }
    return null 
}

function normaliseDex(dexData: { pairs: any[] }):Token[]{
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

function normaliseJupiter(jupiterData:any[]):Token[]{
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

function normaliseGecko(geckoData:any[]):Token[]{
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

const redis= RedisService.getInstance();
cron.schedule('*/30 * * * * *',async()=>{
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
        latestToken=finalToken;
        await redis.setTokens(finalToken);
        console.log(finalToken);

    }catch(err:any){
        console.log(err.message)
    }
})

app.get("/tokens",async  (req:Request ,res:Response)=>{
    try{
        let  limit=req.query.limit as string || undefined;
        if(limit === undefined){
           limit="20";
        }
        let ParsedLimit=parseInt(limit);
        if( isNaN(ParsedLimit) || ParsedLimit <=0  ){
            ParsedLimit= 20;
        }

        if(ParsedLimit >50){
            ParsedLimit=50;
        }
        

        let raw_cursor= req.query.cursor as string || undefined;
        if(raw_cursor === undefined){
            raw_cursor="0";
        }
        let cursor= parseInt(raw_cursor);

        if(isNaN(cursor) || cursor <0){
            cursor=0;
        }

        let order = req.query.order;
        if(!order || (order != "asc" && order!= "desc") ){
            order="desc"
        }
        let sortedField;
        const allowedSorts =["volume", "price", "marketCap", "priceChange"]
        let mapData={
            volume:"volume24h",
            price:"price",
            marketCap:"marketCap",
            priceChange:"priceChange24h"
        }
        let sort_By =req.query.sortBy as keyof typeof mapData;
        if(!sort_By || !allowedSorts.includes(sort_By)){
            sort_By="volume"
        }
        
        let cacheKey=`tokens:sort=${sort_By}:order=${order}:cursor=${cursor}:limit=${ParsedLimit}`;
        const cachedData= await redis.get(cacheKey);
        if(cachedData){
            return res.status(200).json(JSON.parse(cachedData))
        }

        let sortField=mapData[sort_By] as keyof Token;
        let sortToken=[...latestToken]
        sortedField=sortToken.sort((tokenA, tokenB)=>{
            let valueA=tokenA[sortField] as number;
            let valueB=tokenB[sortField] as number;
            if(valueA === null && valueB === null){
                return 0;
            }
            if(valueA === null || valueA === undefined ){
                return 1;
            }
            if(valueB === null || valueB === undefined){
                return -1;
            }
            if(order === "asc"){
                return valueA-valueB;
            }else{
                return valueB - valueA;
            }

        })

        if(cursor >= sortedField.length){
            return res.send({
                success:true,
                count:0,
                data:[],
                nextCursor:null
            })
        }

        let limitedArray= sortedField.slice(cursor, cursor+ParsedLimit);
        let nextCursor:number | null  = cursor + ParsedLimit ;
        if(nextCursor >= sortedField.length){
            nextCursor=null;
        }
        
        const count= limitedArray.length
        const response ={
            success:true,
            count:count,
            limit:ParsedLimit,
            nextCursor:nextCursor,
            data:limitedArray
        }
        await redis.set(cacheKey, JSON.stringify(response), 30);
        return res.status(200).json(response)

    }catch(e:any){
        return res.status(500).json({
            success:false,
            msg:e.message ||"Internal server error"
        })
    }
})
app.listen(3000, ()=>{
    console.log("running on port 3000");
})