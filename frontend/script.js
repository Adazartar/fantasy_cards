
import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"

console.log("hello")

const socket = io("http://localhost:3000");

const body = document.body

const indexHTML = `
    <div>Name: <input type="text" id="name"></div>
    <br>
    <div><button onclick="createGame()">Create Game</button></div>
    <br>
    <div><input type="text" id="lobby_code"><button onclick="joinGame()">Join Game</button></div>
    <br>
    <div id="message_text"></div>
    `

const waitingHTML = `
    <div><h1>Waiting for game to start..</h1></div>
    <div>Lobby number: <a id="lobby_num"></a></div>
    <div id="players_list"></div>
    <br>
    <div><button onclick="startGame()">Start Game</button></div>
    `

const gameHTML = `
    <div id="player_name"></div>
    <div id="board-container"></div>
    <div id="card-container"></div>
    <div id="round-status"></div>
    <div id="final-scores"></div>
`

let lobby_num = -1
let player_num = -1
let hand_cards = []
let field_cards = []

socket.on("connect", () => {
    console.log(`Connected to server with id: ${socket.id}`);
});

socket.on("send-lobby-details", (num_l, num_p, names) => {
    console.log("recieved lobby details")
    body.innerHTML = waitingHTML
    lobby_num = num_l
    player_num = num_p

    const lobby_num_text = document.getElementById('lobby_num')
    lobby_num_text.innerHTML = num_l

    const players_list = document.getElementById('players_list')
    names.forEach((name) => {
        players_list.innerHTML += `${name}<br>`
    })
    
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

socket.on("send-scores", (scores) => {
    const final_scores = document.getElementById('final-scores')
    for(let i = 0; i < scores.length; i++){
        final_scores.innerHTML += `Player ${scores[i].player}: ${scores[i].score}<br>`
    }
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

window.createGame = function(){
    const name = getName()
    if (name && name.length < 20){
        socket.emit("create-lobby", name)
    }
    else{
        const message_text = document.getElementById("message_text")
        message_text.innerHTML = "Invalid Name"
    }
}

window.joinGame = function(){
    const name = getName()
    if (name && name.length < 20){
        const lobby_code = document.getElementById("lobby_code").value
        socket.emit("join-lobby", name, lobby_code)
    }
    else{
        const message_text = document.getElementById("message_text")
        message_text.innerHTML += "Invalid Name<br>"
    }
}

window.startGame = function(){
    socket.emit("start-game", lobby_num)
}

socket.on("lobby-not-found", () => {
    const message_text = document.getElementById("message_text")
    message_text.innerHTML += "Lobby Not Found<br>"
})

socket.on("game-starting", (names) => {
    body.innerHTML = gameHTML
    const player_name = document.getElementById('player_name')
    player_name.innerHTML = `${names[player_num]}`
})

function getName(){
    return document.getElementById("name").value
}
