
const express = require('express')
const socketio = require('socket.io')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
    res.send('Hello, Node.js!')
    fs.readFile("cards.json",'utf-8', (err, data) => {
        const deck = JSON.parse(data)
        const shuffled_deck = shuffle(deck)
        console.log(shuffled_deck)    
    })
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})

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

console.log(applyScaling(["B+2","C+3","A+8"], "ABBC","C"))