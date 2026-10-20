// Developer-only local generation. User approval is required before installing/running Nemo.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { catalog } from './audio-catalog.mjs'
import { inspectWave, scriptHash, sha256, synthesisSettings } from './audio-utils.mjs'

const engineUrl='http://127.0.0.1:50021', speaker=synthesisSettings.speaker
const manifestUrl=new URL('../src/audio/manifest.json',import.meta.url)
const manifest=JSON.parse(await readFile(manifestUrl,'utf8'))
const engineVersion=await fetch(`${engineUrl}/version`).then(r=>r.json())
if(engineVersion!==synthesisSettings.version)throw new Error(`Expected engine ${synthesisSettings.version}, got ${engineVersion}`)
const speakers=await fetch(`${engineUrl}/speakers`).then(r=>r.json())
if(!speakers.some(s=>s.name===synthesisSettings.speakerName&&s.styles.some(style=>style.id===speaker)))throw new Error('Voice identity mismatch')
manifest.engine={...synthesisSettings,credit:'VOICEVOX Nemo（女声1）',terms:'https://voicevox.hiroshiba.jp/nemo/term/'}
const preview=process.argv.includes('--preview'), pilot=process.argv.includes('--pilot')
const audit=preview||pilot?null:JSON.parse(await readFile(new URL('../src/audio/reading-review.json',import.meta.url),'utf8'))
const ids=pilot?['kana_a','kana_i','kana_u','kana_e','kana_o']:Object.keys(catalog.scripts)
const review={engine:manifest.engine,generatedAt:new Date().toISOString(),items:[]}
for(const id of ids){
  const script=catalog.scripts[id]
  if(audit&&audit.items[id]?.scriptHash!==scriptHash(script))throw new Error(`Reading review missing/outdated: ${id}. Preview and review the actual phonemes first.`)
  if(!preview&&manifest.assets[id]?.scriptHash===scriptHash(script)){
    try{const bytes=await readFile(new URL(`../public/audio/${manifest.assets[id].file}`,import.meta.url));inspectWave(bytes);if(sha256(bytes)===manifest.assets[id].sha256){console.log(`Reuse ${id}`);continue}}catch{}
  }
  const queryResponse=await fetch(`${engineUrl}/audio_query?${new URLSearchParams({text:script.kind==='kana'?script.reading:script.synthesisText,speaker:String(speaker)})}`,{method:'POST',signal:AbortSignal.timeout(60000)})
  if(!queryResponse.ok)throw new Error(`Query failed: ${id} ${queryResponse.status}`)
  const query=await queryResponse.json()
  if(script.kind==='kana'){
    const accents=await fetch(`${engineUrl}/accent_phrases?${new URLSearchParams({text:script.synthesisText,speaker:String(speaker),is_kana:'true'})}`,{method:'POST',signal:AbortSignal.timeout(60000)})
    if(!accents.ok)throw new Error(`Kana phoneme query failed: ${id}`)
    query.accent_phrases=await accents.json();query.kana=script.synthesisText
  }
  query.speedScale=synthesisSettings.speedScale;query.outputSamplingRate=synthesisSettings.sampleRate;query.outputStereo=false
  if(script.kind==='kana')for(const phrase of query.accent_phrases)for(const mora of phrase.moras){
    if(/^[AIUEO]$/.test(mora.vowel))mora.vowel=mora.vowel.toLowerCase()
    mora.vowel_length=Math.max(.16,mora.vowel_length)
  }
  const actualReading=query.accent_phrases.map(p=>p.moras.map(m=>m.text).join('')).join(' / ')
  if(script.kind==='kana'&&actualReading!==script.synthesisText.replace(/'/g,''))throw new Error(`Kana pronunciation mismatch: ${id} ${actualReading}`)
  if(audit&&audit.items[id].actualReading!==actualReading)throw new Error(`Reading changed after review: ${id}: ${actualReading}`)
  review.items.push({id,text:script.text,expectedReading:script.reading,synthesisText:script.synthesisText,actualReading,kana:query.kana,query})
  if(preview){console.log(`${id}: ${script.text} → ${actualReading}`);continue}
  const response=await fetch(`${engineUrl}/synthesis?${new URLSearchParams({speaker:String(speaker),enable_interrogative_upspeak:'true'})}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query),signal:AbortSignal.timeout(60000)})
  if(!response.ok)throw new Error(`Synthesis failed: ${id} ${response.status}`)
  const bytes=Buffer.from(await response.arrayBuffer()), stats=inspectWave(bytes), file=`${script.kind}/${id}.wav`
  const folder=new URL(`../public/audio/${script.kind}/`,import.meta.url);await mkdir(folder,{recursive:true})
  await writeFile(new URL(`../public/audio/${file}`,import.meta.url),bytes)
  manifest.assets[id]={file,sha256:sha256(bytes),scriptHash:scriptHash(script),...stats,actualReading}
  await writeFile(new URL('../src/audio/manifest.json.tmp',import.meta.url),JSON.stringify(manifest,null,2)+'\n')
  await rename(new URL('../src/audio/manifest.json.tmp',import.meta.url),manifestUrl)
  console.log(`Generated ${id}: ${stats.duration.toFixed(2)}s, ${bytes.length} bytes → ${actualReading}`)
}
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true})
await writeFile(new URL(`../artifacts/audio-${preview?'query-review':pilot?'pilot':'generation'}-report.json`,import.meta.url),JSON.stringify(review,null,2)+'\n')
console.log(`Complete: ${Object.keys(manifest.assets).length} actual WAV files registered`)
