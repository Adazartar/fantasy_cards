
const express = require('express')
const io = require('socket.io')(3000, {
    cors: {
        origin: ["http://127.0.0.1:5500"]
    }
})
const fs = require('fs')
const { Console } = require('console')

const connected = []
io.on('connection', (socket) => {
    console.log(socket.id, " has joined");
    connected.push(socket)
    if(connected.length > 1){
        playGame(2, connected)
    }
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

function printHands(players){
    for(let i = 0; i < players.length; i++){
        console.log(players[i].hand)
    }
}

function playGame(num_players, sockets){
    console.log("starting game...")
    fs.readFile("cards.json",'utf-8', (err, data) => {
        const deck = JSON.parse(data) 
        const shuffled_deck = shuffle(deck)
        const players = []

        deal(players, 4, shuffled_deck, num_players, sockets)

        players[0].first = true

        
        while(players[0].hand.length > 0){
            //printHands(players)

            let turn_order = orderPlayers(players)
            let field = []
            requestPlay(players, turn_order, field)

            //console.log("Before field:::")
            //console.log(field)

            let winner = calculateWinner(field)

            //console.log("After field:::")
            //console.log(field)

            //console.log("Winner:" + winner)

            resolveRound(players, winner, field)

            if(shuffled_deck.length > num_players){
                deal(players, 1, shuffled_deck, num_players)
            }
        }

        let final_scores = calculateScores(players)
        //console.log(final_scores)
    })
}

function drawCard(player_hand, deck){
    player_hand.push(deck.pop())
}

function draw(player, deck, number_cards){
    for(let i = 0; i < number_cards; i++){
        drawCard(player.hand, deck)
    }
}

function deal(players, number_cards, shuffled_deck, num_players, sockets){
    
    if(players.length === 0){
        for(let i = 0; i < num_players; i++){
            const player = new Player(i, sockets[i])
            players.push(player)
        }
    }

    for(let i = 0; i < players.length; i++){
        draw(players[i], shuffled_deck, number_cards)
        io.to(players[i].socket.id).emit("cards-sent", players[i].hand)
    }
}

class Player {
    constructor(player_number, socket) {
      this.player_number = player_number;
      this.hand = [];
      this.cards_won = [];
      this.first = false;
      this.socket = socket
    }
}

function orderPlayers(players){
    let start_player = findFirst(players)    

    const turnOrder = [];
    for (let i = 0; i < players.length; i++) {
        const player_number = (start_player + i) % players.length;
        turnOrder.push(player_number);
    }
    return turnOrder;
}

function requestPlay(players, turn_order, field){
    for(let i = 0; i < players.length; i++){
        let player_turn = turn_order.shift()
        let current_player = players.find(player => player.player_number === player_turn)
        let player_index = players.indexOf(current_player)

        let card_num = requestCard(players, player_index)
        let card = handleCardPlay(players, player_index, card_num)

        let power = -1
        if(current_player.first === true){
            power = card[0].prime
        }
        else{
            power = card[0].follow
        }

        field.push({
            "card": card[0],
            "player_num": player_index,
            "power": power
        })
    }
}


function requestCard(players, player_index){
    return 0
}

function handleCardPlay(players, player_index, card_num){
    return players[player_index].hand.splice(card_num, 1) 
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

function resolveRound(players, winner, field){
    let field_cards = [].concat(...field.map(item => item.card))

    for(let i = 0; i < players.length; i++){
        if(players[i].player_number === winner){
            players[i].cards_won = players[i].cards_won.concat(field_cards)
            players[findFirst(players)].first = false
            players[i].first = true
            break
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

