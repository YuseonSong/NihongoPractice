import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const browser=await chromium.launch({headless:true})
const context=await browser.newContext({viewport:{width:1200,height:900}})
await context.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true})
  const NativeAudio=window.Audio
  window.__audio=[]
  window.Audio=function(url){const audio=new NativeAudio(url);window.__audio.push(audio);audio.addEventListener('ended',()=>{audio.__ended=true});return audio}
})
const page=await context.newPage(), errors=[]
page.on('pageerror',error=>errors.push(error.message))
try{
  await page.goto('http://127.0.0.1:5173')
  await page.locator('button:visible').filter({hasText:/^히라가나$/}).click()
  const decoded=await page.evaluate(async()=>{
    const audioContext=new AudioContext(), result=[]
    for(const letter of ['a','i','u','e','o']){
      const response=await fetch(`/audio/kana/kana_${letter}.wav`)
      if(!response.ok)throw new Error('Missing pilot WAV')
      const audio=await audioContext.decodeAudioData(await response.arrayBuffer())
      const samples=audio.getChannelData(0)
      const rms=Math.sqrt(samples.reduce((n,s)=>n+s*s,0)/samples.length)
      result.push({letter,duration:audio.duration,sampleRate:audio.sampleRate,rms})
    }
    await audioContext.close();return result
  })
  for(const char of ['あ','い','う','え','お']){
    await page.getByRole('button',{name:`${char} 발음 듣기`,exact:true}).click()
    await expect.poll(()=>page.evaluate(()=>window.__audio.at(-1)?.__ended)).toBe(true)
  }
  await page.getByRole('button',{name:'あ 반복 재생',exact:true}).click()
  await page.waitForTimeout(900)
  expect(await page.evaluate(()=>{const a=window.__audio.at(-1);return a.loop&&!a.paused&&a.currentTime>=0})).toBe(true)
  await page.getByRole('button',{name:'あ 재생 중지',exact:true}).click()
  expect(await page.evaluate(()=>window.__audio.at(-1).paused)).toBe(true)
  expect(errors).toEqual([])
  const report={phase:'5 kana pilot',speechSynthesis:'unavailable',decoded,allFiveActuallyPlayed:true,loopAndStop:true,errors}
  await mkdir('artifacts',{recursive:true});await writeFile('artifacts/audio-pilot-browser-results.json',JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
}finally{await browser.close()}
