import { BarChart3, BookOpen, Languages, MessageCircle, Brain, Star, Flower2 } from 'lucide-react'
import type { Tab } from '../types'

const items = [
 { id: 'home', label: '홈', icon: BarChart3 }, { id: 'hiragana', label: '히라가나', icon: BookOpen },
 { id: 'katakana', label: '가타카나', icon: Languages }, { id: 'conversation', label: '일상 회화', icon: MessageCircle },
 { id: 'quiz', label: '퀴즈', icon: Brain }, { id: 'review', label: '복습', icon: Star },
] as const
export function Navigation({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
 return <>
  <header className="sticky top-0 z-30 border-b border-orange-100 bg-cream/90 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
   <button onClick={()=>setTab('home')} className="flex items-center gap-2" aria-label="홈으로"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400 text-white"><Flower2 size={20}/></span><span className="text-xl font-black tracking-tight">Nihongo Mate</span></button>
   <nav className="hidden gap-1 lg:flex">{items.map(({id,label,icon:Icon})=><button key={id} onClick={()=>setTab(id)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${tab===id?'bg-rose-100 text-rose-600':'text-stone-500 hover:bg-white'}`}><Icon size={16}/>{label}</button>)}</nav>
  </div></header>
  <nav className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-6 rounded-2xl border border-orange-100 bg-white/95 p-1.5 shadow-soft backdrop-blur lg:hidden">{items.map(({id,label,icon:Icon})=><button key={id} onClick={()=>setTab(id)} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-bold sm:text-[11px] ${tab===id?'bg-rose-50 text-rose-500':'text-stone-400'}`}><Icon size={18}/><span className="truncate">{label}</span></button>)}</nav>
 </>
}