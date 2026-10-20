import { chromium, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const project=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(project,'dist')
const port=Number(process.env.PWA_RECOVERY_PORT??4176),origin=`http://127.0.0.1:${port}`
const audioPath='/audio/kana/kana_a.wav',override=new Map()
let decoratedHosting=false
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'}
const server=createServer(async(request,response)=>{
  try {
    const pathname=decodeURIComponent(new URL(request.url,origin).pathname),relative=pathname.slice(1)||'index.html'
    const file=path.resolve(dist,relative)
    if(!file.startsWith(dist+path.sep)){response.writeHead(403);response.end();return}
    if(decoratedHosting&&pathname==='/index.html'){response.writeHead(302,{Location:'/'});response.end();return}
    const replacement=override.get(pathname)
    let bytes=replacement?.bytes??await readFile(file)
    if(decoratedHosting&&pathname==='/')bytes=Buffer.from(bytes.toString('utf8').replace('</body>','<script>window.__hostDecoration="present"</script></body>'))
    response.writeHead(replacement?.status??200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','Content-Length':bytes.length})
    response.end(bytes)
  }catch(error){response.writeHead(error.code==='ENOENT'?404:500);response.end('Unavailable')}
})
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)})
const browser=await chromium.launch({headless:true})
const report={environment:'Production Chromium PWA recovery, fresh isolated browser contexts',port,checks:[],limitations:['Actual iPad Safari, Home Screen installation and Apple Pencil hardware were not tested.']}
const ready=page=>page.getByRole('status').filter({hasText:'오프라인 준비 완료'})
const failed=page=>page.getByRole('status').filter({hasText:'오프라인 자료 저장을 완료하지 못했어요'})
const waitReady=async page=>{await expect(ready(page)).toBeVisible({timeout:45000});await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true)}
async function cacheState(page) {
  return page.evaluate(async()=>{
    const state=[]
    for(const name of await caches.keys()) {
      const cache=await caches.open(name),keys=(await cache.keys()).map(request=>request.url)
      state.push({name,entries:keys.length,marker:keys.some(url=>new URL(url).pathname.endsWith('/.offline-cache-ready'))})
    }
    return state
  })
}
try {
  for(const failureMode of ['404','hash-mismatch']) {
    const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage()
    try {
      const original=await readFile(path.join(dist,audioPath.slice(1)))
      const altered=Buffer.from(original);altered[Math.min(128,altered.length-1)]^=1
      override.set(audioPath,failureMode==='404'?{status:404,bytes:Buffer.from('Not found')}:{status:200,bytes:altered})
      await page.goto(origin+'/')
      await expect(failed(page)).toBeVisible({timeout:45000})
      await expect(ready(page)).toHaveCount(0)
      const before=await cacheState(page)
      expect(before.every(cache=>!cache.marker)).toBe(true)
      override.delete(audioPath)
      await page.getByRole('button',{name:'저장 다시 시도',exact:true}).click()
      await waitReady(page)
      const after=await cacheState(page)
      expect(after.filter(cache=>cache.marker)).toHaveLength(1)
      report.checks.push({scenario:'new-install-'+failureMode,result:'passed',failureNeverReady:true,incompleteCacheMarkers:0,retryReady:true,before,after})
    }finally{override.delete(audioPath);await context.close()}
  }

  {
    const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage()
    try {
      await page.goto(origin+'/');await waitReady(page)
      const removed=await page.evaluate(async url=>{
        let count=0
        for(const name of await caches.keys()) {
          const cache=await caches.open(name)
          if(await cache.delete(url))count++
        }
        return count
      },origin+audioPath)
      expect(removed).toBe(1)
      await context.setOffline(true);await page.reload()
      await expect(failed(page)).toBeVisible({timeout:45000})
      await expect(ready(page)).toHaveCount(0)
      const whileOffline=await cacheState(page)
      expect(whileOffline.every(cache=>!cache.marker)).toBe(true)
      await context.setOffline(false)
      await page.getByRole('button',{name:'저장 다시 시도',exact:true}).click()
      await waitReady(page)
      const restored=await page.evaluate(async url=>{const response=await caches.match(url);return !!response&&response.status===200},origin+audioPath)
      expect(restored).toBe(true)
      await context.setOffline(true);await page.reload();await waitReady(page)
      report.checks.push({scenario:'cached-audio-eviction',result:'passed',removed,missingDetectedOnOfflineReload:true,neverFalseReady:true,onlineRetryRestoresAudio:restored,subsequentOfflineReloadReady:true})
    }finally{await context.close()}
  }

  {
    const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage()
    try {
      decoratedHosting=true
      const original=await readFile(path.join(dist,'index.html'))
      const originalHash=createHash('sha256').update(original).digest('hex')
      await page.goto(origin+'/')
      expect(await page.evaluate(()=>window.__hostDecoration)).toBe('present')
      await waitReady(page)
      const cached=await page.evaluate(async({origin})=>{
        const response=await caches.match(origin+'/index.html')
        if(!response)throw new Error('Missing offline shell')
        const bytes=await response.arrayBuffer()
        return {hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join(''),length:bytes.byteLength,text:new TextDecoder().decode(bytes)}
      },{origin})
      expect(cached.hash).toBe(originalHash);expect(cached.length).toBe(original.length)
      expect(cached.text).not.toContain('__hostDecoration')
      await context.setOffline(true);await page.reload();await waitReady(page)
      expect(await page.evaluate(()=>window.__hostDecoration)).toBeUndefined()
      await expect(page.locator('main')).toBeVisible()
      const offlineIndex=await page.evaluate(async()=>{const response=await fetch('index.html');return {status:response.status,text:await response.text()}})
      expect(offlineIndex.status).toBe(200);expect(offlineIndex.text).toBe(original.toString('utf8'))
      report.checks.push({scenario:'canonical-index-redirect-and-host-html-decoration',result:'passed',onlineDecorationConfirmed:true,offlineShellMatchesOriginalHash:true,originalHtmlBytes:original.length,cachedHtmlBytes:cached.length,readyDespiteRedirect:true,offlineReloadExcludesHostDecoration:true})
    }finally{decoratedHosting=false;await context.close()}
  }

  {
    const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage(),workerRequests=[]
    try {
      await page.addInitScript(()=>{window.__TAURI_INTERNALS__={}})
      context.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/sw.js'))workerRequests.push(request.url())})
      await page.goto(origin+'/');await expect(page.locator('main')).toBeVisible()
      await page.waitForTimeout(500)
      const registrations=await page.evaluate(async()=>({secure:isSecureContext,native:'__TAURI_INTERNALS__' in window,count:(await navigator.serviceWorker.getRegistrations()).length,controller:!!navigator.serviceWorker.controller}))
      expect(registrations.secure).toBe(true);expect(registrations.native).toBe(true);expect(registrations.count).toBe(0);expect(registrations.controller).toBe(false)
      expect(workerRequests).toEqual([])
      await expect(page.getByRole('complementary',{name:'앱 설치 및 오프라인 사용'})).toHaveCount(0)
      report.checks.push({scenario:'production-tauri-internals-guard',result:'passed',...registrations,workerNetworkRequests:0,offlinePromptHidden:true})
    }finally{await context.close()}
  }
  await mkdir(path.join(project,'artifacts'),{recursive:true})
  await writeFile(path.join(project,'artifacts/pwa-recovery-results.json'),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
