
require('dotenv').config()
const fs = require('fs')
const {Telegraf} = require('telegraf')
const {Canvas} = require('canvas')
const {HanmanGame, isValidWord} = require('./hanman')

const NUM_GUESSES = 7
const HANJA_REGEX = /[\u4E00-\u62FF\u6300-\u77FF\u7800-\u8CFF\u8D00-\u9FFF\u3400-\u4DBF]/

const hanja = fs.readFileSync('./hanja.txt', 'utf8').split('\n')
        .filter((line) => line.trim() && !line.startsWith('#')).map((line) => line.split(':'))
const hanjaWords = hanja.map((entry) => entry[1]).filter((w) => w.length > 1 && !w.match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/))
const hanjaGrades = JSON.parse(fs.readFileSync('./hanja-grades.json', 'utf8'))

const randomWord = (len) => {
    const list = hanjaWords.filter((w) => w.length == len)
    return list[Math.floor(Math.random() * list.length)]
}

const randomWordOfGrade = (len, grade) => {
    const list = hanjaWords.filter((w) => w.length == len)
            .filter((w) => w.split('').every((c) => (hanjaGrades[c] || 0) >= grade))
    return list[Math.floor(Math.random() * list.length)]
}

const bot = new Telegraf(process.env.BOT_TOKEN)
const chats = {}

const drawGame = (game, always=false) => {
    const canvas = new Canvas(1, 1)
    game.draw(canvas, always)
    return canvas
}

const getCaption = (game) => {
    return `(${game.lives}/${NUM_GUESSES})`
}

bot.command('hanman', (context) => {
    if(chats[context.chat.id]) {
        context.reply('漑遊戲中！')
    } else {
        const args = context.message.text.split(/ +/).slice(1)
        const len = parseInt(args[0]) || 2
        const grade = parseInt((args[1] || '0').padEnd(2, '0')) || 0
        if(len >= 2) {
            let word
            do word = randomWordOfGrade(len, grade)
            while(word && !isValidWord(word))
            if(word) {
                const game = new HanmanGame(word)
                chats[context.chat.id] = game
                context.replyWithPhoto({source: drawGame(game).toBuffer()}, {caption: getCaption(game)})
            }
        }
    }
})

bot.on('text', (context) => {
    const text = context.message.text
    const game = chats[context.chat.id]
    if(!game) return
    if(text == game.word) {
        // 正答
        context.replyWithPhoto({source: drawGame(game, true).toBuffer()}, {caption: `成功！(${game.word})`})
        delete chats[context.chat.id]
    } else {
        // 推測
        if(text.length == 1 && text.match(HANJA_REGEX)) {
            if(game.guessed.includes(text)) {
                context.reply('旣推測！')
            } else {
                game.guess(text)
                if(game.word.split('').every((c) => game.guessed.includes(c))) {
                    // 正答
                    context.replyWithPhoto({source: drawGame(game, true).toBuffer()}, {caption: `成功！(${game.word})`})
                    delete chats[context.chat.id]
                } else if(game.lives <= 0) {
                    context.replyWithPhoto({source: drawGame(game, true).toBuffer()}, {caption: `失敗！(${game.word})`})
                    delete chats[context.chat.id]
                } else {
                    context.replyWithPhoto({source: drawGame(game).toBuffer()}, {caption: getCaption(game)})
                }
            }
        }
    }
})

bot.launch()
