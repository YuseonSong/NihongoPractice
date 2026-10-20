/* Build config is injected by scripts/build-pwa.mjs. This file is not served directly. */
/* BUILD_CONFIG */

const SCOPE = new URL(self.registration.scope)
const CACHE_PREFIX = 'nihongo-mate-pwa:' + encodeURIComponent(SCOPE.pathname) + ':'
const CACHE_NAME = CACHE_PREFIX + CONFIG.version
const READY_URL = new URL('.offline-cache-ready', SCOPE).href
const INDEX_URL = new URL('index.html', SCOPE).href
const assets = CONFIG.assets.map(asset => ({...asset, absolute:new URL(asset.url,SCOPE).href}))
const assetURLs = new Set(assets.map(asset=>asset.absolute))
let state = {status:'idle',completed:0,total:assets.length,version:CONFIG.version}
let preparation

async function broadcast(next) {
  state = {...next,version:CONFIG.version}
  const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true})
  windows.forEach(client=>client.postMessage({type:'NIHONGO_OFFLINE_STATE',...state}))
}

async function cacheStatus() {
  const cache = await caches.open(CACHE_NAME)
  const marker = await cache.match(READY_URL)
  const stored = new Set((await cache.keys()).map(request=>request.url))
  const completed = assets.filter(asset=>stored.has(asset.absolute)).length
  return {status:marker&&completed===assets.length?'ready':'error',completed,total:assets.length,version:CONFIG.version,
    message:marker&&completed===assets.length?undefined:'오프라인 파일 저장이 완전하지 않아요. 인터넷에 연결한 뒤 다시 준비해 주세요.'}
}

async function installAssets() {
  if((await cacheStatus()).status==='ready') {
    await broadcast({status:'ready',completed:assets.length,total:assets.length})
    await self.skipWaiting()
    return
  }
  const cache = await caches.open(CACHE_NAME)
  // A candidate has no completion marker until every verified response is stored.
  await cache.delete(READY_URL)
  let cursor = 0, completed = 0, failure
  await broadcast({status:'preparing',completed,total:assets.length})
  const download = async () => {
    while(!failure&&cursor<assets.length) {
      const asset = assets[cursor++]
      try {
        // Hosts may redirect /index.html or inject their own scripts into navigation HTML.
        // The build embeds the exact Vite shell; its size and SHA-256 are checked below too.
        const response = asset.url==='./index.html'
          ? new Response(CONFIG.shellHtml,{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}})
          : await fetch(asset.absolute,{cache:'reload',credentials:'same-origin',redirect:'error'})
        if(!response.ok||response.status!==200||response.type==='opaque')throw new Error('파일을 가져오지 못했어요: '+asset.url)
        const bytes = await response.arrayBuffer()
        if(bytes.byteLength!==asset.bytes)throw new Error('파일 크기가 다릅니다: '+asset.url)
        const digest = await crypto.subtle.digest('SHA-256',bytes)
        const hash = Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')
        if(hash!==asset.sha256)throw new Error('파일 검증에 실패했어요: '+asset.url)
        const headers = new Headers(response.headers)
        headers.delete('content-encoding')
        headers.set('Content-Length',String(bytes.byteLength))
        await cache.put(asset.absolute,new Response(bytes,{status:200,headers}))
        completed++
        await broadcast({status:'preparing',completed,total:assets.length})
      } catch(error) {failure=error}
    }
  }
  // Wait for all writers before removing a failed candidate. They cannot recreate it later.
  await Promise.all(Array.from({length:Math.min(4,assets.length)},download))
  if(failure) {
    await caches.delete(CACHE_NAME)
    await broadcast({status:'error',completed,total:assets.length,message:'오프라인 저장에 실패했어요. 연결과 저장 공간을 확인하고 다시 준비해 주세요.'})
    throw failure
  }
  await cache.put(READY_URL,new Response(JSON.stringify({version:CONFIG.version,total:assets.length}),{headers:{'Content-Type':'application/json'}}))
  await broadcast({status:'ready',completed,total:assets.length})
  await self.skipWaiting()
}

function prepareAssets() {
  if(!preparation)preparation=installAssets().finally(()=>{preparation=undefined})
  return preparation
}
self.addEventListener('install',event=>event.waitUntil(prepareAssets()))
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const status=await cacheStatus()
  if(status.status!=='ready')throw new Error('The offline cache is incomplete.')
  const keys=await caches.keys()
  await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))
  await self.clients.claim()
  await broadcast(status)
})()))

function insideScope(url) {
  return url.origin===SCOPE.origin&&url.pathname.startsWith(SCOPE.pathname)
}

function rangeBounds(value,size) {
  const match=/^bytes=(\d*)-(\d*)$/i.exec(value.trim())
  if(!match||(!match[1]&&!match[2])||size===0)return null
  let start,end
  if(!match[1]) {
    const suffix=Number(match[2])
    if(!Number.isSafeInteger(suffix)||suffix<=0)return null
    start=Math.max(0,size-suffix);end=size-1
  } else {
    start=Number(match[1]);end=match[2]?Number(match[2]):size-1
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||start>end)return null
    end=Math.min(end,size-1)
  }
  return {start,end}
}

async function rangedResponse(response,range) {
  const bytes=await response.arrayBuffer(),size=bytes.byteLength,bounds=rangeBounds(range,size)
  const headers=new Headers(response.headers)
  headers.delete('content-encoding');headers.set('Accept-Ranges','bytes')
  if(!bounds) {
    headers.set('Content-Range','bytes */'+size);headers.set('Content-Length','0')
    return new Response(null,{status:416,statusText:'Range Not Satisfiable',headers})
  }
  const {start,end}=bounds
  headers.set('Content-Range',`bytes ${start}-${end}/${size}`)
  headers.set('Content-Length',String(end-start+1))
  return new Response(bytes.slice(start,end+1),{status:206,statusText:'Partial Content',headers})
}

const unavailable=()=>new Response('오프라인 파일을 사용할 수 없어요. 인터넷 연결 후 앱에서 다시 준비해 주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url)
  if(request.method!=='GET'||!insideScope(url))return
  const relative=url.pathname.slice(SCOPE.pathname.length)
  if(relative==='api'||relative.startsWith('api/'))return
  url.search='';url.hash=''
  const known=assetURLs.has(url.href)
  if(!known&&request.mode!=='navigate')return
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME)
    const cached=await cache.match(url.href)
    if(cached) {
      const range=request.headers.get('Range'),condition=request.headers.get('If-Range')
      const rangeMatches=!condition||condition===cached.headers.get('ETag')||condition===cached.headers.get('Last-Modified')
      return range&&rangeMatches?rangedResponse(cached,range):cached
    }
    if(request.mode==='navigate'&&(relative===''||relative==='index.html'))return await cache.match(INDEX_URL)||unavailable()
    try{return await fetch(request)}catch {
      return request.mode==='navigate'?await cache.match(INDEX_URL)||unavailable():unavailable()
    }
  })())
})

self.addEventListener('message',event=>{
  if(!['NIHONGO_OFFLINE_STATUS','NIHONGO_OFFLINE_PREPARE'].includes(event.data?.type))return
  event.waitUntil((async()=>{
    if(event.data.type==='NIHONGO_OFFLINE_PREPARE') {
      try{await prepareAssets()}catch{}
    }
    const status=state.status==='preparing'?state:await cacheStatus()
    const message={type:'NIHONGO_OFFLINE_STATE',...status}
    if(event.ports?.[0])event.ports[0].postMessage(message)
    else event.source?.postMessage(message)
  })())
})
