// This records a developer's explicit TEXT/PHONEME audit; it is not listening certification.
import { readFile, writeFile } from 'node:fs/promises'
import { catalog } from './audio-catalog.mjs'
import { scriptHash, synthesisSettings } from './audio-utils.mjs'

const report=JSON.parse(await readFile(new URL('../artifacts/audio-query-review-report.json',import.meta.url),'utf8'))
if(!process.argv.includes('--confirm-text-review'))throw new Error('먼저 audio-query-review-report.json의 원문, 기대 읽기, 실제 모라를 검토한 뒤 --confirm-text-review를 전달하세요. 원어민 청취 검수는 별도입니다.')
if(JSON.stringify(report.engine)!==JSON.stringify({...synthesisSettings,credit:'VOICEVOX Nemo（女声1）',terms:'https://voicevox.hiroshiba.jp/nemo/term/'}))throw new Error('Outdated engine preview')
if(report.items.length!==Object.keys(catalog.scripts).length)throw new Error('Incomplete preview')
const items={}
for(const item of report.items){
  const script=catalog.scripts[item.id]
  if(!script||script.synthesisText!==item.synthesisText||script.text!==item.text||script.reading!==item.expectedReading)throw new Error(`Outdated script: ${item.id}`)
  items[item.id]={scriptHash:scriptHash(script),synthesisText:item.synthesisText,actualReading:item.actualReading}
}
await writeFile(new URL('../src/audio/reading-review.json',import.meta.url),JSON.stringify({engine:report.engine,reviewedAt:new Date().toISOString(),method:'Explicit developer text and phoneme audit; not native listening certification',items},null,2)+'\n')
console.log(`${Object.keys(items).length} text/phoneme reviews recorded`)
