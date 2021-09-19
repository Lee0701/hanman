
const fs = require('fs')

const {parse} = require('svg-parser')
const {Canvas} = require('canvas')
require('canvas-5-polyfill')

const loadChar = (char) => {
    const code = char.charCodeAt(0).toString(16).padStart(5, '0')
    const fileId = `./kanji/${code}.svg`
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

const g = new Canvas(109, 109)
const ctx = g.getContext('2d')
ctx.strokeStyle = 'black'
ctx.lineWidth = 5
const char = loadChar('漢')
const root = getRoot(char)
const groups = getGroups(char)
const strokes = getStrokes(char)
const randomStrokes = []
new Array(5).fill().forEach(() => randomStrokes.push(strokes[Math.floor(Math.random() * strokes.length)]))
drawPath(ctx, char, randomStrokes)
fs.writeFileSync('out.png', g.toBuffer())
