import { WebSocket } from "ws";

let clients:WebSocket[]=[];

export function addClient(ws:WebSocket){
    clients.push(ws);
}

export function removeClient(ws:WebSocket){
    clients=clients.filter((client =>client !== ws));
}

export function broadcast(data:any){
    clients.forEach((client)=>{
        if(client.readyState === client.OPEN ){
            try{
                client.send(JSON.stringify(data));
            }catch(e){
                console.log("Failed to send")
            }
        }
    });
}