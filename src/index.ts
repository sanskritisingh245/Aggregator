import expres from "express";
import cron from 'node-cron';
import axios from "axios";
import { resolve } from "node:dns";


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
                if(err.response.status >= 400 &&  err.response.status <=500 ){
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
            fetchDataWithRetry('https://docs.coingecko.com/docs/setting-up-your-api-key')
        ]);

    }catch(err:any){
        console.log(err.message)
    }

})


