
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
    hand_cards = Array.from(cards)
    const cardContainer = document.getElementById('card-container')
    cardContainer.innerHTML = ''

    for(let i = 0; i < cards.length; i++) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.classList.add('hand_card');
        cardDiv.id = `hand_card${i}`;

        const cardText = document.createElement('div')
        cardText.innerHTML = `
        ${cards[i].name}<br>
        ${cards[i].colour}<br>
        Prime: ${cards[i].prime}<br>
        Follow: ${cards[i].follow}<br>
        Scaling: ${cards[i].scaling}<br>
        Points: ${cards[i].points}<br><br>
        Current Power: <div class="card_pow">${handPowCalc(i)}<div>
        `
        const button = document.createElement('button');
        button.textContent = `card ${i}`;
        button.onclick = () => buttonPress(i);

        cardDiv.appendChild(button);
        cardDiv.appendChild(cardText);
        cardContainer.appendChild(cardDiv);
    }
    addCardHover()
})

socket.on("request-play", () => {
    buttonsToggle("on");
    console.log("awaiting button press");
});

socket.on("update-field", (field) => {
    field_cards = Array.from(field)
    updateHandCards()
    const cardContainer = document.getElementById('board-container')
    cardContainer.innerHTML = ''

    for(let i = 0; i < field.length; i++) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add(`card`);
        cardDiv.classList.add(`board_card`);
        cardDiv.id = `board_card${i}`

        const cardText = document.createElement('div')
        cardText.innerHTML = `
        ${field[i].card.name}<br>
        ${field[i].card.colour}<br>
        Prime: ${field[i].card.prime}<br>
        Follow: ${field[i].card.follow}<br>
        Scaling: ${field[i].card.scaling}<br>
        Points: ${field[i].card.points}<br><br>
        Current Power: <div class="card_pow">${boardPowCalc(i, field_cards)}<div>
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
        field_cards = Array.from([])
        updateHandCards()
    }, 3000);
})

socket.on("lose-round", () => {
    const round_status = document.getElementById('round-status')
    round_status.innerHTML = 'You have lost round'

    setTimeout(() => {
        round_status.innerHTML = '';
        const cardContainer = document.getElementById('board-container')
        cardContainer.innerHTML = ''
        field_cards = Array.from([])
        updateHandCards()
    }, 3000);
})

socket.on("draw-round", () => {
    const round_status = document.getElementById('round-status')
    round_status.innerHTML = 'Round was a draw'

    setTimeout(() => {
        round_status.innerHTML = '';
        const cardContainer = document.getElementById('board-container')
        cardContainer.innerHTML = ''
        field_cards = Array.from([])
        updateHandCards()
    }, 3000);
})

socket.on("send-scores", (scores, names) => {
    const final_scores = document.getElementById('final-scores')
    for(let i = 0; i < scores.length; i++){
        final_scores.innerHTML += `${names[i]}: ${scores[i].score}<br>`
    }
    final_scores.innerHTML += `<br><button onclick="exitGame()">Exit Game</button>`
    player_num = -1
    lobby_num = -1
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
    const cardDiv = document.getElementById(`hand_card${num}`)
    const parent = cardDiv.parentNode
    parent.removeChild(cardDiv)
    console.log("selected option: ", num)
    buttonsToggle("off"); // Disable buttons after one is clicked
    updateHandCards()
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

window.exitGame = function(){
    body.innerHTML = indexHTML
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

socket.on('end-game-early', () => {
    body.innerHTML = indexHTML
    player_num = -1
    lobby_num = -1
})

function getName(){
    return document.getElementById("name").value
}

function handPowCalc(card_num){
    if(field_cards.length == 0){
        return hand_cards[card_num].prime
    }
    else{
        return hand_cards[card_num].follow
    }
}

function boardPowCalc(card_num, field_cards){
    const field_string = createFieldString(field_cards)
    let pow = -1

    if(card_num == 0){
        pow = field_cards[card_num].card.prime
    }
    else{
        pow = field_cards[card_num].card.follow
    }

    pow += applyScaling(field_cards[card_num].card.scaling, field_string, field_cards[card_num].card.colour)
    return pow
    
}

function applyScaling(scaling, field_string, card_colour){
    const field = removeFromField(field_string, card_colour)
    let power_incr = 0
    for(let i = 0; i < scaling.length; i++){
        const match = scaling[i].match(/([A-Za-z])([+-]?\d+)/);
        const colour = match[1]
        const number = parseInt(match[2], 10)
        power_incr += number*countOccurrences(field, colour)
    }
    return power_incr
}

function removeFromField(field_string, card_colour){
    let new_field_string = field_string.split('')
    for(let i = 0; i < card_colour.length; i++){
        const index = new_field_string.indexOf(card_colour[i])
        new_field_string.splice(index, 1)
    }
    return new_field_string
}

function countOccurrences(str, letter) {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === letter) {
            count++;
        }
    }
    return count;
}

function createFieldString(field){
    let field_string = ''
    for(let i = 0; i < field.length; i++){
        field_string += field[i].card.colour
    }
    return field_string
}


function addCardHover(){
    const hand_cards_elems = document.querySelectorAll('.hand_card');

    hand_cards_elems.forEach(hand_card_elem => {
        hand_card_elem.addEventListener('mouseenter', () => {
            const cardIndex = parseInt(hand_card_elem.id.replace('hand_card', ''), 10);
            const obj = {"card": hand_cards[cardIndex]}
            const test_field_cards = Array.from(field_cards)
            test_field_cards.push(obj)
            updateBoardCards(test_field_cards)
            const card_pow_text = hand_card_elem.getElementsByClassName('card_pow')[0]
            const field_string = createFieldString(test_field_cards)
            card_pow_text.innerHTML = `${handPowCalc(cardIndex) + applyScaling(hand_cards[cardIndex].scaling, field_string, hand_cards[cardIndex].colour)}`
        });

        hand_card_elem.addEventListener('mouseleave', () => {
            const cardIndex = parseInt(hand_card_elem.id.replace('hand_card', ''), 10);
            const card_pow_text = hand_card_elem.getElementsByClassName('card_pow')[0]
            card_pow_text.innerHTML = `${handPowCalc(cardIndex)}`
            updateBoardCards(field_cards)
        });
    });
}

function updateBoardCards(field_cards){
    const board_cards_elems = document.querySelectorAll('.board_card')
    board_cards_elems.forEach(board_card_elem => {
        const card_pow_text = board_card_elem.getElementsByClassName('card_pow')[0]
        const cardIndex = parseInt(board_card_elem.id.replace('board_card', ''), 10);
        card_pow_text.innerHTML = `${boardPowCalc(cardIndex, field_cards)}`
    })
}

function updateHandCards(){
    const hand_cards_elems = document.querySelectorAll('.hand_card')
    hand_cards_elems.forEach(hand_card_elem => {
        const card_pow_text = hand_card_elem.getElementsByClassName('card_pow')[0]
        const cardIndex = parseInt(hand_card_elem.id.replace('hand_card', ''), 10);
        card_pow_text.innerHTML = `${handPowCalc(cardIndex)}`
    })
}