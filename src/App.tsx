import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AudioCredits } from './components/AudioCredits'
import { Navigation } from './components/Navigation'
import { OfflineSupport } from './components/OfflineSupport'
import { hiragana } from './data/hiragana'
import { katakanaBasic, katakanaExtended } from './data/katakana'
import { useProgress } from './hooks/useProgress'
import { clearSavedViews, useSavedState } from './hooks/useSavedState'
import { Conversation } from './pages/Conversation'
import { Handwriting } from './pages/Handwriting'
import { Home } from './pages/Home'
import { Grammar } from './pages/Grammar'
import { SentenceBuilder } from './pages/SentenceBuilder'
import { KanaStudy } from './pages/KanaStudy'
import { PronunciationGuide } from './pages/PronunciationGuide'
import { Quiz } from './pages/Quiz'
import { Review } from './pages/Review'
import type { QuizLaunch, ResumeTarget, ScriptType, Tab } from './types'

const labels:Record<Exclude<Tab,'home'>,string>={hiragana:'히라가나',katakana:'가타카나',conversation:'일상 회화',grammar:'기초 문법',builder:'문장 만들기',handwriting:'직접 그려보기',quiz:'퀴즈',review:'오답 복습',pronunciation:'발음 길잡이'}
type WritingTarget={script:ScriptType;char:string}
const initialWriting:WritingTarget={script:'hiragana',char:'あ'}
const validResume=(raw:unknown):raw is ResumeTarget|null=>raw===null||!!raw&&typeof raw==='object'&&'tab' in raw&&typeof raw.tab==='string'&&Object.hasOwn(labels,raw.tab)&&'label' in raw&&typeof raw.label==='string'&&raw.label.length<=160
const validTarget=(raw:unknown):raw is WritingTarget=>!!raw&&typeof raw==='object'&&'script' in raw&&'char' in raw&&typeof raw.char==='string'&&(raw.script==='hiragana'?hiragana:raw.script==='katakana'?[...katakanaBasic,...katakanaExtended]:[]).some(item=>item.char===raw.char)
const scrollKey=(tab:Tab)=>`nihongo-mate-view-v1:scroll-${tab}`

export default function App(){
  const [tab,setTab]=useState<Tab>('home')
  const [epoch,setEpoch]=useState(0)
  const [resume,setResume]=useSavedState<ResumeTarget|null>('resume',null,validResume)
  const [writingTarget,setWritingTarget]=useSavedState('writing-target',initialWriting,validTarget)
  const [quizRequest,setQuizRequest]=useState<QuizLaunch>()
  const nonce=useRef(Date.now())
  const {progress,toggleKanaLearned,toggleConversationLearned,toggleFavorite,recordAnswer,recordHandwriting,toggleGrammarLearned,recordBuilder,reset,todayLearnedCount}=useProgress()
  const remember=useCallback((next:Exclude<Tab,'home'>,label:string)=>setResume(previous=>previous?.tab===next&&previous.label===label?previous:{tab:next,label}),[setResume])
  const navigate=useCallback((next:Tab)=>{
    if(next===tab)return
    try{localStorage.setItem(scrollKey(tab),String(window.scrollY))}catch{}
    if(next!=='home')remember(next,labels[next])
    setTab(next)
  },[tab,remember])
  useLayoutEffect(()=>{
    let position=0
    try{position=Number(localStorage.getItem(scrollKey(tab)))||0}catch{}
    window.scrollTo({top:Math.max(0,position),behavior:'instant'})
  },[tab,epoch])
  const resumeCallbacks=useMemo(()=>Object.fromEntries(Object.keys(labels).map(key=>[key,(label:string)=>remember(key as Exclude<Tab,'home'>,label)])) as Record<Exclude<Tab,'home'>,(label:string)=>void>,[remember])
  const startQuiz=(request:Omit<QuizLaunch,'nonce'>)=>{
    try{localStorage.setItem(scrollKey('quiz'),'0')}catch{}
    if(tab==='quiz')window.scrollTo({top:0,behavior:'instant'})
    setQuizRequest({...request,nonce:++nonce.current})
    navigate('quiz')
  }
  const openWriting=(script:ScriptType,char:string)=>{
    try{localStorage.setItem(scrollKey('handwriting'),'0')}catch{}
    setWritingTarget({script,char});navigate('handwriting')
  }
  const updateWritingTarget=useCallback((script:ScriptType,char:string)=>{
    setWritingTarget(previous=>previous.script===script&&previous.char===char?previous:{script,char})
    remember('handwriting',`직접 그려보기 · ${char}`)
  },[setWritingTarget,remember])
  const resetAll=()=>{
    reset();clearSavedViews();setResume(null);setWritingTarget(initialWriting);setQuizRequest(undefined);setTab('home');setEpoch(value=>value+1)
  }
  return <div className="min-h-screen bg-cream text-ink">
    <Navigation tab={tab} setTab={navigate}/>
    <div key={epoch}>
      {tab==='home'&&<Home progress={progress} todayLearnedCount={todayLearnedCount} setTab={navigate} reset={resetAll} resume={resume} onContinue={()=>{if(resume)navigate(resume.tab)}}/>}
      {tab==='hiragana'&&<KanaStudy onResume={resumeCallbacks.hiragana} onWrite={openWriting} script="hiragana" basic={hiragana} learned={progress.learned} toggleLearned={toggleKanaLearned}/>}
      {tab==='katakana'&&<KanaStudy onResume={resumeCallbacks.katakana} onWrite={openWriting} script="katakana" basic={katakanaBasic} extended={katakanaExtended} learned={progress.katakanaLearned} toggleLearned={toggleKanaLearned}/>}
      {tab==='grammar'&&<Grammar learned={progress.grammarLearned} toggleLearned={toggleGrammarLearned} recordAnswer={recordAnswer}/>}
      {tab==='builder'&&<SentenceBuilder mistakes={progress.sentenceMistakes} record={recordBuilder}/>}
      {tab==='conversation'&&<Conversation onResume={resumeCallbacks.conversation} progress={progress} toggleLearned={toggleConversationLearned} toggleFavorite={toggleFavorite} onStartQuiz={(ids)=>startQuiz({scope:'conversation',ids})}/>}
      {tab==='pronunciation'&&<PronunciationGuide onStudy={()=>navigate('hiragana')}/>}
      {tab==='quiz'&&<Quiz progress={progress} recordAnswer={recordAnswer} initialRequest={quizRequest} onResume={resumeCallbacks.quiz} onLearn={navigate}/>}
      {tab==='review'&&<Review progress={progress} toggleFavorite={toggleFavorite} setTab={navigate} onStartQuiz={startQuiz}/>}
      {tab==='handwriting'&&<Handwriting initialScript={writingTarget.script} initialChar={writingTarget.char} stats={progress.handwriting} onRecord={recordHandwriting} onTargetChange={updateWritingTarget}/>}
    </div>
    <OfflineSupport/>
    <AudioCredits/>
    <footer className="hidden border-t border-orange-100 py-7 text-center text-xs font-semibold text-stone-500 lg:block">Yuseon's Nihongo · 매일 조금씩, 일본어와 가까워져요.</footer>
  </div>
}
