/** Sample pinned KanjiVG cubic paths. Derived data: CC BY-SA 3.0, Ulrich Apel.
 * Run from repo root: node scripts/generate-strokes.mjs
 * Fails closed if upstream introduces an unsupported SVG command.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'

const directory='public/strokes'
const files=(await readdir(directory)).filter(name=>/^[0-9a-f]{5}\.svg$/i.test(name)).sort()
if(files.length!==92)throw new Error('Expected 92 basic kana SVGs, found '+files.length)
const result={}
for(const file of files){
  const code=file.slice(0,-4)
  const source=await readFile(directory+'/'+file,'utf8')
  const paths=[...source.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match=>match[1])
  const strokes=[]
  for(const path of paths){
    const tokens=path.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g)??[]
    if(tokens.shift()!=='M')throw new Error('Unsupported start command in '+file)
    let current=[Number(tokens.shift()),Number(tokens.shift())]
    const points=[[...current]]
    while(tokens.length){
      if(tokens.shift()!=='c')throw new Error('Unsupported path command in '+file)
      const values=Array.from({length:6},()=>Number(tokens.shift()))
      const a=[...current],b=[a[0]+values[0],a[1]+values[1]],c=[a[0]+values[2],a[1]+values[3]],d=[a[0]+values[4],a[1]+values[5]]
      for(let step=1;step<33;step++){
        const t=step/32
        points.push([0,1].map(k=>Number(((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k]).toFixed(5))))
      }
      current=d
    }
    strokes.push(points)
  }
  result[String.fromCodePoint(Number.parseInt(code,16))]=strokes
}
await writeFile('src/data/writing-strokes.json',JSON.stringify(result),'utf8')
console.log('Generated '+Object.keys(result).length+' basic kana references.')