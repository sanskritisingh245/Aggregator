import Redis from "ioredis";


class RedisService{
    private static instance:RedisService;
    private client:Redis;

    private constructor(){
        this.client=new Redis({
            host: "127.0.0.1",
            port:6379,
        });
        console.log("redis connected once")
    }

    static getInstance():RedisService {
        if(!RedisService.instance){
            RedisService.instance=new RedisService();
        }
        return RedisService.instance;
    }
    //pagination
    async set(key:string , value:string, ttl?: number){
        if(ttl){
            await this.client.set(key, value, "EX", ttl)
        }else{
            await this.client.set(key, value);
        }
    }

    async get(key:string){
        return await this.client.get(key)
    }

    //tokenStorage

    async setTokens(token:any[]){
        await this.client.set("latestTokens",JSON.stringify(token));
    }
    async getTokens(){
        const data= await this.client.get("latestTokens");
        return JSON.parse(data || "[]");
    }
}

export default RedisService;


//creating a global redis so that it can be used everywhere in the code 

// class based redis . aur singleton . 

