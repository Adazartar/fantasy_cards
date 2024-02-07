
import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"

console.log("hello")

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log(`Connected to server with id: ${socket.id}`);
});

socket.on("cards-sent", cards => {
    console.log(cards)
})
