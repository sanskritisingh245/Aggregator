import cron from 'node-cron';
import axios from "axios";

cron.schedule('*/30 * * * * *',async()=>{
    try{
        const [dex, jupiter, gecko] = await Promise.all([
            axios.get('https://api.dexscreener.com/latest/dex/tokens/{tokenAddress} or /latest/dex/search?q={query}'),
            axios.get('https://lite-api.jup.ag/tokens/v2/search?query=SOL'),
            axios.get('https://docs.coingecko.com/docs/setting-up-your-api-key')
        ]);
        console.log(dex.data, jupiter.data, gecko.data)

    }catch(err:any){
        console.log(err.message)
    }

})