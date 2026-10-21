import { ArrowRight, BookOpen, Brain, Flame, Languages, MessageCircle, RotateCcw, BookMarked } from 'lucide-react'
import { WritingStats } from '../components/WritingStats'
import { katakanaBasic } from '../data/katakana'
import type { Progress, ResumeTarget, Tab } from '../types'

type Props={progress:Progress;todayLearnedCount:number;setTab:(tab:Tab)=>void;reset:()=>void;resume:ResumeTarget|null;onContinue:()=>void}
export function Home({progress,todayLearnedCount,setTab,reset,resume,onContinue}:Props){
  const mistakes=Object.values(progress.quizItems).filter(item=>!item.lastCorrect).length
  const kata=progress.katakanaLearned.filter(char=>katakanaBasic.some(item=>item.char===char)).length
  const sections=[{icon:BookOpen,title:'히라가나',description:'문자표에서 고르고, 한 글자씩 익혀요.',done:progress.learned.length,total:46,tab:'hiragana' as Tab},
    {icon:Languages,title:'가타카나',description:'기본 문자부터 외래어까지 연습해요.',done:kata,total:46,tab:'katakana' as Tab},
    {icon:MessageCircle,title:'일상 회화',description:'가나 읽기와 음성으로 문장을 익혀요.',done:progress.conversationLearned.length,total:200,tab:'conversation' as Tab},
    {icon:BookMarked,title:'기초 문법',description:'조사부터 기본 문형까지 단계별로 익혀요.',done:progress.grammarLearned.length,total:26,tab:'grammar' as Tab}]
  const recommended=sections.reduce((best,item)=>item.done/item.total<best.done/best.total?item:best)
  return <main className="mx-auto max-w-7xl px-5 pb-12 pt-7 md:pt-9">
    <section className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-orange-50 p-6 md:p-8">
      <p className="text-sm font-bold text-rose-600">매일 조금씩, 일본어와 가까워져요</p>
      <h1 className="mt-2 text-3xl font-black md:text-4xl">히라가나 먼저 시작해 볼까요?</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">あ부터 ん까지, 원하는 문자를 자유롭게 골라 듣고 익혀 보세요. 이전·다음 버튼으로 한 글자씩 공부해도 좋아요.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={()=>setTab('hiragana')} className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-black text-white hover:bg-rose-600">히라가나 시작하기<ArrowRight size={17}/></button>
        <button className="writing-button" onClick={()=>setTab('pronunciation')}>발음 길잡이</button>
      </div>
      <button onClick={()=>setTab(recommended.tab)} className="mt-4 flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left"><span><span className="block text-xs font-bold text-amber-700">오늘의 추천 학습</span><span className="mt-1 block text-sm font-black">{recommended.title} 이어서 공부하기</span></span><ArrowRight size={17} className="text-amber-700"/></button>
      {resume&&<div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-rose-100 bg-white/70 p-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold text-stone-500">마지막으로 공부한 곳</p><p className="mt-1 text-sm font-bold text-stone-700">{resume.label}</p></div><button className="writing-button shrink-0" onClick={onContinue}>이어서 학습<ArrowRight size={15}/></button></div>}
    </section>
    <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="학습 요약">
      {[{icon:BookOpen,label:'오늘 학습 표시',value:`${todayLearnedCount}개`},{icon:BookMarked,label:'누적 학습',value:`${progress.learned.length+progress.katakanaLearned.length+progress.conversationLearned.length+progress.grammarLearned.length}개`},{icon:Brain,label:'퀴즈 정답률',value:progress.quizTotal?`${Math.round(progress.quizCorrect/progress.quizTotal*100)}%`:'기록 없음'},
        {icon:Flame,label:'연속 학습',value:progress.streak?`${progress.streak}일`:'시작 전'},{icon:RotateCcw,label:'복습할 오답',value:`${mistakes}개`}].map(({icon:Icon,label,value})=><div key={label} className="rounded-2xl border border-orange-100 bg-white p-4"><div className="flex items-center gap-2 text-xs font-bold text-stone-600"><Icon size={15}/>{label}</div><p className="mt-2 text-xl font-black">{value}</p></div>)}
    </section>
    <section className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{sections.map(({icon:Icon,title,description,done,total,tab})=><button key={tab} onClick={()=>setTab(tab)} className="rounded-2xl border border-orange-100 bg-white p-5 text-left hover:border-rose-200 hover:shadow-soft"><div className="flex items-center justify-between"><Icon size={21} className="text-rose-500"/><span className="text-xs font-bold text-stone-600">학습 표시 {done}/{total}</span></div><h2 className="mt-3 text-lg font-black">{title}</h2><p className="mt-1 text-sm leading-relaxed text-stone-600">{description}</p></button>)}</section>
    <section className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-orange-100 bg-white p-5 sm:flex-row sm:items-center"><div><h2 className="font-black">배운 내용을 기억하고 있나요?</h2><p className="mt-1 text-sm text-stone-600">배운 범위로 짧게 확인하거나, 틀린 항목을 다시 풀어 보세요.</p></div><div className="flex shrink-0 gap-2"><button className="writing-button" onClick={()=>setTab('quiz')}>퀴즈</button><button className="writing-button primary" onClick={()=>setTab('review')}>오답 복습{mistakes?` ${mistakes}개`:''}</button></div></section>
    <div className="mt-5 flex flex-wrap gap-2"><button className="writing-button" onClick={()=>setTab('handwriting')}>직접 그려보기</button><span className="self-center text-xs text-stone-600">히라가나·가타카나 기본 92자를 골라 바로 채점할 수 있어요.</span></div>
    <details className="mt-6 rounded-2xl border border-orange-100 bg-white p-5"><summary className="cursor-pointer text-sm font-bold">상세 학습 기록 및 설정</summary>
      <p className="mt-3 text-sm text-stone-600">학습 표시는 공부한 문자와 문장을 직접 완료로 표시한 기록이에요. 퀴즈 정답률과 손글씨 연습 점수는 따로 확인할 수 있어요.</p>
      <WritingStats stats={progress.handwriting}/>
      <button onClick={()=>{if(confirm('기존 완료·퀴즈·손글씨 기록과 이어하기 위치를 모두 초기화할까요?'))reset()}} className="mt-5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600">학습 기록 초기화</button>
    </details>
  </main>
}
