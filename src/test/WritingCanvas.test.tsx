import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WritingCanvas } from '../components/WritingCanvas'

class TestPointerEvent extends MouseEvent {
  pointerId:number
  pointerType:string
  constructor(type:string,init:MouseEventInit&{pointerId?:number;pointerType?:string}={}){
    super(type,init);this.pointerId=init.pointerId??1;this.pointerType=init.pointerType??'mouse'
  }
}
let notifyResize:()=>void
beforeEach(()=>{
  vi.stubGlobal('PointerEvent',TestPointerEvent)
  notifyResize=()=>{}
  vi.stubGlobal('ResizeObserver',class {
    constructor(callback:ResizeObserverCallback){notifyResize=()=>callback([],this as unknown as ResizeObserver)}
    observe(){} disconnect(){}
  })
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null)
  vi.spyOn(HTMLCanvasElement.prototype,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:100,height:100,right:100,bottom:100,x:0,y:0,toJSON(){}})
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
function setup(){
  const change=vi.fn(), notice=vi.fn()
  const view=render(<WritingCanvas strokes={[]} onChange={change} showGuide={false} onNotice={notice}/>)
  const canvas=view.getByRole('img')
  Object.defineProperty(canvas,'setPointerCapture',{value:vi.fn()})
  return {canvas,change}
}
describe('필기 입력 생명주기',()=>{
  it('이전 획의 지연된 capture 해제와 호버 이벤트가 다음 획을 지우거나 오염시키지 않는다',()=>{
    const {canvas,change}=setup()
    fireEvent.pointerDown(canvas,{clientX:10,clientY:10,buttons:1})
    fireEvent.pointerMove(canvas,{clientX:30,clientY:30,buttons:1})
    fireEvent.pointerUp(canvas,{clientX:40,clientY:40,buttons:0})
    fireEvent.pointerDown(canvas,{clientX:50,clientY:10,buttons:1})
    fireEvent.lostPointerCapture(canvas,{buttons:0})
    fireEvent.pointerMove(canvas,{clientX:99,clientY:99,buttons:0})
    fireEvent.pointerMove(canvas,{clientX:50,clientY:30,buttons:1})
    fireEvent.pointerUp(canvas,{clientX:50,clientY:40,buttons:0})
    expect(change).toHaveBeenCalledTimes(2)
    const strokes=change.mock.lastCall![0]
    expect(strokes).toHaveLength(2)
    expect(strokes[1]).toEqual([{x:.5,y:.1},{x:.5,y:.3},{x:.5,y:.4}])
  })
  it('다른 포인터를 무시하고 터치 취소 후 펜 입력을 새 획으로 기록한다',()=>{
    const {canvas,change}=setup()
    fireEvent.pointerDown(canvas,{pointerType:'touch',pointerId:2,clientX:10,clientY:10,buttons:1})
    fireEvent.pointerDown(canvas,{pointerType:'touch',pointerId:3,clientX:90,clientY:90,buttons:1})
    fireEvent.pointerCancel(canvas,{pointerType:'touch',pointerId:2})
    expect(change).not.toHaveBeenCalled()
    fireEvent.pointerDown(canvas,{pointerType:'pen',pointerId:4,clientX:20,clientY:20,buttons:1})
    fireEvent.pointerMove(canvas,{pointerType:'pen',pointerId:4,clientX:40,clientY:40,buttons:1})
    fireEvent.pointerUp(canvas,{pointerType:'pen',pointerId:4,clientX:50,clientY:50})
    expect(change.mock.lastCall![0]).toHaveLength(1)
  })
  it.each(['orientationchange','visibilitychange','resize'])('%s에서 진행 중인 획만 취소하고 완성한 획과 다음 펜 입력은 보존한다',event=>{
    const {canvas,change}=setup()
    fireEvent.pointerDown(canvas,{pointerType:'pen',pointerId:1,clientX:10,clientY:10,buttons:1})
    fireEvent.pointerMove(canvas,{pointerType:'pen',pointerId:1,clientX:20,clientY:20,buttons:1})
    fireEvent.pointerUp(canvas,{pointerType:'pen',pointerId:1,clientX:30,clientY:30})
    const completed=change.mock.lastCall![0][0]
    fireEvent.pointerDown(canvas,{pointerType:'pen',pointerId:2,clientX:40,clientY:40,buttons:1})
    fireEvent.pointerMove(canvas,{pointerType:'pen',pointerId:2,clientX:50,clientY:50,buttons:1})
    if(event==='visibilitychange'){
      vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden')
      fireEvent(document,new Event('visibilitychange'))
    }else if(event==='resize'){
      const rect=canvas.getBoundingClientRect()
      vi.mocked(canvas.getBoundingClientRect).mockReturnValue({...rect,width:200,height:200,right:200,bottom:200})
      notifyResize()
    }else fireEvent(window,new Event('orientationchange'))
    fireEvent.pointerUp(canvas,{pointerType:'pen',pointerId:2,clientX:60,clientY:60})
    expect(change).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(canvas,{pointerType:'pen',pointerId:3,clientX:20,clientY:10,buttons:1})
    fireEvent.pointerMove(canvas,{pointerType:'pen',pointerId:3,clientX:40,clientY:20,buttons:1})
    fireEvent.pointerUp(canvas,{pointerType:'pen',pointerId:3,clientX:50,clientY:30})
    expect(change).toHaveBeenCalledTimes(2)
    expect(change.mock.lastCall![0]).toHaveLength(2)
    expect(change.mock.lastCall![0][0]).toEqual(completed)
  })
  it('초기 크기 알림과 화면이 다시 보이는 이벤트는 정상적인 진행 중 획을 취소하지 않는다',()=>{
    const {canvas,change}=setup()
    fireEvent.pointerDown(canvas,{pointerType:'touch',pointerId:1,clientX:10,clientY:10,buttons:1})
    notifyResize()
    vi.spyOn(document,'visibilityState','get').mockReturnValue('visible')
    fireEvent(document,new Event('visibilitychange'))
    fireEvent.pointerMove(canvas,{pointerType:'touch',pointerId:1,clientX:30,clientY:30,buttons:1})
    fireEvent.pointerUp(canvas,{pointerType:'touch',pointerId:1,clientX:40,clientY:40})
    expect(change).toHaveBeenCalledTimes(1)
    expect(change.mock.lastCall![0][0]).toEqual([{x:.1,y:.1},{x:.3,y:.3},{x:.4,y:.4}])
  })
})
