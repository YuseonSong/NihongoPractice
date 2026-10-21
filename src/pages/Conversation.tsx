import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Heart, Search, Brain } from 'lucide-react'
import { AudioControls } from '../components/AudioControls'
import { conversationAudioId } from '../audio/catalog'
import { allConversationPhrases, conversationCategories } from '../data/conversations'
import audioReadings from '../data/audio-readings.json'
import { useSavedState } from '../hooks/useSavedState'
import type { Progress } from '../types'

type Props={progress:Progress;toggleLearned:(id:string)=>void;toggleFavorite:(id:string)=>void;onResume?:(label:string)=>void;onStartQuiz?:(ids:string[])=>void}
type ConversationView={categoryId:string;phraseId:string;showMeaning:boolean;showReading:boolean;showHelp:boolean}
const readings:Record<string,string>=audioReadings
const validView=(raw:unknown):raw is ConversationView=>{
  if(!raw||typeof raw!=='object')return false
  const view=raw as Partial<ConversationView>
  return typeof view.showMeaning==='boolean'&&typeof view.showReading==='boolean'&&typeof view.showHelp==='boolean'&&conversationCategories.some(category=>category.id===view.categoryId&&category.phrases.some(phrase=>phrase.id===view.phraseId))
}

export function Conversation({progress,toggleLearned,toggleFavorite,onResume,onStartQuiz}:Props){
  const [query,setQuery]=useState('')
  const searchResults=query.trim()?allConversationPhrases.filter(item=>[item.japanese,item.romaji,item.koreanSound,item.meaning,item.situation].some(value=>value.toLowerCase().includes(query.trim().toLowerCase()))).slice(0,20):[]
  const first=conversationCategories[0]
  const [view,setView]=useSavedState<ConversationView>('conversation',{categoryId:first.id,phraseId:first.phrases[0].id,showMeaning:true,showReading:true,showHelp:false},validView)
  const category=conversationCategories.find(item=>item.id===view.categoryId)??first
  const index=Math.max(0,category.phrases.findIndex(item=>item.id===view.phraseId)), phrase=category.phrases[index]
  const completed=progress.conversationLearned.includes(phrase.id), favorite=progress.favorites.includes(phrase.id)
  const categoryDone=category.phrases.filter(item=>progress.conversationLearned.includes(item.id)).length
  const resumeRef=useRef(onResume);resumeRef.current=onResume
  useEffect(()=>{resumeRef.current?.(`회화 · ${category.title} · ${index+1}번째 문장`)},[category.id,phrase.id,index])
  const selectCategory=(id:string)=>{
    const next=conversationCategories.find(item=>item.id===id)
    if(next&&next.id!==category.id)setView(previous=>({...previous,categoryId:id,phraseId:next.phrases[0].id}))
  }
  const move=(delta:number)=>setView(previous=>({...previous,phraseId:category.phrases[(index+delta+category.phrases.length)%category.phrases.length].id}))
  const toggle=(key:'showMeaning'|'showReading'|'showHelp')=>setView(previous=>({...previous,[key]:!previous[key]}))
  return <main className="mx-auto max-w-5xl px-4 pb-28 pt-7 sm:px-5">
    <div><p className="text-sm font-bold text-rose-500">바로 쓰는 일본어</p><h1 className="mt-1 text-3xl font-black">일상 회화 학습</h1><p className="mt-2 text-sm leading-relaxed text-stone-500">일본어 음성을 듣고 따라 말해 보세요. 가나 읽기와 뜻은 필요할 때 숨길 수 있어요.</p></div>
    <div className="relative mt-5"><Search className="absolute left-3 top-3 text-stone-400" size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="일본어·로마자·한국어 뜻 검색" className="min-h-11 w-full rounded-2xl border border-orange-100 bg-white pl-10 pr-4 text-sm outline-none focus:border-rose-300"/>{searchResults.length>0&&<div className="absolute inset-x-0 top-12 z-20 max-h-72 overflow-y-auto rounded-2xl border border-orange-100 bg-white p-2 shadow-soft">{searchResults.map(item=><button key={item.id} onClick={()=>{setView(previous=>({...previous,categoryId:item.categoryId,phraseId:item.id}));setQuery('')}} className="block w-full rounded-xl p-3 text-left hover:bg-rose-50"><span className="font-black" lang="ja">{item.japanese}</span><span className="ml-2 text-sm text-stone-500">{item.meaning}</span></button>)}</div>}</div>
    <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="회화 카테고리">{conversationCategories.map(item=><button type="button" key={item.id} aria-pressed={category.id===item.id} onClick={()=>selectCategory(item.id)} className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${category.id===item.id?'border-rose-300 bg-rose-50 text-rose-700':'border-orange-100 bg-white text-stone-600'}`}><span aria-hidden="true">{item.icon} </span>{item.title}</button>)}</div>
    <section className="mt-4 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">{category.title}</h2><p className="mt-1 text-xs text-stone-500">{category.description}</p></div><div className="flex items-center gap-2"><button onClick={()=>onStartQuiz?.(category.phrases.map(item=>item.id))} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-600"><Brain size={15}/>카테고리 퀴즈</button><p className="text-sm font-bold text-stone-500">{categoryDone}/{category.phrases.length} 학습 완료</p></div></div>
      <div role="progressbar" aria-label={`${category.title} 학습 진도`} aria-valuemin={0} aria-valuemax={category.phrases.length} aria-valuenow={categoryDone} className="mt-3 h-1.5 overflow-hidden rounded-full bg-orange-50"><div className="h-full rounded-full bg-rose-400" style={{width:`${categoryDone/category.phrases.length*100}%`}}/></div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">{phrase.politeness}</span><label className="flex min-w-0 max-w-full items-center gap-2 text-sm font-bold text-stone-500">문장<select aria-label="회화 문장 선택" value={phrase.id} onChange={event=>setView(previous=>({...previous,phraseId:event.target.value}))} className="min-h-10 min-w-0 max-w-64 rounded-lg border border-orange-100 bg-cream px-2 text-ink">{category.phrases.map((item,itemIndex)=><option key={item.id} value={item.id}>{itemIndex+1}. {item.meaning}</option>)}</select></label></div>
      <p className="mt-7 break-keep text-center text-3xl font-black leading-relaxed sm:text-4xl" lang="ja">{phrase.japanese}</p>
      {view.showReading&&readings[phrase.id]&&<p id="conversation-reading" className="mt-3 text-center text-lg leading-relaxed text-rose-600" lang="ja">{readings[phrase.id]}</p>}
      {view.showHelp&&<div id="conversation-help" className="mt-3 text-center"><p className="text-base font-bold text-stone-600">{phrase.romaji}</p><p className="mt-1 text-sm text-stone-500">{phrase.koreanSound}</p><p className="mt-2 text-xs text-stone-400">한국어·로마자 표기는 참고용이에요. 실제 발음은 음성으로 익혀 주세요.</p></div>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" aria-pressed={view.showReading} aria-controls="conversation-reading" onClick={()=>toggle('showReading')} className="min-h-10 rounded-xl bg-stone-100 px-3 py-2 text-xs font-bold">가나 읽기 {view.showReading?'숨기기':'보기'}</button>
        <button type="button" aria-pressed={view.showHelp} aria-controls="conversation-help" onClick={()=>toggle('showHelp')} className="min-h-10 rounded-xl bg-stone-100 px-3 py-2 text-xs font-bold">한국어·로마자 {view.showHelp?'숨기기':'도움말'}</button>
        <button type="button" aria-pressed={view.showMeaning} aria-controls="conversation-meaning" onClick={()=>toggle('showMeaning')} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-stone-100 px-3 py-2 text-xs font-bold">{view.showMeaning?<EyeOff size={15}/>:<Eye size={15}/>}뜻 {view.showMeaning?'숨기기':'보기'}</button>
      </div>
      <div className="mt-4"><AudioControls key={phrase.id} contentId={conversationAudioId(phrase.id)} label={phrase.japanese}/></div>
      {view.showMeaning&&<div id="conversation-meaning" className="mt-6 rounded-2xl bg-cream p-5"><p className="text-xl font-black">{phrase.meaning}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-black text-stone-400">사용 상황</dt><dd className="mt-1 leading-relaxed">{phrase.situation}</dd></div><div><dt className="font-black text-stone-400">표현 포인트</dt><dd className="mt-1 leading-relaxed">{phrase.note}</dd></div><div className="sm:col-span-2"><dt className="font-black text-stone-400">관련 표현</dt><dd className="mt-1 leading-relaxed">{phrase.related}</dd></div></dl></div>}
      <div className="mt-6 flex items-center justify-between gap-2"><button type="button" aria-label="이전 문장" onClick={()=>move(-1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-stone-100"><ChevronLeft/></button><span aria-live="polite" className="text-sm font-bold text-stone-400">{index+1} / {category.phrases.length}</span><button type="button" aria-label="다음 문장" onClick={()=>move(1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-stone-100"><ChevronRight/></button></div>
      <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" aria-label={favorite?'즐겨찾기 취소':'즐겨찾기 추가'} aria-pressed={favorite} onClick={()=>toggleFavorite(phrase.id)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold ${favorite?'bg-rose-100 text-rose-500':'bg-stone-100 text-stone-500'}`}><Heart size={18} fill={favorite?'currentColor':'none'}/>즐겨찾기</button><button type="button" aria-pressed={completed} onClick={()=>toggleLearned(phrase.id)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-black ${completed?'bg-emerald-100 text-emerald-700':'bg-ink text-white'}`}><Check size={17}/>{completed?'학습 완료 · 취소하기':'이 문장을 공부했어요'}</button></div>
    </section>
  </main>
}
