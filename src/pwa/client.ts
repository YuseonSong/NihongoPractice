export type OfflineStatus='idle'|'preparing'|'ready'|'error'|'unsupported'
export interface OfflineState {status:OfflineStatus;completed:number;total:number;message?:string}
export interface OfflineRuntime {dev:boolean;protocol:string;hostname:string;secure:boolean;serviceWorker:boolean;cacheStorage:boolean;tauriInternals?:boolean;tauriGlobal?:boolean}
export function offlineWebRuntime(runtime:OfflineRuntime):boolean {
  return !runtime.dev&&!runtime.tauriInternals&&!runtime.tauriGlobal&&runtime.protocol!=='tauri:'&&
    runtime.hostname!=='tauri.localhost'&&!runtime.hostname.endsWith('.tauri.localhost')&&
    (runtime.protocol==='http:'||runtime.protocol==='https:')&&runtime.secure&&runtime.serviceWorker&&runtime.cacheStorage
}
type WorkerState=OfflineState&{type:'NIHONGO_OFFLINE_STATE';version?:string}
const listeners=new Set<()=>void>()
let snapshot:OfflineState={status:'idle',completed:0,total:0}
let pending:Promise<void>|undefined
let workerURL:string|undefined
let listening=false
const watched=new WeakSet<ServiceWorkerRegistration>()
function publish(next:OfflineState) {
  if(snapshot.status===next.status&&snapshot.completed===next.completed&&snapshot.total===next.total&&snapshot.message===next.message)return
  snapshot=next;listeners.forEach(listener=>listener())
}
function validState(data:unknown):data is WorkerState {
  if(!data||typeof data!=='object')return false
  const state=data as Partial<WorkerState>
  return state.type==='NIHONGO_OFFLINE_STATE'&&['preparing','ready','error'].includes(state.status??'')&&
    typeof state.completed==='number'&&Number.isInteger(state.completed)&&typeof state.total==='number'&&Number.isInteger(state.total)&&
    state.total>0&&state.completed>=0&&state.completed<=state.total&&(state.status!=='ready'||state.completed===state.total)&&
    (state.message===undefined||typeof state.message==='string')
}
function receive(data:unknown) {
  if(!validState(data))return
  publish({status:data.status,completed:data.completed,total:data.total,...(data.message?{message:data.message}:{})})
}
function nativeEnvironment() {
  return typeof window!=='undefined'&&('__TAURI_INTERNALS__' in window||'__TAURI__' in window||location.protocol==='tauri:'||location.hostname==='tauri.localhost'||location.hostname.endsWith('.tauri.localhost'))
}
function unsupported():string|undefined {
  if(typeof window==='undefined'||typeof navigator==='undefined')return '이 환경은 오프라인 웹 설치를 지원하지 않아요.'
  if(nativeEnvironment())return 'Windows 앱에는 학습 자료와 음성이 이미 포함되어 있어요.'
  if(import.meta.env.DEV)return '오프라인 저장은 배포된 웹 버전에서 준비할 수 있어요.'
  if(location.protocol!=='http:'&&location.protocol!=='https:')return '오프라인 설치는 HTTPS 웹 주소에서 준비할 수 있어요.'
  if(!window.isSecureContext)return '오프라인 설치에는 HTTPS로 접속해야 해요.'
  if(!('serviceWorker' in navigator)||!('caches' in window))return '이 브라우저는 오프라인 저장을 지원하지 않아요. Safari에서 열어 주세요.'
}
function askStatus(worker:ServiceWorker,type='NIHONGO_OFFLINE_STATUS'):Promise<void> {
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel()
    const timer=window.setTimeout(()=>{channel.port1.close();reject(new Error('저장 상태를 확인하지 못했어요. 다시 준비해 주세요.'))},type==='NIHONGO_OFFLINE_PREPARE'?120000:15000)
    channel.port1.onmessage=event=>{
      if(!validState(event.data))return
      window.clearTimeout(timer);channel.port1.close();receive(event.data);resolve()
    }
    try{worker.postMessage({type},[channel.port2])}catch(error){window.clearTimeout(timer);channel.port1.close();reject(error)}
  })
}
function waitForActive(registration:ServiceWorkerRegistration):Promise<ServiceWorker> {
  if(registration.active)return Promise.resolve(registration.active)
  return new Promise((resolve,reject)=>{
    let worker:ServiceWorker|null=registration.installing??registration.waiting
    const timer=window.setTimeout(()=>finish(new Error('저장이 끝나지 않았어요. 연결과 저장 공간을 확인하고 다시 준비해 주세요.')),120000)
    function finish(error?:Error) {
      window.clearTimeout(timer);registration.removeEventListener('updatefound',changed)
      worker?.removeEventListener('statechange',changed)
      if(error)reject(error);else if(registration.active)resolve(registration.active)
    }
    function changed() {
      if(registration.active){finish();return}
      const next=registration.installing??registration.waiting
      if(next&&next!==worker){worker?.removeEventListener('statechange',changed);worker=next;worker.addEventListener('statechange',changed)}
      if(worker?.state==='redundant')finish(new Error('오프라인 파일을 저장하지 못했어요. 연결과 저장 공간을 확인하고 다시 준비해 주세요.'))
    }
    registration.addEventListener('updatefound',changed)
    worker?.addEventListener('statechange',changed);changed()
  })
}
function watch(registration:ServiceWorkerRegistration) {
  if(watched.has(registration))return
  watched.add(registration)
  const watchCandidate=()=>{
    const candidate=registration.installing
    candidate?.addEventListener('statechange',()=>{
      if(candidate.state==='redundant'&&registration.active)void askStatus(registration.active).catch(()=>{})
    })
  }
  registration.addEventListener('updatefound',watchCandidate);watchCandidate()
}
async function run() {
  const reason=unsupported()
  if(reason){publish({status:'unsupported',completed:0,total:0,message:reason});return}
  publish({status:'preparing',completed:0,total:0,message:'앱과 일본어 음성을 오프라인으로 준비하고 있어요.'})
  const base=new URL(import.meta.env.BASE_URL,document.baseURI)
  workerURL=new URL('sw.js',base).href
  if(!listening) {
    navigator.serviceWorker.addEventListener('message',event=>{
      if((event.source as ServiceWorker|null)?.scriptURL===workerURL)receive(event.data)
    })
    listening=true
  }
  let registration:ServiceWorkerRegistration|undefined
  try {
    registration=await navigator.serviceWorker.register(workerURL,{scope:base.pathname,updateViaCache:'none'})
    watch(registration)
    const active=await waitForActive(registration)
    await askStatus(active)
    if(snapshot.status==='error')await askStatus(active,'NIHONGO_OFFLINE_PREPARE')
  } catch(error) {
    // An unsuccessful update must not erase a previously complete offline copy.
    const previous=registration??await navigator.serviceWorker.getRegistration(base.href).catch(()=>undefined)
    if(previous?.active) {
      try {await askStatus(previous.active);if(snapshot.status==='ready')return}catch{}
    }
    publish({status:'error',completed:snapshot.completed,total:snapshot.total,message:error instanceof Error?error.message:'오프라인 준비에 실패했어요. 다시 준비해 주세요.'})
  }
}
function prepare():Promise<void> {
  if(pending)return pending
  pending=run().finally(()=>{pending=undefined})
  return pending
}
export const offlineSupport={
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}},
  getSnapshot:()=>snapshot,
  prepare,
  retry:prepare,
}
