import { afterEach, describe, expect, it, vi } from 'vitest'
import { offlineWebRuntime } from '../pwa/client'
import type { OfflineRuntime } from '../pwa/client'

const web:OfflineRuntime={dev:false,protocol:'https:',hostname:'study.example',secure:true,serviceWorker:true,cacheStorage:true}
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks()})

describe('웹 오프라인 저장 실행 환경',()=>{
  it('보안 웹과 localhost 프로덕션만 허용한다',()=>{
    expect(offlineWebRuntime(web)).toBe(true)
    expect(offlineWebRuntime({...web,protocol:'http:',hostname:'localhost'})).toBe(true)
  })
  it.each<Partial<OfflineRuntime>>([
    {dev:true},{secure:false},{serviceWorker:false},{cacheStorage:false},
    {tauriInternals:true},{tauriGlobal:true},{protocol:'tauri:'},
    {protocol:'http:',hostname:'tauri.localhost'},
    {protocol:'https:',hostname:'main.tauri.localhost'},
    {protocol:'file:'},{protocol:'data:'},
  ])('개발·네이티브·지원되지 않는 환경을 제외한다: %j',override=>{
    expect(offlineWebRuntime({...web,...override})).toBe(false)
  })
  it('실제 초기화에서도 Tauri 내부 객체가 있으면 SW 등록을 호출하지 않는다',async()=>{
    vi.resetModules();vi.stubEnv('DEV',false)
    const register=vi.fn()
    vi.stubGlobal('__TAURI_INTERNALS__',{})
    vi.stubGlobal('isSecureContext',true)
    vi.stubGlobal('caches',{})
    const descriptor=Object.getOwnPropertyDescriptor(navigator,'serviceWorker')
    Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register}})
    try{
      const {offlineSupport}=await import('../pwa/client')
      await offlineSupport.prepare()
      expect(register).not.toHaveBeenCalled()
      expect(offlineSupport.getSnapshot().status).toBe('unsupported')
    }finally{
      if(descriptor)Object.defineProperty(navigator,'serviceWorker',descriptor)
      else Reflect.deleteProperty(navigator,'serviceWorker')
    }
  })
})
