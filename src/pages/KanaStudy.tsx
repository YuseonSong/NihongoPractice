import { useEffect, useMemo, useRef } from 'react'
import { Check, ChevronLeft, ChevronRight, Grid3X3, Layers3 } from 'lucide-react'
import { AudioControls } from '../components/AudioControls'
import { kanaAudioId, vocabularyAudioId } from '../audio/catalog'
import { useSavedState } from '../hooks/useSavedState'
import type { KanaCharacter, KanaKind, ScriptType } from '../types'

type Props = {
  onWrite:(script:ScriptType,char:string)=>void
  script:ScriptType
  basic:KanaCharacter[]
  extended?:KanaCharacter[]
  learned:string[]
  toggleLearned:(script:ScriptType,char:string)=>void
  onResume?:(label:string)=>void
}
type StudyView = { mode:'table'|'cards'; filter:KanaKind; char:string; flipped:boolean }
const filters = [['basic','기본 46자'],['dakuten','탁음'],['handakuten','반탁음'],['yoon','요음']] as const

// A keyed child restores the correct saved view when switching scripts.
export function KanaStudy(props:Props){return <KanaStudyContent key={props.script} {...props}/>}

function KanaStudyContent({script,basic,extended=[],learned,toggleLearned,onWrite,onResume}:Props){
  const isKata=script==='katakana', title=isKata?'가타카나':'히라가나'
  const all=useMemo(()=>[...basic,...extended],[basic,extended])
  const validView=(raw:unknown):raw is StudyView=>{
    if(!raw||typeof raw!=='object')return false
    const view=raw as Partial<StudyView>
    return (view.mode==='table'||view.mode==='cards')&&filters.some(([id])=>id===view.filter)&&typeof view.flipped==='boolean'&&all.some(item=>item.char===view.char&&item.kind===view.filter)
  }
  const [view,setView]=useSavedState<StudyView>(`kana-${script}`,{mode:'table',filter:'basic',char:basic[0]?.char??'',flipped:false},validView)
  const filtered=useMemo(()=>view.filter==='basic'?basic:extended.filter(item=>item.kind===view.filter),[basic,extended,view.filter])
  const index=Math.max(0,filtered.findIndex(item=>item.char===view.char)), card=filtered[index]
  const completed=!!card&&learned.includes(card.char)
  const resumeRef=useRef(onResume);resumeRef.current=onResume
  const detailRef=useRef<HTMLElement>(null)
  useEffect(()=>{if(card)resumeRef.current?.(`${title} · ${card.char} · ${view.mode==='cards'?'암기 카드':'문자표'}`)},[title,card?.char,view.mode,view.filter])
  const changeFilter=(filter:KanaKind)=>{
    const first=(filter==='basic'?basic:extended.filter(item=>item.kind===filter))[0]
    if(first)setView(previous=>({...previous,filter,char:first.char,flipped:false}))
  }
  const move=(delta:number)=>{if(filtered.length)setView(previous=>({...previous,char:filtered[(index+delta+filtered.length)%filtered.length].char,flipped:false}))}
  const select=(char:string)=>{
    setView(previous=>({...previous,char,flipped:false}))
    if(window.matchMedia?.('(max-width: 1023px)').matches)detailRef.current?.scrollIntoView?.({behavior:'smooth',block:'nearest'})
  }
  const doneCount=learned.filter(char=>basic.some(item=>item.char===char)).length
  const markLearned=card&&<button type="button" aria-pressed={completed} onClick={()=>toggleLearned(script,card.char)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black ${completed?'bg-emerald-100 text-emerald-700':'bg-ink text-white'}`}><Check size={17}/>{completed?'학습 완료 · 취소하기':'이 문자를 공부했어요'}</button>
  const audio=card&&<div className="mt-5 border-t border-orange-100 pt-4"><AudioControls key={card.char} contentId={kanaAudioId(script,card.char)} label={card.char}/>{card.example&&<details className="mt-3 rounded-xl bg-cream px-4 py-3 text-left"><summary className="cursor-pointer text-sm font-bold">예시 단어 · {card.example.word}</summary><p className="mt-3 font-black">{card.example.word} <span className="text-sm font-normal text-stone-500">{card.example.meaning}</span></p><p className="mt-1 text-sm text-stone-500">{card.example.reading}</p><AudioControls key={card.example.word} contentId={vocabularyAudioId(card.example.word)} label={card.example.word}/></details>}</div>
  return <main className="mx-auto max-w-6xl px-4 pb-28 pt-7 sm:px-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-bold text-rose-500">{isKata?'외래어를 읽는 문자':'일본어의 첫 문자'}</p><h1 className="mt-1 text-3xl font-black">{title} 학습</h1><p className="mt-2 text-sm text-stone-500">기본 문자 {doneCount}/{basic.length} 완료 · 문자를 골라 듣고 익혀 보세요.</p></div>
      <div className="flex self-start rounded-xl bg-white p-1 shadow-sm" aria-label="학습 화면 선택">
        <button type="button" aria-pressed={view.mode==='table'} onClick={()=>setView(previous=>({...previous,mode:'table'}))} className={`flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${view.mode==='table'?'bg-ink text-white':'text-stone-500'}`}><Grid3X3 size={16}/>문자표</button>
        <button type="button" aria-pressed={view.mode==='cards'} onClick={()=>setView(previous=>({...previous,mode:'cards'}))} className={`flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${view.mode==='cards'?'bg-ink text-white':'text-stone-500'}`}><Layers3 size={16}/>암기 카드</button>
      </div>
    </div>
    {extended.length>0&&<div className="mt-5 flex flex-wrap gap-2" aria-label="문자 종류">{filters.map(([id,label])=><button type="button" key={id} aria-pressed={view.filter===id} onClick={()=>changeFilter(id)} className={`min-h-10 rounded-full px-4 py-2 text-sm font-bold ${view.filter===id?'bg-rose-400 text-white':'border border-orange-100 bg-white text-stone-500'}`}>{label}</button>)}</div>}
    {view.mode==='table'?<div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)]">
      <section aria-label={`${title} 문자 선택`} className="order-2 rounded-3xl border border-orange-100 bg-white p-4 sm:p-5 lg:order-1">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-black">문자 고르기</h2><span className="text-xs text-stone-500">✓ 공부한 문자</span></div>
        {view.filter==='basic'&&<div aria-hidden="true" className="mb-2 grid grid-cols-5 text-center text-xs font-bold text-stone-400">{['a','i','u','e','o'].map(vowel=><span key={vowel}>{vowel}</span>)}</div>}
        <div className="space-y-1.5">{[...new Set(filtered.map(item=>item.group))].map(group=>{
          const items=filtered.filter(item=>item.group===group)
          const positions=view.filter==='basic'?items.map(item=>({item,column:item.romaji==='n'?1:Math.max(1,['a','i','u','e','o'].indexOf(item.romaji.slice(-1))+1)})):items.map(item=>({item,column:undefined}))
          return <div key={group} className="grid grid-cols-5 gap-1.5">{positions.map(({item,column})=><button type="button" key={item.char} aria-label={`선택 ${item.char}`} aria-pressed={card?.char===item.char} onClick={()=>select(item.char)} style={column?{gridColumn:column}:undefined} className={`relative min-h-14 rounded-xl border px-1 py-2 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 ${card?.char===item.char?'border-rose-400 bg-rose-100 text-rose-700':'border-orange-100 bg-cream/40 hover:bg-orange-50'}`}><span className={`block leading-tight ${item.char.length>1?'text-xl':'text-2xl'}`} lang="ja">{item.char}</span><span className="mt-0.5 block text-[11px] font-bold text-stone-500">{item.romaji}</span>{learned.includes(item.char)&&<Check size={12} aria-hidden="true" className="absolute right-1 top-1 text-emerald-600"/>}</button>)}</div>
        })}</div>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">문자를 선택해도 완료로 바뀌지 않아요. 충분히 익힌 뒤 ‘공부했어요’를 눌러 주세요.</p>
      </section>
      {card&&<section ref={detailRef} aria-label="선택한 문자" className="order-1 rounded-3xl border border-orange-100 bg-white p-5 text-center shadow-soft sm:p-7 lg:sticky lg:top-24 lg:order-2">
        <div className="flex items-center justify-between gap-2"><button type="button" aria-label="이전 문자" onClick={()=>move(-1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-stone-100 px-3 text-sm font-bold text-stone-600"><ChevronLeft size={16}/>이전</button><div className="text-xs font-bold text-stone-400"><p>{card.group}</p><p className="mt-1">{index+1} / {filtered.length}</p></div><button type="button" aria-label="다음 문자" onClick={()=>move(1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-stone-100 px-3 text-sm font-bold text-stone-600">다음<ChevronRight size={16}/></button></div>
        <p className="mt-4 text-8xl leading-tight" lang="ja">{card.char}</p><p className="mt-3 text-2xl font-black text-rose-500">{card.romaji} <span className="ml-1 text-base font-semibold text-stone-500">{card.sound}</span></p><p className="mt-3 rounded-xl bg-cream p-3 text-sm leading-relaxed text-stone-600">{card.tip}</p>
        {audio}<div className="mt-5 flex flex-wrap justify-center gap-2">{markLearned}<button type="button" onClick={()=>onWrite(script,card.char)} className="writing-button">직접 써보기 · {card.char}</button></div>
        <p className="mt-3 text-xs text-stone-400">손글씨 채점은 あ・い・う・え・お만 지원해요.</p>
      </section>}
    </div>:card&&<section ref={detailRef} aria-label="암기 카드 학습" className="mx-auto mt-6 max-w-xl text-center">
      <div className="mb-3 flex justify-between text-sm font-bold text-stone-400"><span>{index+1} / {filtered.length}</span><span>{card.group}</span></div>
      <button type="button" aria-label="암기 카드 뒤집기" aria-pressed={view.flipped} onClick={()=>setView(previous=>({...previous,flipped:!previous.flipped}))} className={`min-h-72 w-full rounded-[2rem] border p-7 shadow-soft transition ${view.flipped?'border-rose-300 bg-gradient-to-br from-rose-400 to-orange-300 text-white':'border-orange-100 bg-white'}`}>
        {view.flipped?<><span className="block text-6xl font-black">{card.romaji}</span><span className="mt-3 block text-xl font-black">“{card.sound}”</span><span className="mt-5 block rounded-2xl bg-white/20 px-4 py-3 text-sm">{card.tip}</span></>:<><span className="block text-8xl" lang="ja">{card.char}</span><span className="mt-6 block text-sm font-bold text-stone-400">눌러서 발음 표기 확인</span></>}
      </button>
      {audio}<div className="mt-5 flex items-center justify-between gap-2"><button type="button" aria-label="이전 문자" onClick={()=>move(-1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white shadow-sm"><ChevronLeft/></button>{markLearned}<button type="button" aria-label="다음 문자" onClick={()=>move(1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white shadow-sm"><ChevronRight/></button></div>
      <button type="button" onClick={()=>onWrite(script,card.char)} className="writing-button mt-4">직접 써보기 · {card.char}</button>
    </section>}
  </main>
}
