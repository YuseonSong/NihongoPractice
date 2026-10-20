import { chromium, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hiragana } from '../src/data/hiragana.ts'

// Tests the production bundle without publishing it or connecting to native CDP.
// Run npm run build first. Localhost is a browser secure context for service workers.
const project=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(project,'dist')
const audioManifest=JSON.parse(await readFile(path.join(project,'src/audio/manifest.json'),'utf8'))
const strokes=JSON.parse(await readFile(path.join(project,'src/data/writing-strokes.json'),'utf8'))
const pkg=JSON.parse(await readFile(path.join(project,'package.json'),'utf8'))
await stat(path.join(dist,'index.html'))
await mkdir(path.join(project,'artifacts'),{recursive:true})
const port=Number(process.env.PWA_TEST_PORT??4175),origin=`http://127.0.0.1:${port}`
const overrides=new Map()
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.wav':'audio/wav','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'}
const server=createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,origin).pathname)
    if(pathname==='/NihongoPractice'){response.writeHead(301,{Location:'/NihongoPractice/'});response.end();return}
    const relative=pathname.startsWith('/NihongoPractice/')?pathname.slice('/NihongoPractice/'.length):pathname.slice(1)
    const file=path.resolve(dist,relative||'index.html')
    if(file!==dist&&!file.startsWith(dist+path.sep)){response.writeHead(403);response.end();return}
    const bytes=overrides.get(pathname)??await readFile(file)
    const headers={'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'}
    const range=request.headers.range
    if(range){
      const match=/^bytes=(\d+)-(\d*)$/.exec(range)
      const start=Number(match?.[1]),end=match?.[2]?Number(match[2]):bytes.length-1
      if(!match||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start> end||start>=bytes.length){response.writeHead(416,{...headers,'Content-Range':`bytes */${bytes.length}`});response.end();return}
      const finish=Math.min(end,bytes.length-1),partial=bytes.subarray(start,finish+1)
      response.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${finish}/${bytes.length}`,'Content-Length':partial.length});response.end(request.method==='HEAD'?undefined:partial);return
    }
    response.writeHead(200,{...headers,'Content-Length':bytes.length});response.end(request.method==='HEAD'?undefined:bytes)
  }catch(error){response.writeHead(error.code==='ENOENT'?404:500);response.end('File unavailable')}
})
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)})
const browser=await chromium.launch({headless:true})
const key='hiragana-step-progress-v1',prefix='nihongo-mate-view-v1:'
const report={version:pkg.version,environment:'Chromium production PWA on Windows',webkit:'Not installed; actual iPad Safari, Home Screen installation, and Apple Pencil hardware remain unverified',network:'Local test origin only, then context.setOffline(true)',paths:[]}
const legacy={learned:['あ','い','う','え','お','か'],katakanaLearned:['ア'],conversationLearned:['greetings-2'],favorites:['greetings-2'],quizCorrect:7,quizTotal:12,quizStats:{hiragana:{correct:3,total:5},katakana:{correct:2,total:4},conversation:{correct:2,total:3}},streak:4,lastStudyDate:'2026-10-19',completionDates:{'learned:か':'2026-10-19'},handwriting:{'あ':{attempts:2,best:92,latest:60,sum:152,lastPracticed:'2026-10-20',version:'kanjivg-rules-v1'}}}

try{
  for(const base of ['/','/NihongoPractice/']){
    const context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true,deviceScaleFactor:2,serviceWorkers:'allow'})
    const page=await context.newPage(),errors=[],externalRequests=[],checks=[]
    const entry={base,checks,viewports:[]};report.paths.push(entry)
    page.on('pageerror',error=>errors.push(error.message))
    context.on('request',request=>{if(new URL(request.url()).origin!==origin)externalRequests.push(request.url())})
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('internetdisconnected'))
    await page.addInitScript(()=>{
      Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true})
      const NativeAudio=window.Audio
      window.__pwaAudio=[];window.__pwaConcurrent=0
      window.Audio=function(url){
        const audio=new NativeAudio(url);audio.__url=url;window.__pwaAudio.push(audio)
        audio.addEventListener('playing',()=>{audio.__started=true;audio.__rate=audio.playbackRate;window.__pwaConcurrent=Math.max(window.__pwaConcurrent,window.__pwaAudio.filter(item=>!item.paused&&!item.ended).length)})
        audio.addEventListener('ended',()=>{audio.__ended=true})
        return audio
      }
    })
    const button=name=>page.getByRole('button',{name,exact:true}).filter({visible:true}).first()
    const progress=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
    const ready=()=>expect(page.getByRole('status').filter({hasText:'오프라인 준비 완료'}).first()).toBeVisible({timeout:30000})
    async function navigate(label){
      const main=page.getByRole('navigation',{name:'주 메뉴',exact:true}).getByRole('button',{name:label,exact:true})
      if(await main.isVisible())return main.click()
      const short={'홈':'홈','히라가나':'문자','일상 회화':'회화','복습':'복습'}[label]
      if(short)return page.getByRole('navigation',{name:'모바일 주 메뉴'}).getByRole('button',{name:short,exact:true}).click()
      await button('더보기 메뉴 열기').click()
      await page.getByRole('dialog',{name:'학습 메뉴'}).getByRole('button',{name:label,exact:true}).click()
    }
    async function listen(label,slow=false){
      await page.getByRole('button',{name:`${label} ${slow?'느리게 듣기':'발음 듣기'}`,exact:true}).click()
      await expect.poll(()=>page.evaluate(()=>window.__pwaAudio.at(-1)?.__ended),{timeout:10000}).toBe(true)
      const actual=await page.evaluate(()=>{const audio=window.__pwaAudio.at(-1);return {url:audio.currentSrc||new URL(audio.__url,location.href).href,rate:audio.__rate,started:audio.__started,pitch:audio.preservesPitch}})
      expect(actual.started).toBe(true);expect(actual.rate).toBe(slow?.8:1);expect(actual.url).toContain(`${base}audio/`)
      return actual
    }
    async function answer(wrong=false){
      const saved=await page.evaluate(prefix=>JSON.parse(localStorage.getItem(prefix+'quiz')),prefix),session=saved.session,question=session.questions[session.index]
      const region=page.getByRole('region',{name:'퀴즈 문제'})
      if(question.options.length===1){await region.getByRole('button',{name:'정답 확인',exact:true}).click();await region.getByRole('button',{name:wrong?'다시 볼게요':'기억했어요',exact:true}).click()}
      else{const id=wrong?question.options.find(id=>id!==question.id):question.id;await region.getByRole('button',{name:hiragana.find(item=>item.char===id).romaji,exact:true}).click()}
      await region.getByRole('button',{name:session.index===session.questions.length-1?'결과 보기':'다음 문제',exact:true}).click()
      return question.id
    }
    try{
      await page.goto(origin+base)
      await expect(page.getByRole('heading',{name:'히라가나 먼저 시작해 볼까요?'})).toBeVisible()
      expect(await page.evaluate(()=>window.isSecureContext)).toBe(true)
      await ready()
      console.log(`${base}: initial offline cache ready`)
      await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true)
      const install=await page.evaluate(async()=>{
        const link=document.querySelector('link[rel="manifest"]'),manifestUrl=link?.href
        if(!manifestUrl)throw new Error('No web app manifest')
        const manifest=await(await fetch(manifestUrl)).json(),registration=await navigator.serviceWorker.ready
        return {manifestUrl,manifest,scriptUrl:registration.active.scriptURL,scope:registration.scope,cacheNames:await caches.keys(),appleIcon:document.querySelector('link[rel="apple-touch-icon"]')?.href}
      })
      expect(install.scope).toBe(origin+base)
      expect(install.manifest.display).toBe('standalone')
      expect(new URL(install.manifest.start_url,install.manifestUrl).href).toBe(origin+base)
      expect(new URL(install.manifest.scope,install.manifestUrl).href).toBe(origin+base)
      expect(install.manifest.icons.some(icon=>icon.sizes==='192x192')).toBe(true)
      expect(install.manifest.icons.some(icon=>icon.sizes==='512x512')).toBe(true)
      expect(install.appleIcon).toBeTruthy()
      entry.install={scope:install.scope,cacheNames:install.cacheNames}
      checks.push('production manifest, install icons, standalone display, scoped service worker control, and offline-ready completion')

      await page.evaluate(({key,legacy})=>localStorage.setItem(key,JSON.stringify(legacy)),{key,legacy})
      await context.setOffline(true)
      await page.reload();await ready()
      const baseline=await progress()
      for(const[name,value]of Object.entries(legacy))expect(baseline[name]).toEqual(value)
      expect(await page.evaluate(()=>window.speechSynthesis===undefined)).toBe(true)
      entry.audio=await page.evaluate(async({assets,base})=>{
        const result=[]
        for(const[id,asset]of Object.entries(assets)){
          const url=new URL(`${base}audio/${asset.file}`,location.origin).href
          const cached=await caches.match(url)
          if(!cached||cached.status!==200)throw new Error(`Audio not fully cached: ${id}`)
          const cachedBytes=await cached.arrayBuffer()
          const response=await fetch(url,{cache:'no-store'})
          if(!response.ok)throw new Error(`Offline audio unavailable: ${id}`)
          const bytes=await response.arrayBuffer()
          const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(n=>n.toString(16).padStart(2,'0')).join('')
          if(await digest(cachedBytes)!==asset.sha256||await digest(bytes)!==asset.sha256)throw new Error(`Cached/offline audio checksum mismatch: ${id}`)
          result.push({id,bytes:bytes.byteLength})
        }
        return {count:result.length,bytes:result.reduce((sum,item)=>sum+item.bytes,0)}
      },{assets:audioManifest.assets,base})
      expect(entry.audio.count).toBe(216)
      const range=await page.evaluate(async base=>{
        const url=`${base}audio/kana/kana_a.wav`
        const partial=await fetch(url,{headers:{Range:'bytes=0-1'}}),invalid=await fetch(url,{headers:{Range:'bytes=999999999-'}})
        return {partial:{status:partial.status,range:partial.headers.get('Content-Range'),bytes:Array.from(new Uint8Array(await partial.arrayBuffer()))},invalid:{status:invalid.status,range:invalid.headers.get('Content-Range')}}
      },base)
      expect(range.partial.status).toBe(206);expect(range.partial.bytes).toEqual([82,73]);expect(range.partial.range).toMatch(/^bytes 0-1\/\d+$/)
      expect(range.invalid.status).toBe(416);expect(range.invalid.range).toMatch(/^bytes \*\/\d+$/)
      entry.range=range
      checks.push('offline cold reload with existing records; all 216 full cached WAVs and offline fetches match SHA-256; audio byte ranges return 206 and invalid range returns 416')

      await button('히라가나 시작하기').click()
      for(const item of hiragana){await button(`선택 ${item.char}`).click();await expect(page.getByRole('group',{name:`${item.char} 음성 재생`,exact:true})).toBeVisible()}
      expect(await progress()).toEqual(baseline)
      await button('선택 あ').click()
      entry.normal=await listen('あ');entry.slow=await listen('あ',true)
      expect(entry.slow.pitch).toBe(true)
      await page.getByRole('button',{name:'あ 반복 재생',exact:true}).click()
      await expect.poll(()=>page.evaluate(()=>{const audio=window.__pwaAudio.at(-1);return !!audio?.__started&&audio.loop&&!audio.paused})).toBe(true)
      await page.waitForTimeout(900)
      expect(await page.evaluate(()=>{const audio=window.__pwaAudio.at(-1);return audio.loop&&!audio.paused})).toBe(true)
      await button('선택 い').click();await listen('い')
      expect(await page.evaluate(()=>window.__pwaAudio.at(-2).paused)).toBe(true)
      await page.getByRole('button',{name:'い 반복 재생',exact:true}).click()
      await expect(page.getByRole('button',{name:'い 재생 중지',exact:true})).toBeVisible()
      await page.getByRole('button',{name:'い 재생 중지',exact:true}).click()
      expect(await page.evaluate(()=>window.__pwaAudio.at(-1).paused)).toBe(true)
      expect(await page.evaluate(()=>window.__pwaConcurrent)).toBe(1)
      await navigate('일상 회화');await page.getByRole('combobox',{name:'회화 문장 선택'}).selectOption('greetings-2');await listen('こんにちは。')
      checks.push('46 selectable hiragana offline; actual bundled Japanese audio at 1.0 and 0.8 with system speech disabled; repeat, stop, no overlap, and full conversation playback')

      await navigate('퀴즈');await button('퀴즈 시작').click()
      const missed=await answer(true)
      for(let index=1;index<5;index++)await answer()
      await expect(page.getByRole('heading',{name:'이번 학습을 마쳤어요!'})).toBeVisible()
      await navigate('복습');await page.getByRole('region',{name:'오답 복습'}).getByRole('button',{name:'이 오답 풀기',exact:true}).click();await answer()
      await navigate('복습');await expect(page.getByText('기록된 오답을 모두 다시 맞혔어요!',{exact:true})).toBeVisible()
      expect((await progress()).quizItems[`hiragana:${missed}`]).toMatchObject({wrong:1,correct:1,lastCorrect:true})
      checks.push('offline finite learned-only quiz and wrong-answer review resolution')

      await navigate('직접 그려보기');await page.getByLabel('연습 문자').selectOption('あ')
      const clear=button('전체 지우기');if(await clear.isEnabled())await clear.click()
      const canvas=page.getByRole('img',{name:'손글씨 입력 영역'})
      await canvas.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}))
      const box=await canvas.boundingBox(),cdp=await context.newCDPSession(page)
      for(const stroke of strokes['あ']){
        const points=stroke.filter((_,index)=>index%2===0||index===stroke.length-1).map(([x,y])=>({x:box.x+x/109*box.width,y:box.y+y/109*box.height}))
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]})
        for(const point of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,id:1}]})
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
      }
      await cdp.detach();await button('채점하기').click();await expect(button('채점 완료')).toBeDisabled()
      entry.writingScore=Number((await page.locator('p.text-5xl').innerText()).replace('%',''))
      expect(entry.writingScore).toBeGreaterThanOrEqual(95)
      const afterPractice=await progress()
      expect(afterPractice.quizTotal).toBe(baseline.quizTotal+6);expect(afterPractice.quizCorrect).toBe(baseline.quizCorrect+5)
      expect(afterPractice.handwriting['あ'].attempts).toBe(3)
      expect(afterPractice.handwriting['あ'].sum).toBe(legacy.handwriting['あ'].sum+entry.writingScore)
      for(const name of ['learned','katakanaLearned','conversationLearned','favorites','completionDates'])expect(afterPractice[name]).toEqual(baseline[name])
      checks.push('offline touch Pointer Events and reference-based handwriting grading; prior learning records preserved while quiz and writing counters increment correctly')

      for(const viewport of [{width:768,height:1024},{width:1024,height:768}]){
        await page.setViewportSize(viewport)
        for(const label of ['홈','히라가나','일상 회화','직접 그려보기','퀴즈','복습']){await navigate(label);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
        entry.viewports.push({...viewport,noHorizontalOverflow:true})
        await navigate('홈');await page.screenshot({path:path.join(project,`artifacts/pwa-${base==='/'?'root':'subpath'}-${viewport.width}x${viewport.height}.png`),fullPage:true})
      }
      await page.reload();await ready();expect(await progress()).toEqual(afterPractice)
      checks.push('768×1024 and 1024×768 layouts have no horizontal overflow; offline reload retains completed quiz and writing records')

      await context.setOffline(false)
      // Change only the test server's worker response; the production dist remains untouched.
      const workerPath=new URL(install.scriptUrl).pathname
      const workerRelative=workerPath.startsWith('/NihongoPractice/')?workerPath.slice('/NihongoPractice/'.length):workerPath.slice(1)
      const originalWorker=await readFile(path.join(dist,workerRelative),'utf8')
      const configMatch=originalWorker.match(/const CONFIG = (\{[^\r\n]+\});/)
      if(!configMatch)throw new Error('Generated worker has no injected build configuration')
      const config=JSON.parse(configMatch[1]),nextVersion=config.version+'-regression'
      const cachePrefix='nihongo-mate-pwa:'+encodeURIComponent(base)+':'
      const oldCache=cachePrefix+config.version,newCache=cachePrefix+nextVersion
      const unrelatedCache='pwa-test-unrelated',otherScopeCache='nihongo-mate-pwa:%2Funrelated%2F:keep'
      await page.evaluate(async names=>{for(const name of names){const cache=await caches.open(name);await cache.put(new URL('unrelated-cache-marker',location.href),new Response('preserve'))}},[unrelatedCache,otherScopeCache])
      const updateSource=originalWorker.replace(configMatch[0],`const CONFIG = ${JSON.stringify({...config,version:nextVersion})};`)
      overrides.set(workerPath,Buffer.from(updateSource))
      const update=await page.evaluate(async()=>{
        const registration=await navigator.serviceWorker.ready
        return new Promise(async(resolve,reject)=>{
          const timeout=setTimeout(()=>reject(new Error('Updated service worker did not activate')),15000)
          navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timeout);resolve(true)},{once:true})
          try{await registration.update();registration.waiting?.postMessage({type:'SKIP_WAITING'})}catch(error){clearTimeout(timeout);reject(error)}
        })
      })
      expect(update).toBe(true)
      await expect.poll(()=>page.evaluate(async({oldCache,newCache})=>{const names=await caches.keys();return names.includes(newCache)&&!names.includes(oldCache)},{oldCache,newCache})).toBe(true)
      const updatedCaches=await page.evaluate(async({name,base})=>{const cache=await caches.open(name);return {names:await caches.keys(),entries:(await cache.keys()).length,marker:await(await cache.match(new URL(base+'.offline-cache-ready',location.origin))).json()}},{name:newCache,base})
      expect(updatedCaches.names).toContain(unrelatedCache);expect(updatedCaches.names).toContain(otherScopeCache)
      expect(updatedCaches.marker.version).toBe(nextVersion);expect(updatedCaches.entries).toBe(config.assets.length+1)
      entry.update={version:nextVersion,entries:updatedCaches.entries,oldScopeCacheRemoved:true,otherCachesPreserved:true}
      await ready();await context.setOffline(true);await page.reload();await ready()
      expect(await progress()).toEqual(afterPractice)
      checks.push('new-version service worker fully caches every asset, activates, removes the previous same-scope cache, preserves unrelated/other-scope caches and all learning records through another offline reload')
      overrides.delete(workerPath)
      expect(errors).toEqual([]);expect(externalRequests).toEqual([])
      checks.push('no JavaScript errors or external Internet requests')
      console.log(`${base}: PWA offline functionality and update checks passed`)
    }finally{await context.close()}
  }
  await mkdir(path.join(project,'artifacts'),{recursive:true})
  await writeFile(path.join(project,'artifacts/pwa-results.json'),JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
