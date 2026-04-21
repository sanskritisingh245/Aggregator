import { log } from "node:console";
import { WebSocketServer  } from "ws";
import { addClient, removeClient } from "./clientManger";

const wss= new WebSocketServer({port:8080});


wss.on("connection",(ws)=>{
    console.log("Client connected");

    addClient(ws);

    ws.on("close" , ()=>{
        removeClient(ws);
        console.log("Client disconnected")
    });
});