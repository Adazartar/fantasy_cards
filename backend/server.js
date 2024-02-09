
const express = require('express')
const io = require('socket.io')(3000, {
    cors: {
        origin: ["http://127.0.0.1:5500"]
    }
})
const fs = require('fs')
const { Console } = require('console')

let lobby_num = 0
const lobbies = []

io.on('connection', (socket) => {
    console.log(socket.id, " has joined");

    socket.on('select-option', (num, player_num, lobby_num) => {
        const lobby = lobbies.find(entry => entry.lobby_num === lobby_num)

        let card = handleCardPlay(player_num, num, lobby)
    
        let power = -1
        if(lobby.player_details[player_num].first === true){
            power = card[0].prime
        }
        else{
            power = card[0].follow
        }
    
        lobby.field.push({
            "card": card[0],
            "player_num": player_num,
            "power": power
        })
    
        for(let i = 0; i < lobby.sockets.length; i++){
            io.to(lobby.sockets[i].id).emit('update-field', lobby.field)
        }
    
        requestPlay(lobby)
    })

    socket.on('create-lobby', (name) => {
        const snapshot_lobby_num = lobby_num
        const lobby = {"sockets": [socket], "names": [name], "lobby_num": snapshot_lobby_num, "in_game": false, "turn_order": [], "player_details": [], "deck": [], "field": []}
        lobby_num += 1
        io.to(lobby.sockets[0].id).emit('send-lobby-details', lobby.lobby_num, 0, lobby.names)
        lobbies.push(lobby)
    })

    socket.on('join-lobby', (name, lobby_num) => {
        const lobby = lobbies.find(entry => entry.lobby_num === Number(lobby_num))
        if(lobby && !lobby.in_game){
            lobby.sockets.push(socket)
            lobby.names.push(name)
            for(let i = 0; i < lobby.sockets.length; i++){
                io.to(lobby.sockets[i].id).emit('send-lobby-details', lobby.lobby_num, i, lobby.names)
            }
        }
        else{
            io.to(socket.id).emit('lobby-not-found')
        } 
    })

    socket.on('start-game', (lobby_num) => {
        const lobby = lobbies.find(entry => entry.lobby_num === Number(lobby_num))
        for(let i = 0; i < lobby.sockets.length; i++){
            io.to(lobby.sockets[i].id).emit('game-starting', lobby.names)
        }
        lobby.in_game = true
        startGame(lobby)
    })
    
    /*
    if(lobby.length > 1){
        const snapshot_lobby_num = lobby_num
        const snapshot_lobby = lobby
        const new_lobby = {"sockets": snapshot_lobby, "lobby_num": snapshot_lobby_num, "turn_order": [], "player_details": [], "deck": [], "field": []}
        lobbies.push(new_lobby)
        lobby = []
        lobby_num += 1

        for(let i = 0; i < new_lobby.sockets.length; i++){
            io.to(new_lobby.sockets[i].id).emit('send-lobby-details', new_lobby.lobby_num, i)
        }
        startGame(new_lobby)
    }
    */

});


//-------------------------------------------------------------------

function shuffle(deck){
    const new_deck = []
    const original_length = deck.length
    for(let i = 0; i < original_length; i++){
        const num = getRandomInt(0, original_length - 1 - i)
        new_deck.push(deck[num])
        deck.splice(num, 1)
    }
    return new_deck
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
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

function startGame(lobby){
    console.log(`lobby ${lobby.lobby_num} starting game...`)
    fs.readFile("cards.json",'utf-8', (err, data) => {
        const deck = JSON.parse(data) 
        lobby.deck = shuffle(deck)

        deal(lobby, 4)

        lobby.player_details[0].first = true

        lobby.turn_order = orderPlayers(lobby.player_details)

        for(let i = 0; i < lobby.player_details.length; i++){
            io.to(lobby.sockets[i].id).emit("cards-sent", lobby.player_details[i].hand)
        }
        
        requestPlay(lobby)
    })
}

function round(lobby){
    lobby.turn_order = orderPlayers(lobby.player_details)
    requestPlay(lobby)
}

function drawCard(player_hand, deck){
    player_hand.push(deck.pop())
}

function draw(player, deck, number_cards){
    for(let i = 0; i < number_cards; i++){
        drawCard(player.hand, deck)
    }
}

function deal(lobby, number_cards){
    
    if(lobby.player_details.length === 0){
        for(let i = 0; i < lobby.sockets.length; i++){
            const player = new Player(i)
            lobby.player_details.push(player)
        }
    }

    for(let i = 0; i < lobby.player_details.length; i++){
        draw(lobby.player_details[i], lobby.deck, number_cards)
    }
}

class Player {
    constructor(player_number) {
      this.player_number = player_number;
      this.hand = [];
      this.cards_won = [];
      this.first = false;
    }
}

function orderPlayers(players){
    let start_player = findFirst(players)    

    const turn_order = [];
    for (let i = 0; i < players.length; i++) {
        const player_number = (start_player + i) % players.length;
        turn_order.push(player_number);
    }
    return turn_order;
}

function requestPlay(lobby){
    // Playing a round
    if(lobby.turn_order.length > 0){
        let player_turn = lobby.turn_order.shift()
        requestCard(player_turn, lobby)
    }
    // All turns for round have been exhausted
    else{
        
        let winner = calculateWinner(lobby.field)

        resolveRound(lobby, winner)

        lobby.field = []

        // More cards to draw
        if(lobby.deck.length > lobby.player_details.length){
            deal(lobby, 1)
            for(let i = 0; i < lobby.player_details.length; i++){
                io.to(lobby.sockets[i].id).emit("cards-sent", lobby.player_details[i].hand)
            }
            round(lobby)
        }
        // No cards left in hand
        else if(lobby.player_details[0].hand.length === 0){
            let scores = calculateScores(lobby.player_details)
            for(let i = 0; i < lobby.player_details.length; i++){
                io.to(lobby.sockets[i].id).emit("send-scores", scores)
            }
        }
        // No more cards to draw
        else{
            for(let i = 0; i < lobby.player_details.length; i++){
                io.to(lobby.sockets[i].id).emit("cards-sent", lobby.player_details[i].hand)
            }
            round(lobby)
        }
    }
}

function requestCard(player_index, lobby) {
    // Send a request to the player to play a card
    io.to(lobby.sockets[player_index].id).emit("request-play");
}

function handleCardPlay(player_index, card_num, lobby){
    return lobby.player_details[player_index].hand.splice(card_num, 1) 
}

function calculateWinner(field){
    const field_string = createFieldString(field)

    for(let i = 0; i < field.length; i++){
        field[i].power += applyScaling(field[i].card.scaling, field_string, field[i].card.colour)
    }

    let highest_power = -999
    let current_winner = -999
    for(let i = 0; i < field.length; i++){
        if(field[i].power > highest_power){
            current_winner = field[i].player_num
            highest_power = field[i].power
        }
        else if(field[i].power === highest_power){
            current_winner = -1
        }
    }
    return current_winner
}

function createFieldString(field){
    let field_string = ''
    for(let i = 0; i < field.length; i++){
        field_string += field[i].card.colour
    }
    return field_string
}

function resolveRound(lobby, winner){
    let field_cards = [].concat(...lobby.field.map(item => item.card))
    if(winner === -1){
        for(let i = 0; i < lobby.sockets.length; i++){
            io.to(lobby.sockets[i].id).emit("draw-round")
        }
    }
    else{
        for(let i = 0; i < lobby.player_details.length; i++){
            if(lobby.player_details[i].player_number === winner){
                lobby.player_details[i].cards_won = lobby.player_details[i].cards_won.concat(field_cards)
                lobby.player_details[findFirst(lobby.player_details)].first = false
                lobby.player_details[i].first = true
                io.to(lobby.sockets[i].id).emit("won-round")
            }
            else{
                io.to(lobby.sockets[i].id).emit("lose-round")
            }
        }
    }
}

function findFirst(players){
    let start_player = -999

    for(let i = 0; i < players.length; i++){
        if(players[i].first === true){
            start_player = players[i].player_number
            break
        }
    }
    return start_player
}

function calculateScores(players){
    let scores = []
    for(let i = 0; i < players.length; i++){
        let final_player = {
            "player": players[i].player_number,
            "score": sumScore(players[i].cards_won)
        }
        scores.push(final_player)
    }
    return scores
}

function sumScore(cards){
    let score = 0
    for(let i = 0; i < cards.length; i++){
        score += cards[i].points
    }
    return score
}

