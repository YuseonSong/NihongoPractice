import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { distance, MAX_POINTS, MAX_STROKES } from '../utils/handwriting'
import type { Point, Stroke } from '../utils/handwriting'

export function canvasPoint(clientX:number, clientY:number, rect:Pick<DOMRect,'left'|'top'|'width'|'height'>):Point {
  return {x:Math.max(0,Math.min(1,(clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(clientY-rect.top)/rect.height))}
}
export function WritingCanvas({strokes,onChange,guide,showGuide,onNotice}:{strokes:Stroke[];onChange:(s:Stroke[])=>void;guide?:Stroke[];showGuide:boolean;onNotice:(s:string)=>void}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const committed=useRef(strokes)
  committed.current=strokes
  const active=useRef<{id:number;points:Stroke}|null>(null)
  const paint=useRef<()=>void>(()=>{})
  paint.current=()=>{
    const el=canvas.current, ctx=el?.getContext('2d')
    if(!el||!ctx) return
    const size=el.getBoundingClientRect().width, ratio=window.devicePixelRatio||1
    if(!size) return
    if(el.width!==Math.round(size*ratio)||el.height!==Math.round(size*ratio)){el.width=Math.round(size*ratio);el.height=Math.round(size*ratio)}
    ctx.setTransform(el.width,0,0,el.height,0,0);ctx.clearRect(0,0,1,1)
    ctx.lineCap='round';ctx.lineJoin='round'
    ctx.strokeStyle='#fed7aa';ctx.lineWidth=.002;ctx.setLineDash([.015,.015])
    for(const value of [.25,.5,.75]){ctx.beginPath();ctx.moveTo(value,0);ctx.lineTo(value,1);ctx.moveTo(0,value);ctx.lineTo(1,value);ctx.stroke()}
    ctx.setLineDash([])
    const draw=(s:Stroke,color:string,width:number)=>{
      if(!s.length)return
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(s[0].x,s[0].y)
      for(let i=1;i<s.length-1;i++)ctx.quadraticCurveTo(s[i].x,s[i].y,(s[i].x+s[i+1].x)/2,(s[i].y+s[i+1].y)/2)
      const last=s[s.length-1];ctx.lineTo(last.x,last.y);ctx.stroke()
    }
    if(showGuide) guide?.forEach((s,i)=>{
      draw(s,'#fda4af88',.025)
      ctx.fillStyle='#be123c';ctx.font='bold .037px sans-serif';ctx.fillText(String(i+1),s[0].x-.035,s[0].y-.02)
      // A visible starting point and short arrow show stroke direction.
      ctx.beginPath();ctx.arc(s[0].x,s[0].y,.009,0,Math.PI*2);ctx.fill()
      const end=s[Math.min(8,s.length-1)], angle=Math.atan2(end.y-s[0].y,end.x-s[0].x)
      ctx.strokeStyle='#be123c';ctx.lineWidth=.004;ctx.beginPath();ctx.moveTo(s[0].x,s[0].y);ctx.lineTo(end.x,end.y)
      ctx.lineTo(end.x-.018*Math.cos(angle-.5),end.y-.018*Math.sin(angle-.5));ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-.018*Math.cos(angle+.5),end.y-.018*Math.sin(angle+.5));ctx.stroke()
    })
    committed.current.forEach(s=>draw(s,'#44403c',.014))
    if(active.current) draw(active.current.points,'#44403c',.014)
  }
  useEffect(()=>{paint.current()},[strokes,guide,showGuide])
  useEffect(()=>{
    const cancel=()=>{active.current=null;paint.current()}
    let previousRect=canvas.current?.getBoundingClientRect()
    const observer=new ResizeObserver(()=>{
      const rect=canvas.current?.getBoundingClientRect()
      if(rect&&previousRect&&(Math.abs(rect.width-previousRect.width)>.5||Math.abs(rect.height-previousRect.height)>.5))active.current=null
      previousRect=rect;paint.current()
    })
    if(canvas.current)observer.observe(canvas.current)
    const visibility=()=>{if(document.visibilityState==='hidden')cancel()}
    window.addEventListener('blur',cancel)
    window.addEventListener('orientationchange',cancel)
    document.addEventListener('visibilitychange',visibility)
    return ()=>{observer.disconnect();window.removeEventListener('blur',cancel);window.removeEventListener('orientationchange',cancel);document.removeEventListener('visibilitychange',visibility)}
  },[])
  const append=(e:ReactPointerEvent<HTMLCanvasElement>)=>{
    const current=active.current
    if(!current||current.id!==e.pointerId)return
    // WebView2 can interleave a native zero-button mousemove with injected or
    // captured drag events. It is hover input and must not enter the stroke.
    if(e.pointerType==='mouse'&&e.buttons===0&&e.type==='pointermove')return
    const rect=e.currentTarget.getBoundingClientRect()
    const events=e.nativeEvent.getCoalescedEvents?.()??[]
    for(const event of [...events,e.nativeEvent]){
      const p=canvasPoint(event.clientX,event.clientY,rect)
      if(current.points.length<MAX_POINTS&&distance(current.points[current.points.length-1],p)>.001)current.points.push(p)
    }
    paint.current()
  }
  const finish=(e:ReactPointerEvent<HTMLCanvasElement>,cancel=false)=>{
    if(active.current?.id!==e.pointerId)return
    if(!cancel)append(e)
    const points=active.current.points;active.current=null
    // Pointerup/cancel releases capture automatically. Explicit release can queue a
    // late lostpointercapture in WebView2 after the next stroke has already begun.
    if(!cancel&&points.length>1){committed.current=[...committed.current,points];onChange(committed.current)}
    paint.current()
  }
  return <canvas ref={canvas} aria-label="손글씨 입력 영역" role="img" className="writing-canvas" onContextMenu={event=>event.preventDefault()} onPointerDown={e=>{
    if((active.current&&active.current.id!==e.pointerId) || (e.pointerType==='mouse'&&e.button!==0))return
    if(committed.current.length>=MAX_STROKES){onNotice('최대 24획까지 입력할 수 있어요. 지우고 다시 써 주세요.');return}
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId)
    active.current={id:e.pointerId,points:[canvasPoint(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect())]};paint.current()
  }} onPointerMove={append} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>{
    // Ignore a zero-button notification from an already completed stroke.
    if(e.buttons!==0)finish(e,true)
  }}/>
}
