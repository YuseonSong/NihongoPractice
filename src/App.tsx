import { useState } from 'react'
import { Navigation } from './components/Navigation'
import { hiragana } from './data/hiragana'
import { katakanaBasic, katakanaExtended } from './data/katakana'
import { useProgress } from './hooks/useProgress'
import { Conversation } from './pages/Conversation'
import { Home } from './pages/Home'
import { KanaStudy } from './pages/KanaStudy'
import { Quiz } from './pages/Quiz'
import { Review } from './pages/Review'
import type { Tab } from './types'

export default function App(){const[tab,setTab]=useState<Tab>('home');const{progress,toggleKanaLearned,toggleConversationLearned,toggleFavorite,recordAnswer,reset,todayLearnedCount}=useProgress();return <div className="min-h-screen bg-cream text-ink"><Navigation tab={tab} setTab={setTab}/>{tab==='home'&&<Home progress={progress} todayLearnedCount={todayLearnedCount} setTab={setTab} reset={reset}/>} {tab==='hiragana'&&<KanaStudy script="hiragana" basic={hiragana} learned={progress.learned} toggleLearned={toggleKanaLearned}/>} {tab==='katakana'&&<KanaStudy script="katakana" basic={katakanaBasic} extended={katakanaExtended} learned={progress.katakanaLearned} toggleLearned={toggleKanaLearned}/>} {tab==='conversation'&&<Conversation progress={progress} toggleLearned={toggleConversationLearned} toggleFavorite={toggleFavorite}/>} {tab==='quiz'&&<Quiz recordAnswer={recordAnswer}/>} {tab==='review'&&<Review progress={progress} toggleFavorite={toggleFavorite} setTab={setTab}/>}<footer className="hidden border-t border-orange-100 py-7 text-center text-xs font-semibold text-stone-400 lg:block">Nihongo Mate · 매일 조금씩, 일본어와 가까워져요.</footer></div>}