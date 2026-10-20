import { hiragana } from '../src/data/hiragana.ts'
import { katakana } from '../src/data/katakana.ts'
import { allConversationPhrases } from '../src/data/conversations.ts'
import { buildAudioCatalog } from '../src/audio/catalog-builder.ts'
import readings from '../src/data/audio-readings.json' with { type:'json' }
import { readFile, writeFile, mkdir } from 'node:fs/promises'

export const catalog=buildAudioCatalog(hiragana,katakana,allConversationPhrases,readings)
export const catalogPath=new URL('../src/audio/catalog.json',import.meta.url)
if(process.argv[1]&&new URL(process.argv[1], 'file:///').pathname.replace(/\\/g,'/').endsWith('/audio-catalog.mjs')){
  const json=JSON.stringify(catalog,null,2)+'\n'
  if(process.argv.includes('--check')){
    if(await readFile(catalogPath,'utf8')!==json)throw new Error('학습 데이터와 음성 카탈로그가 다릅니다. npm.cmd run audio:catalog를 실행하세요.')
  }else{await mkdir(new URL('../src/audio/',import.meta.url),{recursive:true});await writeFile(catalogPath,json)}
  console.log(`${Object.keys(catalog.content).length} content references → ${Object.keys(catalog.scripts).length} unique scripts`)
}
