
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
    let new_deck = []
    const original_length = deck.length
    for(let i = 0; i < original_length; i++){
        let num = getRandomInt(0, original_length - 1 - i)
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

