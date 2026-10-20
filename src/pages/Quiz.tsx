import { useEffect, useRef } from 'react'
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { AudioControls } from '../components/AudioControls'
import { useSavedState } from '../hooks/useSavedState'
import type { Progress, QuizLaunch, QuizScope } from '../types'
import { answerQuiz, getQuizItem, makeQuizSession, modeLabels, nextQuizQuestion, quizPool, scopeLabels, SELF_REVIEW, validSavedQuiz } from '../utils/quizSession'
import type { QuizMode, SavedQuiz } from '../utils/quizSession'

type Props={progress:Progress;recordAnswer:(scope:QuizScope,correct:boolean,id?:string)=>void;initialRequest?:QuizLaunch;onResume?:(label:string)=>void;onLearn?:(scope:QuizScope)=>void}
const initial:SavedQuiz={scope:'hiragana',mode:'learned',size:5,session:null,requestNonce:-1}
export function Quiz({progress,recordAnswer,initialRequest,onResume,onLearn}:Props){
  const [saved,setSaved]=useSavedState('quiz',initial,validSavedQuiz)
  const current=useRef(saved);current.current=saved
  const update=(next:SavedQuiz)=>{current.current=next;setSaved(next)}
  const session=saved.session,question=session?.questions[session.index],item=session&&question?getQuizItem(session.scope,question.id):undefined
  const pool=quizPool(progress,saved.scope,saved.mode)
  const result=!!session&&session.index===session.questions.length
  const correctCount=session?.questions.filter(question=>question.answer===question.id).length??0
  const selfCheck=question?.options.length===1
  const answered=question?.answer!==null
  useEffect(()=>{
    if(!initialRequest||current.current.requestNonce===initialRequest.nonce)return
    const mode=initialRequest.mode??'learned'
    const next={...current.current,scope:initialRequest.scope,mode,requestNonce:initialRequest.nonce,session:makeQuizSession(initialRequest.scope,mode,quizPool(progress,initialRequest.scope,mode,initialRequest.ids),current.current.size)}
    current.current=next;setSaved(next)
  },[initialRequest,progress,setSaved])
  useEffect(()=>{
    if(session&&!result)onResume?.(`${scopeLabels[session.scope]} 퀴즈 ${session.index+1}/${session.questions.length}`)
  },[session?.id,session?.index,result,onResume])
  const start=()=>update({...current.current,session:makeQuizSession(saved.scope,saved.mode,pool,saved.size)})
  const choose=(answer:string)=>{
    const state=current.current,active=state.session
    if(!active)return
    const next=answerQuiz(active,answer)
    if(next===active)return
    update({...state,session:next})
    recordAnswer(active.scope,answer===active.questions[active.index].id,active.questions[active.index].id)
  }
  const reveal=()=>{
    const state=current.current,active=state.session
    if(!active)return
    update({...state,session:{...active,questions:active.questions.map((value,index)=>index===active.index?{...value,revealed:true}:value)}})
  }
  const empty=saved.mode==='learned'?'아직 배운 항목이 없어요. 학습 화면에서 완료한 항목만 여기에서 출제돼요.':saved.mode==='mistakes'?'다시 풀 오답이 없어요. 다음 퀴즈에서 틀린 항목이 생기면 이곳에서 연습할 수 있어요.':'선택한 범위에 문제가 없어요.'
  return <main className="mx-auto max-w-3xl px-5 pb-28 pt-9">
    <p className="text-sm font-bold text-rose-500">짧게 풀고, 틀린 것만 다시</p><h1 className="mt-1 text-3xl font-black">배운 내용을 확인해요</h1>
    <section aria-label="퀴즈 설정" className="mt-6 rounded-3xl border border-orange-100 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-bold text-stone-600">학습 종류<select aria-label="퀴즈 학습 종류" value={saved.scope} onChange={event=>update({...saved,scope:event.target.value as QuizScope})} className="mt-2 w-full rounded-xl border border-orange-100 bg-cream px-3 py-3 text-stone-800">{Object.entries(scopeLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
        <label className="text-sm font-bold text-stone-600">출제 범위<select aria-label="퀴즈 출제 범위" value={saved.mode} onChange={event=>update({...saved,mode:event.target.value as QuizMode})} className="mt-2 w-full rounded-xl border border-orange-100 bg-cream px-3 py-3 text-stone-800">{Object.entries(modeLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
        <label className="text-sm font-bold text-stone-600">문제 수<select aria-label="퀴즈 문제 수" value={saved.size} onChange={event=>update({...saved,size:Number(event.target.value) as 5|10})} className="mt-2 w-full rounded-xl border border-orange-100 bg-cream px-3 py-3 text-stone-800"><option value={5}>5문제</option><option value={10}>10문제</option></select></label></div>
      <p className="mt-3 text-xs leading-relaxed text-stone-500">{saved.mode==='learned'?'학습 완료로 표시한 항목 안에서만 문제와 보기를 골라요.':saved.mode==='basic'?saved.scope==='conversation'?'기본 범위는 인사 및 자기소개 10문장이에요.':'기본 46자만 출제해요.':saved.mode==='all'?saved.scope==='katakana'?'탁음·반탁음·요음을 포함한 모든 문자예요. 배우지 않은 문자도 나와요.':'배우지 않은 항목을 포함한 전체 범위예요.':'가장 최근에 틀렸고, 아직 다시 맞히지 않은 항목만 출제해요.'} 같은 문제는 한 회차에 반복되지 않아요.</p>
      {!!pool.length&&<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-stone-500">출제 가능 {pool.length}개 · 이번 회차 {Math.min(pool.length,saved.size)}문제</p><button onClick={start} className="rounded-xl bg-rose-400 px-5 py-3 text-sm font-black text-white">{session&&!result?'새 회차 시작':'퀴즈 시작'}</button></div>}
      {!pool.length&&<div className="mt-4 rounded-2xl bg-cream p-4"><p role="status" className="text-sm font-semibold leading-relaxed text-stone-600">{empty}</p>{onLearn&&<button onClick={()=>onLearn(saved.scope)} className="mt-3 text-sm font-black text-rose-500">{scopeLabels[saved.scope]} 배우러 가기 →</button>}</div>}
      {session&&!result&&<p className="mt-3 text-xs text-stone-500">진행 중인 회차는 아래에 있어요. 새 회차를 시작하면 현재 회차를 바꿔요.</p>}
    </section>
    {session&&result&&<section aria-label="퀴즈 결과" className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-7 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={38}/><h2 className="mt-3 text-2xl font-black">이번 학습을 마쳤어요!</h2><p className="mt-2 font-bold text-stone-600">{scopeLabels[session.scope]} · {modeLabels[session.mode]} · {session.questions.length}문제 중 {correctCount}개 정답</p>{session.questions.some(value=>value.options.length===1)&&<p className="mt-2 text-xs text-stone-500">항목이 하나인 문제는 직접 기억을 확인한 자가 평가예요.</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">{session.questions.map(value=>{const target=getQuizItem(session.scope,value.id)!;return <span key={value.id} className={`rounded-xl px-3 py-2 text-sm font-bold ${value.answer===value.id?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-600'}`}>{target.prompt} {value.answer===value.id?'✓':'다시 보기'}</span>})}</div>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={()=>update({...saved,session:makeQuizSession(session.scope,session.mode,session.poolIds.flatMap(id=>{const target=getQuizItem(session.scope,id);return target?[target]:[]}),session.questions.length)})} className="inline-flex items-center gap-2 rounded-xl bg-rose-400 px-5 py-3 font-black text-white"><RotateCcw size={17}/>같은 범위 다시 풀기</button>{session.questions.some(value=>value.answer!==value.id)&&<button onClick={()=>{const missed=session.questions.filter(value=>value.answer!==value.id).map(value=>getQuizItem(session.scope,value.id)!);update({...saved,scope:session.scope,mode:'mistakes',session:makeQuizSession(session.scope,'mistakes',missed,missed.length)})}} className="rounded-xl bg-orange-50 px-5 py-3 font-black text-rose-600">이번 오답 다시 풀기</button>}</div></section>}
    {session&&question&&item&&<section aria-label="퀴즈 문제" className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-soft md:p-9"><div className="mb-4 flex justify-between text-sm font-bold text-stone-500"><span>{scopeLabels[session.scope]} · {modeLabels[session.mode]}</span><span>{session.index+1} / {session.questions.length}</span></div>
      <div role="progressbar" aria-label="퀴즈 진행" aria-valuemin={0} aria-valuemax={session.questions.length} aria-valuenow={session.index} className="mb-5 h-2 overflow-hidden rounded-full bg-orange-50"><div className="h-full bg-rose-300" style={{width:`${session.index/session.questions.length*100}%`}}/></div>
      <div className="grid min-h-44 place-items-center rounded-3xl bg-cream p-6 text-center"><div><p className={`${session.scope==='conversation'?'text-2xl md:text-4xl':'text-8xl'} font-black leading-relaxed`}>{item.prompt}</p><p className="mt-3 text-sm font-semibold text-stone-500">{selfCheck?'정답을 보기 전에 소리와 뜻을 떠올려 보세요.':session.scope==='conversation'?'이 문장의 뜻을 골라 보세요.':'이 글자의 로마자 발음을 골라 보세요.'}</p></div></div>
      {(!selfCheck||question.revealed)&&<AudioControls key={`${session.id}:${session.index}`} contentId={item.audioId} label={item.prompt}/>}
      {selfCheck?<div className="mt-5 text-center"><p className="text-sm leading-relaxed text-stone-500">이 범위에는 보기로 쓸 다른 발음이 없어 자가 확인으로 연습해요.</p>{!question.revealed?<button onClick={reveal} className="mt-4 rounded-xl bg-rose-400 px-6 py-3 font-black text-white">정답 확인</button>:<><p className="mt-4 text-2xl font-black">{item.label}</p><p className="mt-2 text-sm text-stone-600">{item.note}</p>{!answered&&<div className="mt-4 flex flex-wrap justify-center gap-3"><button onClick={()=>choose(item.id)} className="rounded-xl bg-emerald-50 px-5 py-3 font-black text-emerald-700">기억했어요</button><button onClick={()=>choose(SELF_REVIEW)} className="rounded-xl bg-rose-50 px-5 py-3 font-black text-rose-600">다시 볼게요</button></div>}</>}</div>:<div className="mt-6 grid gap-3 sm:grid-cols-2">{question.options.map(id=>{const option=getQuizItem(session.scope,id)!;const answer=id===item.id;const chosen=id===question.answer;const style=answered&&answer?'border-emerald-400 bg-emerald-50 text-emerald-700':chosen?'border-red-400 bg-red-50 text-red-600':'border-orange-100 hover:border-rose-300';return <button key={id} disabled={answered} onClick={()=>choose(id)} className={`min-h-16 rounded-2xl border-2 px-4 py-3 font-black transition ${style}`}>{option.label}</button>})}</div>}
      {answered&&<div role="status" className={`mt-6 rounded-2xl p-5 ${question.answer===item.id?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}><div className="flex items-center gap-2 font-black">{question.answer===item.id?<CheckCircle2/>:<XCircle/>}{selfCheck?question.answer===item.id?'기억한 내용을 확인했어요.':'다음 복습에서 다시 만나 봐요.':question.answer===item.id?'정답이에요!':`정답은 “${item.label}”이에요.`}</div>{!selfCheck&&<p className="mt-2 text-sm font-semibold opacity-80">{item.note}</p>}<button onClick={()=>update({...current.current,session:nextQuizQuestion(current.current.session!)})} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black shadow-sm">{session.index===session.questions.length-1?'결과 보기':'다음 문제'}<ArrowRight size={16}/></button></div>}
    </section>}
  </main>
}
