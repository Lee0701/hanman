
const fs = require('fs')

const {parse} = require('svg-parser')
require('canvas-5-polyfill')

const CHAR_WIDTH = 109
const CHAR_HEIGHT = 109

const hanja = fs.readFileSync('./hanja.txt', 'utf8').split('\n')
        .filter((line) => line.trim() && !line.startsWith('#')).map((line) => line.split(':'))
const hanjaWords = hanja.map((entry) => entry[1]).filter((w) => w.length > 1 && !w.match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/))

const charId = (char) => char.charCodeAt(0).toString(16).padStart(5, '0')
const svgPath = (char) => `./kanji/${charId(char)}.svg`

const randomWord = (len) => {
    const list = hanjaWords.filter((w) => w.length == len)
    return list[Math.floor(Math.random() * list.length)]
}

const isValidWord = (word) => word.split('').every((c) => fs.existsSync(svgPath(c)))

const loadChar = (char) => {
    const fileId = svgPath(char)
    const svg = parse(fs.readFileSync(fileId, 'utf8'))
    const strokePaths = svg.children[0].children.find((e) => e.properties.id.startsWith('kvg:StrokePaths'))
    return strokePaths
}

const drawPath = (ctx, tag, ids, draw=false) => {
    const {id, d} = tag.properties
    const newDraw = draw || ids.includes(id)
    if(tag.children) tag.children.forEach((c) => drawPath(ctx, c, ids, newDraw))
    if(d &&　newDraw) {
        const path = new Path2D(d)
        ctx.stroke(path)
    }
}

const getGroups = (tag) => {
    const id = tag.properties.id
    const original = tag.properties['kvg:original']
    const element = tag.properties['kvg:element']
    const current = []
    if(original) current.push([original, id])
    if(element) current.push([element, id])
    return [...current, ...(tag.children || []).flatMap((c) => getGroups(c))]
}

const getStrokes = (tag) => {
    const {id, d} = tag.properties
    const current = []
    if(d) current.push(id)
    return [...current, ...(tag.children || []).flatMap((c) => getStrokes(c))]
}

const getRoot = (tag) => {
    return tag.children[0].properties['kvg:element']
}

class HanmanGame {
    constructor(query, difficulty, lives=7) {
        if(typeof query == 'string') this.word = query
        else if(typeof query == 'number') {
            do this.word = randomWord(query)
            while(!isValidWord(this.word))
        } else {
            do this.word = randomWord(Math.floor(Math.random() * 4) + 2)
            while(!isValidWord(this.word))
        }
        if(!isValidWord(this.word)) throw new Error('Invalid word')
        if(typeof difficulty == 'number') {
            if(difficulty >= 1) this.strokeCount = difficulty
            else this.strokeRatio = difficulty
        } else  if(typeof difficulty == 'string') {
            // TODO: difficulty selection
            this.strokeRatio = 0.1
        } else {
            this.strokeRatio = 0.5
        }
        const chars = this.word.split('')
        this.paths = chars.map((c) => loadChar(c))
        this.groups = this.paths.flatMap((path) => getGroups(path))
        const allStrokes = this.paths.map((path) => getStrokes(path))
        this.strokes = allStrokes.flatMap((strokes) => {
            const randomStrokes = []
            const count = this.strokeCount || Math.floor(this.strokeRatio * strokes.length)
            new Array(count).fill().forEach(() => {
                if(randomStrokes.length == strokes.length) return
                let stroke
                do stroke = strokes[Math.floor(Math.random() * strokes.length)]
                while(randomStrokes.includes(stroke))
                randomStrokes.push(stroke)
            })
            return randomStrokes
        })
        this.guessed = []
        this.lives = lives
    }
    draw(canvas, always=false) {
        canvas.width = this.word.length * CHAR_WIDTH
        canvas.height = CHAR_HEIGHT
        const ctx = canvas.getContext('2d')
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 5
        this.paths.forEach((path, i) => {
            ctx.save()
            ctx.translate(i * CHAR_WIDTH, 0)
            drawPath(ctx, path, this.strokes, always)
            ctx.restore()
        })
    }
    guess(c) {
        this.guessed.push(c)
        const matchingGroups = this.groups.filter(([key]) => key == c)
        if(matchingGroups.length) {
            matchingGroups.forEach(([_key, value]) => this.strokes.push(value))
            return matchingGroups.length
        } else {
            this.lives--
            return false
        }
    }
}

module.exports = HanmanGame