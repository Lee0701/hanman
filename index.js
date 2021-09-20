
require('dotenv').config()
const {Telegraf} = require('telegraf')
const {Canvas} = require('canvas')
const Game = require('./hanman')

const NUM_GUESSES = 7
const HANJA_REGEX = /[\u4E00-\u62FF\u6300-\u77FF\u7800-\u8CFF\u8D00-\u9FFF\u3400-\u4DBF]/

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
        const game = new Game(2)
        chats[context.chat.id] = game
        context.replyWithPhoto({source: drawGame(game).toBuffer()}, {caption: getCaption(game)})
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
