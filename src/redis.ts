import Redis from "ioredis";
const redis= new Redis();
export default redis;

//creating a global redis so that it can be used everywhere in the code 