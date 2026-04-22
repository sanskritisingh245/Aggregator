import axios from "axios";

const max_attempt=5;

const sleep = (delay: number) => {
    return new Promise((resolve)=> {
        setTimeout(()=> {resolve(0)}, delay)
    })
}

export async function fetchDataWithRetry(url: string){
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