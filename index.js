
require('dotenv').config()
const {Telegraf} = require('telegraf')
const {Canvas} = require('canvas')
const Game = require('./hanman')

const NUM_GUESSES = 7

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
        context.reply('漑遊戲中')
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
        context.replyWithPhoto({source: drawGame(game, true).toBuffer()}, {caption: '成功！'})
        delete chats[context.chat.id]
    } else {
        // 推測
        if(text.length == 1) {
            if(game.guessed.includes(text)) {
                context.reply('旣推測！')
            } else {
                game.guess(text)
                if(game.lives <= 0) {
                    context.replyWithPhoto({source: drawGame(game, true).toBuffer()}, {caption: '失敗！'})
                    delete chats[context.chat.id]
                } else {
                    context.replyWithPhoto({source: drawGame(game).toBuffer()}, {caption: getCaption(game)})
                }
            }
        }
    }
})

bot.launch()
