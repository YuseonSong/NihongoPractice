import { createHash } from 'node:crypto'
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const dist=path.join(project,'dist')
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const generated=new Set(['sw.js','precache-manifest.json'])
async function files(directory,relative='') {
  const result=[]
  for(const entry of await readdir(path.join(directory,relative),{withFileTypes:true})) {
    const name=path.posix.join(relative,entry.name)
    if(entry.isSymbolicLink())throw new Error('PWA resources must be regular files: '+name)
    if(entry.isDirectory())result.push(...await files(directory,name))
    else if((await lstat(path.join(directory,name))).isFile())result.push(name)
  }
  return result.sort()
}

const names=(await files(dist)).filter(name=>!generated.has(name))
for(const required of ['index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','audio/LICENSE.md','strokes/ATTRIBUTION.md','strokes/LICENSE.txt']) {
  if(!names.includes(required))throw new Error('Missing required offline resource: '+required)
}
const assets=[]
for(const name of names) {
  const bytes=await readFile(path.join(dist,name))
  assets.push({url:'./'+name.split('/').map(encodeURIComponent).join('/'),bytes:bytes.length,sha256:hash(bytes)})
}
// Verify every public resource was copied. This also covers all stroke source SVGs and licenses.
for(const name of await files(path.join(project,'public'))) {
  const entry=assets.find(asset=>asset.url==='./'+name.split('/').map(encodeURIComponent).join('/'))
  if(!entry||entry.sha256!==hash(await readFile(path.join(project,'public',name))))throw new Error('Public resource missing or changed in dist: '+name)
}
const manifest=JSON.parse(await readFile(path.join(project,'src/audio/manifest.json'),'utf8'))
for(const asset of Object.values(manifest.assets)) {
  const offline=assets.find(entry=>entry.url==='./audio/'+asset.file)
  if(!offline||offline.sha256!==asset.sha256)throw new Error('Missing or corrupt offline audio: '+asset.file)
}
const template=await readFile(path.join(project,'src/pwa/service-worker.js'),'utf8')
const packageInfo=JSON.parse(await readFile(path.join(project,'package.json'),'utf8'))
const version=packageInfo.version+'-'+hash(JSON.stringify(assets)+'\n'+template).slice(0,20)
// Hosted HTML may be redirected or decorated. Ship the reviewed Vite shell in the worker.
const shellHtml=await readFile(path.join(dist,'index.html'),'utf8')
const config={version,assets,shellHtml}
if(!template.includes('/* BUILD_CONFIG */'))throw new Error('Missing service worker build placeholder.')
await writeFile(path.join(dist,'sw.js'),template.replace('/* BUILD_CONFIG */','const CONFIG = '+JSON.stringify(config)+';\n'))
await writeFile(path.join(dist,'precache-manifest.json'),JSON.stringify({schemaVersion:1,...config},null,2)+'\n')
console.log(JSON.stringify({pwa:version,files:assets.length,audio:Object.keys(manifest.assets).length,bytes:assets.reduce((sum,asset)=>sum+asset.bytes,0)}))
