import { useEffect, useRef, useState } from 'react'
import { BarChart3, BookOpen, Languages, MessageCircle, Brain, Star, Flower2, PenLine, Menu, X, AudioLines } from 'lucide-react'
import type { Tab } from '../types'

const items=[
  {id:'home',label:'홈',icon:BarChart3},{id:'hiragana',label:'히라가나',icon:BookOpen},
  {id:'katakana',label:'가타카나',icon:Languages},{id:'conversation',label:'일상 회화',icon:MessageCircle},
  {id:'handwriting',label:'직접 그려보기',icon:PenLine},{id:'quiz',label:'퀴즈',icon:Brain},{id:'review',label:'복습',icon:Star},
] as const
const extra=[{id:'pronunciation',label:'발음 길잡이',icon:AudioLines}] as const
export function Navigation({tab,setTab}:{tab:Tab;setTab:(tab:Tab)=>void}){
  const [open,setOpen]=useState(false), sheet=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null)
  const navigate=(next:Tab)=>{setOpen(false);setTab(next)}
  useEffect(()=>{
    if(!open)return
    const previous=document.activeElement as HTMLElement|null, overflow=document.body.style.overflow
    document.body.style.overflow='hidden';sheet.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const keyboard=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setOpen(false);return}
      if(event.key!=='Tab')return
      const buttons=Array.from(sheet.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[])
      const first=buttons[0],last=buttons.at(-1)
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
    }
    window.addEventListener('keydown',keyboard)
    return()=>{document.body.style.overflow=overflow;window.removeEventListener('keydown',keyboard);if(previous?.isConnected)previous.focus()}
  },[open])
  const mobile=[{id:'home' as Tab,label:'홈',icon:BarChart3},{id:'hiragana' as Tab,label:'문자',icon:BookOpen},{id:'conversation' as Tab,label:'회화',icon:MessageCircle},{id:'review' as Tab,label:'복습',icon:Star}]
  return <>
    <header className="app-header sticky top-0 z-30 border-b border-orange-100 bg-cream/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
      <button onClick={()=>navigate('home')} className="flex shrink-0 items-center gap-2" aria-label="홈으로"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400 text-white"><Flower2 size={20}/></span><span className="text-lg font-black tracking-tight sm:text-xl">Nihongo Mate</span></button>
      <nav aria-label="주 메뉴" className="hidden gap-0.5 lg:flex">{items.map(({id,label,icon:Icon})=><button key={id} onClick={()=>navigate(id)} aria-current={tab===id?'page':undefined} className={`flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold xl:gap-2 xl:px-3 xl:text-sm ${tab===id?'bg-rose-100 text-rose-600':'text-stone-600 hover:bg-white'}`}><Icon size={15}/>{label}</button>)}</nav>
      <button className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-bold lg:hidden" onClick={()=>navigate('hiragana')}>히라가나 시작</button>
    </div></header>
    <nav aria-label="모바일 주 메뉴" className="mobile-bottom-nav fixed z-40 grid grid-cols-5 rounded-2xl border border-orange-100 bg-white/95 p-1.5 shadow-soft backdrop-blur lg:hidden">
      {mobile.map(({id,label,icon:Icon})=>{const active=tab===id||(id==='hiragana'&&tab==='katakana');return <button key={id} onClick={()=>navigate(id==='hiragana'&&tab==='katakana'?'katakana':id)} aria-current={active?'page':undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${active?'bg-rose-50 text-rose-600':'text-stone-600'}`}><Icon size={19}/>{label}</button>})}
      <button ref={trigger} onClick={()=>setOpen(true)} aria-label="더보기 메뉴 열기" aria-expanded={open} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${['handwriting','quiz','pronunciation'].includes(tab)?'bg-rose-50 text-rose-600':'text-stone-600'}`}><Menu size={19}/>더보기</button>
    </nav>
    {open&&<div className="mobile-more-overlay fixed inset-0 z-50 flex items-end justify-center bg-stone-900/30" onClick={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <div ref={sheet} role="dialog" aria-modal="true" aria-labelledby="more-menu-title" className="mobile-more-sheet w-full max-w-lg overflow-y-auto rounded-3xl bg-cream p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between"><h2 id="more-menu-title" className="text-lg font-black">학습 메뉴</h2><button aria-label="메뉴 닫기" onClick={()=>setOpen(false)} className="rounded-xl p-2"><X size={20}/></button></div>
        <div className="grid grid-cols-2 gap-2">{[...extra,...items.filter(item=>item.id!=='home')].map(({id,label,icon:Icon})=><button key={id} onClick={()=>navigate(id)} className={`flex min-h-14 items-center gap-2 rounded-2xl border p-3 text-left text-sm font-bold ${tab===id?'border-rose-300 bg-rose-50 text-rose-700':'border-orange-100 bg-white'}`}><Icon size={18}/>{label}</button>)}</div>
      </div>
    </div>}
  </>
}
