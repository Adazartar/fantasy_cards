
import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"

console.log("hello")

const socket = io("http://localhost:3000");

let lobby_num = -1
let player_num = -1
let current_cards = []

socket.on("connect", () => {
    console.log(`Connected to server with id: ${socket.id}`);
});

socket.on("send-lobby-details", (num_l, num_p) => {
    lobby_num = num_l
    player_num = num_p
})

socket.on("cards-sent", cards => {
    const cardContainer = document.getElementById('card-container')
    cardContainer.innerHTML = ''

    for(let i = 0; i < cards.length; i++) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.id = `card${i}`;

        const cardText = document.createElement('div')
        cardText.innerHTML = `
        ${cards[i].name}<br>
        ${cards[i].colour}<br>
        Prime: ${cards[i].prime}<br>
        Follow: ${cards[i].follow}<br>
        Scaling: ${cards[i].scaling}<br>
        Points: ${cards[i].points}<br>
        `
        const button = document.createElement('button');
        button.textContent = `card ${i}`;
        button.onclick = () => buttonPress(i);

        cardDiv.appendChild(button);
        cardDiv.appendChild(cardText);
        cardContainer.appendChild(cardDiv);
    }
})

socket.on("request-play", () => {
    buttonsToggle("on");
    console.log("awaiting button press");
});

socket.on("update-field", (field) => {
    console.log(field)
    const cardContainer = document.getElementById('board-container')
    cardContainer.innerHTML = ''

    for(let i = 0; i < field.length; i++) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');

        const cardText = document.createElement('div')
        cardText.innerHTML = `
        ${field[i].card.name}<br>
        ${field[i].card.colour}<br>
        Prime: ${field[i].card.prime}<br>
        Follow: ${field[i].card.follow}<br>
        Scaling: ${field[i].card.scaling}<br>
        Points: ${field[i].card.points}<br>
        `
        cardDiv.appendChild(cardText);
        cardContainer.appendChild(cardDiv);
    }
})

socket.on("won-round", () => {
    const round_status = document.getElementById('round-status')
    round_status.innerHTML = 'You have won round'

    setTimeout(() => {
        round_status.innerHTML = '';
        const cardContainer = document.getElementById('board-container')
        cardContainer.innerHTML = ''
    }, 3000);
})

socket.on("lose-round", () => {
    const round_status = document.getElementById('round-status')
    round_status.innerHTML = 'You have lost round'

    setTimeout(() => {
        round_status.innerHTML = '';
        const cardContainer = document.getElementById('board-container')
        cardContainer.innerHTML = ''
    }, 3000);
})

socket.on("draw-round", () => {
    const round_status = document.getElementById('round-status')
    round_status.innerHTML = 'Round was a draw'

    setTimeout(() => {
        round_status.innerHTML = '';
        const cardContainer = document.getElementById('board-container')
        cardContainer.innerHTML = ''
    }, 3000);
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
    const cardDiv = document.getElementById(`card${num}`)
    const parent = cardDiv.parentNode
    parent.removeChild(cardDiv)
    console.log("selected option: ", num)
    buttonsToggle("off"); // Disable buttons after one is clicked
}
