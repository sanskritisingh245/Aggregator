import express , {type Request  , type Response} from "express";
import cron from 'node-cron';

import { Token } from "./types/token";
import RedisService from "./redis";
import { broadcast } from "./ws/clientManger";
import { getFinalTokens } from "./Services/tokenService";
import "./ws/socket";

const app=express();
app.use(express.json());

let  latestToken:Token[] =[];

const redis= RedisService.getInstance();

cron.schedule('*/30 * * * * *',async()=>{
    try{ 
        const finalToken= await getFinalTokens();
        latestToken=finalToken;

        broadcast({
            type:"TOKEN_UPDATE",
            data:finalToken
        });

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
            return res.status(200).json({
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