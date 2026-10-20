import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSavedViews, useSavedState } from '../hooks/useSavedState'

const PREFIX='nihongo-mate-view-v1:'
beforeEach(()=>localStorage.clear())
afterEach(()=>{cleanup();vi.restoreAllMocks()})

describe('학습 위치 저장',()=>{
  it('같은 이벤트의 빠른 함수형 갱신을 누락하지 않고 저장하며 재마운트 때 복원한다',()=>{
    const first=renderHook(()=>useSavedState('count',0))
    act(()=>{first.result.current[1](value=>value+1);first.result.current[1](value=>value+1);first.result.current[1](value=>value+1)})
    expect(first.result.current[0]).toBe(3)
    expect(JSON.parse(localStorage.getItem(PREFIX+'count')!)).toBe(3)
    act(()=>{first.result.current[1](10);first.result.current[1](value=>value+2)})
    expect(first.result.current[0]).toBe(12)
    first.unmount()
    const restored=renderHook(()=>useSavedState('count',0))
    expect(restored.result.current[0]).toBe(12)
  })
  it('문자·모드 객체를 검증해 복원하고 구조가 틀리면 초기값으로 시작한다',()=>{
    type View={char:string;mode:'table'|'cards'}
    const initial:View={char:'あ',mode:'table'}
    const valid=(raw:unknown):raw is View=>!!raw&&typeof raw==='object'&&'char' in raw&&typeof raw.char==='string'&&'mode' in raw&&(raw.mode==='table'||raw.mode==='cards')
    localStorage.setItem(PREFIX+'kana',JSON.stringify({char:'い',mode:'cards'}))
    const restored=renderHook(()=>useSavedState('kana',initial,valid))
    expect(restored.result.current[0]).toEqual({char:'い',mode:'cards'})
    restored.unmount();localStorage.setItem(PREFIX+'kana',JSON.stringify({char:99,mode:'broken'}))
    expect(renderHook(()=>useSavedState('kana',initial,valid)).result.current[0]).toEqual(initial)
  })
  it.each(['{broken','null','"wrong primitive"'])('깨진 JSON 또는 잘못된 저장 형식 %s를 복구한다',text=>{
    localStorage.setItem(PREFIX+'number',text)
    const hook=renderHook(()=>useSavedState('number',2))
    expect(hook.result.current[0]).toBe(2)
    act(()=>hook.result.current[1](value=>value+1))
    expect(hook.result.current[0]).toBe(3)
    expect(localStorage.getItem(PREFIX+'number')).toBe('3')
  })
  it('학습 위치만 초기화하고 학습 기록·다른 앱 데이터는 유지한다',()=>{
    localStorage.setItem(PREFIX+'quiz','{"scope":"hiragana"}')
    localStorage.setItem(PREFIX+'kana','"い"')
    localStorage.setItem('hiragana-step-progress-v1','{"learned":["あ"]}')
    localStorage.setItem('other-app','keep')
    clearSavedViews()
    expect(localStorage.getItem(PREFIX+'quiz')).toBeNull();expect(localStorage.getItem(PREFIX+'kana')).toBeNull()
    expect(localStorage.getItem('hiragana-step-progress-v1')).toBe('{"learned":["あ"]}')
    expect(localStorage.getItem('other-app')).toBe('keep')
  })
  it('저장소 읽기·쓰기 권한이 없어도 현재 세션에서 공부를 계속할 수 있다',()=>{
    vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new DOMException('blocked','SecurityError')})
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('quota','QuotaExceededError')})
    const hook=renderHook(()=>useSavedState('blocked',0))
    expect(hook.result.current[0]).toBe(0)
    expect(()=>act(()=>{hook.result.current[1](value=>value+1);hook.result.current[1](value=>value+1)})).not.toThrow()
    expect(hook.result.current[0]).toBe(2)
  })
  it('저장소 삭제가 거부되어도 학습 위치 초기화 요청에서 예외를 발생시키지 않는다',()=>{
    localStorage.setItem(PREFIX+'quiz','saved')
    vi.spyOn(Storage.prototype,'removeItem').mockImplementation(()=>{throw new DOMException('blocked','SecurityError')})
    expect(()=>clearSavedViews()).not.toThrow()
  })
})
