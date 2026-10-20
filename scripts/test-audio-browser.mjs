import { chromium, expect } from '@playwright/test'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { hiragana } from '../src/data/hiragana.ts'
import { katakanaBasic } from '../src/data/katakana.ts'
import { conversationCategories } from '../src/data/conversations.ts'

const desktop=process.argv.includes('--desktop')
const manifest=JSON.parse(await readFile(new URL('../src/audio/manifest.json',import.meta.url),'utf8'))
const catalog=JSON.parse(await readFile(new URL('../src/audio/catalog.json',import.meta.url),'utf8'))
const browser=desktop?await chromium.connectOverCDP('http://127.0.0.1:9222'):await chromium.launch({headless:true})
const context=desktop?browser.contexts()[0]:await browser.newContext({viewport:{width:1200,height:900}})
const page=desktop?context.pages().find(p=>!p.url().startsWith('devtools:')):await context.newPage()
const errors=[],blocked=[]
page.on('pageerror',error=>errors.push(error.message))
const key='hiragana-step-progress-v1', report={environment:desktop?'Tauri Release WebView2':'Chromium web',speechSynthesis:'disabled',network:'only app origin allowed; external Internet and TTS endpoints blocked',checks:[]}
const button=name=>page.locator('button:visible').filter({hasText:new RegExp(`^${name}$`)}).first()
async function navigate(label){
  const primary=page.getByRole('navigation',{name:'주 메뉴',exact:true}).getByRole('button',{name:label,exact:true})
  if(await primary.isVisible())return primary.click()
  const short={'홈':'홈','히라가나':'문자','일상 회화':'회화','복습':'복습'}[label]
  if(short)return page.getByRole('navigation',{name:'모바일 주 메뉴'}).getByRole('button',{name:short,exact:true}).click()
  await page.getByRole('button',{name:'더보기 메뉴 열기',exact:true}).click()
  await page.getByRole('dialog',{name:'학습 메뉴'}).getByRole('button',{name:label,exact:true}).click()
}
async function selectKana(char){await page.getByRole('button',{name:`선택 ${char}`,exact:true}).click()}
let original=null
await page.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true})
  const NativeAudio=window.Audio
  window.__audio=[];window.__maximumConcurrent=0
  window.Audio=function(url){
    const audio=new NativeAudio(url);audio.__url=url;audio.__ended=false;window.__audio.push(audio)
    audio.addEventListener('playing',()=>{
      audio.__started=true;audio.__startedAt=performance.now();audio.__rate=audio.playbackRate;audio.__preservesPitch=audio.preservesPitch
      window.__maximumConcurrent=Math.max(window.__maximumConcurrent,window.__audio.filter(a=>!a.paused&&!a.ended).length)
    })
    audio.addEventListener('ended',()=>{audio.__ended=true;audio.__elapsed=(performance.now()-audio.__startedAt)/1000})
    return audio
  }
})
async function listen(label,slow=false){
  await page.getByRole('button',{name:`${label} ${slow?'느리게 듣기':'발음 듣기'}`,exact:true}).click()
  await expect.poll(()=>page.evaluate(()=>window.__audio.at(-1)?.__ended),{timeout:10000}).toBe(true)
  const actual=await page.evaluate(()=>{const a=window.__audio.at(-1);return {url:a.__url,rate:a.__rate,preservesPitch:a.__preservesPitch,elapsed:a.__elapsed,started:a.__started}})
  expect(actual.started).toBe(true);expect(actual.rate).toBe(slow?.8:1)
  if(slow)expect(actual.preservesPitch).toBe(true)
  return actual
}
try{
  if(!desktop)await page.goto('http://127.0.0.1:5173')
  await page.waitForSelector('header')
  const origin=new URL(page.url()).origin
  await page.route('**/*',route=>{
    if(new URL(route.request().url()).origin===origin)return route.continue()
    blocked.push(route.request().url());return route.abort('internetdisconnected')
  })
  original=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([name])=>name==='hiragana-step-progress-v1'||name.startsWith('nihongo-mate-view-v1:'))))
  await page.evaluate(()=>Object.keys(localStorage).filter(name=>name==='hiragana-step-progress-v1'||name.startsWith('nihongo-mate-view-v1:')).forEach(name=>localStorage.removeItem(name)))
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({learned:['か'],katakanaLearned:['カ'],quizCorrect:3,quizTotal:4,favorites:['greetings-2'],conversationLearned:['greetings-2'],handwriting:{'あ':{attempts:2,best:92,latest:60,sum:152,lastPracticed:'2026-10-20',version:'kanjivg-rules-v1'}}})),key)
  await page.reload();await page.waitForSelector('header')
  const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
  expect(await page.evaluate(()=>window.speechSynthesis===undefined)).toBe(true)
  report.decoded=await page.evaluate(async assets=>{
    const ctx=new AudioContext({sampleRate:24000}), result=[]
    try{
      for(const [id,asset] of Object.entries(assets)){
        const response=await fetch(`/audio/${asset.file}`,{cache:'no-store'})
        if(!response.ok)throw new Error(`Missing embedded WAV: ${id}`)
        const bytes=await response.arrayBuffer()
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('')
        if(hash!==asset.sha256)throw new Error(`Embedded checksum mismatch: ${id}`)
        const audio=await ctx.decodeAudioData(bytes), samples=audio.getChannelData(0)
        const rms=Math.sqrt(samples.reduce((n,s)=>n+s*s,0)/samples.length)
        if(audio.duration<.08||Math.abs(audio.duration-asset.duration)>.015||rms<.0005)throw new Error(`Invalid decoded waveform: ${id}`)
        result.push({id,duration:audio.duration,rms,sha256:hash})
      }
    }finally{await ctx.close()}
    return result
  },manifest.assets)
  expect(report.decoded.length).toBe(216)
  report.checks.push('all 216 actual embedded files fetched, SHA256 matched, decoded and non-silent with Internet blocked')
  await navigate('히라가나')
  for(const c of hiragana){await selectKana(c.char);await expect(page.getByRole('group',{name:`${c.char} 음성 재생`,exact:true})).toHaveAttribute('data-audio-id',catalog.content[`kana:hiragana:${c.char}`])}
  await selectKana('は')
  report.normal=await listen('は');expect(report.normal.url).toContain('kana_ha.wav')
  await selectKana('へ')
  report.slow=await listen('へ',true);expect(report.slow.url).toContain('kana_he.wav')
  await selectKana('あ')
  await page.getByRole('button',{name:'あ 반복 재생',exact:true}).click()
  await page.waitForTimeout(1000)
  expect(await page.evaluate(()=>{const a=window.__audio.at(-1);return a.loop&&!a.paused&&a.__started})).toBe(true)
  await selectKana('い');await page.getByRole('button',{name:'い 발음 듣기',exact:true}).click()
  expect(await page.evaluate(()=>window.__audio.at(-2).paused)).toBe(true)
  await expect.poll(()=>page.evaluate(()=>window.__audio.at(-1).__ended)).toBe(true)
  await selectKana('あ');await page.getByRole('button',{name:'あ 반복 재생',exact:true}).click()
  await page.getByRole('button',{name:'あ 반복 재생',exact:true}).click()
  expect(await page.evaluate(()=>window.__audio.at(-1).loop)).toBe(false)
  await page.getByRole('button',{name:'あ 반복 재생',exact:true}).click()
  await page.getByRole('button',{name:'あ 재생 중지',exact:true}).click()
  expect(await page.evaluate(()=>window.__audio.at(-1).paused)).toBe(true)
  expect(await page.evaluate(()=>window.__maximumConcurrent)).toBe(1)
  report.checks.push('46 hiragana mappings, actual playback at 1.0 and 0.8 with pitch preservation, loop toggle, stop and no overlap')
  await page.route('**/audio/kana/kana_a.wav',route=>route.fulfill({status:404,body:'missing'}))
  await page.getByRole('button',{name:'あ 발음 듣기',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText(/재생|누락/)
  await page.unroute('**/audio/kana/kana_a.wav')
  report.checks.push('real missing-file 404 displays error without fallback to another language')
  await navigate('가타카나')
  for(const c of katakanaBasic){await selectKana(c.char);await expect(page.getByRole('group',{name:`${c.char} 음성 재생`,exact:true})).toHaveAttribute('data-audio-id',catalog.content[`kana:katakana:${c.char}`])}
  await selectKana('ア')
  expect((await listen('ア')).url).toContain('kana_a.wav')
  await selectKana('ヲ')
  expect((await listen('ヲ')).url).toContain('kana_o.wav')
  await selectKana('ア');await button('암기 카드').click();await page.getByText('예시 단어 · アイス',{exact:true}).click();expect((await listen('アイス')).url).toContain('vocabulary/')
  report.checks.push('46 katakana mappings, hiragana/katakana shared pronunciation, を/ヲ alias, vocabulary card playback')
  await navigate('일상 회화')
  for(const category of conversationCategories){
    await page.getByRole('button',{name:new RegExp(category.title)}).click()
    await page.getByRole('combobox',{name:'회화 문장 선택'}).selectOption(category.phrases[0].id)
    await listen(category.phrases[0].japanese)
    for(let i=0;i<category.phrases.length;i++){
      const phrase=category.phrases[i]
      await expect(page.getByRole('group',{name:`${phrase.japanese} 음성 재생`,exact:true})).toHaveAttribute('data-audio-id',catalog.content[`conversation:${phrase.id}`])
      if(i<category.phrases.length-1)await page.getByRole('button',{name:'다음 문장',exact:true}).click()
    }
  }
  report.checks.push('all 70 conversation cards mapped; one full sentence per category actually played without system TTS')
  await navigate('복습');await listen('こんにちは。')
  await navigate('퀴즈');await button('퀴즈 시작').click();await button('정답 확인').click();await expect(page.locator('main [data-audio-id]')).toHaveCount(1)
  await page.locator('main [data-audio-id] button').first().click()
  await expect.poll(()=>page.evaluate(()=>window.__audio.at(-1).__ended),{timeout:10000}).toBe(true)
  await navigate('직접 그려보기');await listen('あ')
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).toEqual(baseline)
  report.checks.push('review, quiz and handwriting audio; all preexisting learning and handwriting records unchanged')
  await navigate('일상 회화')
  if(!desktop){await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);report.checks.push('390px mobile layout without horizontal overflow')}
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}))
  await mkdir('artifacts',{recursive:true});await page.screenshot({path:`artifacts/audio-${desktop?'desktop':'web'}.png`,fullPage:true})
  expect(errors).toEqual([]);report.checks.push('no JavaScript errors')
  report.blockedRequests=blocked
  await writeFile(`artifacts/audio-${desktop?'desktop':'web'}-results.json`,JSON.stringify(report,null,2))
  console.log(JSON.stringify({...report,decoded:`${report.decoded.length} WAV files`},null,2))
}finally{
  if(desktop&&original){await page.evaluate(original=>{Object.keys(localStorage).filter(name=>name==='hiragana-step-progress-v1'||name.startsWith('nihongo-mate-view-v1:')).forEach(name=>localStorage.removeItem(name));for(const[name,value]of Object.entries(original))localStorage.setItem(name,value)},original);await page.reload()}
  await browser.close()
}
