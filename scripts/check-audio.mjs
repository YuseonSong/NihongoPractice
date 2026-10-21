import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { catalog } from './audio-catalog.mjs'
import { inspectWave, scriptHash, sha256, synthesisSettings } from './audio-utils.mjs'

const storedCatalog=JSON.parse(await readFile(new URL('../src/audio/catalog.json',import.meta.url),'utf8'))
if(JSON.stringify(catalog)!==JSON.stringify(storedCatalog))throw new Error('학습 콘텐츠와 음성 카탈로그가 다릅니다. audio:catalog와 읽기 검토를 진행하세요.')
const manifest=JSON.parse(await readFile(new URL('../src/audio/manifest.json',import.meta.url),'utf8'))
const review=JSON.parse(await readFile(new URL('../src/audio/reading-review.json',import.meta.url),'utf8'))
const isDist=process.argv.includes('--dist'), root=new URL(`../${isDist?'dist':'public'}/audio/`,import.meta.url)
const missing=[], speechFallback=[], invalid=[], directories={}, files=new Set()
let bytes=0,seconds=0
for(const [id,script] of Object.entries(catalog.scripts)){
  const asset=manifest.assets[id]
  if(!asset){if(script.kind==='conversations')speechFallback.push(id);else missing.push(id);continue}
  try{
    if(!/^(kana|vocabulary|conversations)\/[a-z0-9_]+\.wav$/.test(asset.file)||files.has(asset.file))throw new Error('Invalid or duplicate asset path')
    files.add(asset.file)
    if(asset.scriptHash!==scriptHash(script)||review.items[id]?.scriptHash!==asset.scriptHash||review.items[id]?.actualReading!==asset.actualReading)throw new Error('Stale script or unreviewed reading')
    if(script.kind==='kana'&&asset.actualReading!==script.synthesisText.replace(/'/g,''))throw new Error('Incorrect isolated kana pronunciation')
    const data=await readFile(new URL(asset.file,root)), stats=inspectWave(data)
    if(sha256(data)!==asset.sha256||stats.bytes!==asset.bytes||Math.abs(stats.duration-asset.duration)>1e-6)throw new Error('Checksum/metadata mismatch')
    bytes+=data.length;seconds+=stats.duration;directories[script.kind]=(directories[script.kind]??0)+1
  }catch(error){invalid.push({id,error:error.message})}
}
for(const [content,id] of Object.entries(catalog.content))if(!catalog.scripts[id])invalid.push({id:content,error:'Unmapped content'})
if(manifest.engine?.version!==synthesisSettings.version||manifest.engine?.speaker!==synthesisSettings.speaker)invalid.push({id:'engine',error:'Engine metadata mismatch'})
const report={root:isDist?'dist':'public',contentReferences:Object.keys(catalog.content).length,uniqueScripts:Object.keys(catalog.scripts).length,actualFiles:files.size,directories,bytes,seconds,missing,speechFallback,invalid}
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true})
await writeFile(new URL(`../artifacts/audio-${isDist?'dist':'source'}-check.json`,import.meta.url),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
if(missing.length||invalid.length)throw new Error(`음성 리소스 검사 실패: 누락 ${missing.length}, 오류 ${invalid.length}`)
