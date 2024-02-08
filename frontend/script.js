
import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"

console.log("hello")

const socket = io("http://localhost:3000");

let lobby_num = -1
let player_num = -1

socket.on("connect", () => {
    console.log(`Connected to server with id: ${socket.id}`);
});

socket.on("send-lobby-details", (num_l, num_p) => {
    lobby_num = num_l
    player_num = num_p
})

socket.on("cards-sent", cards => {
    console.log(cards)
})

socket.on("request-play", () => {
    buttonsToggle("on");
    console.log("awaiting button press");
});

socket.on("update-field", (field) => {
    console.log(field)
})

function buttonsToggle(option) {
    const buttons = document.querySelectorAll('.card button');
    buttons.forEach(button => {
        if (option === "on") {
            button.style.display = "block";
        } else {
            button.style.display = "none";
            button.onclick = null; // Remove any click event listener
        }
    });
}

window.buttonPress = function(num){
    socket.emit("select-option", num, player_num, lobby_num);
    console.log("selected option: ", num)
    buttonsToggle("off"); // Disable buttons after one is clicked
}
