import { useEffect, useState } from 'react'
import type { Progress, QuizItemStat, QuizScope, ScriptType } from '../types'
import { ALGORITHM_VERSION, supportedWriting } from '../utils/handwriting'

const KEY = 'hiragana-step-progress-v1'
const emptyQuizStats = () => ({ hiragana: { correct: 0, total: 0 }, katakana: { correct: 0, total: 0 }, conversation: { correct: 0, total: 0 }, grammar: { correct: 0, total: 0 } })
export const defaultProgress: Progress = { quizItems:{}, handwriting: {}, learned: [], quizCorrect: 0, quizTotal: 0, streak: 0, lastStudyDate: null, katakanaLearned: [], conversationLearned: [], favorites: [], completionDates: {}, quizStats: emptyQuizStats(), grammarLearned: [], sentenceMistakes: [], builderCorrect: 0 }

export function migrateProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return defaultProgress
  const saved = raw as Partial<Progress>
  const quizItems:Record<string,QuizItemStat>={}
  if(saved.quizItems&&typeof saved.quizItems==='object')for(const [key,item] of Object.entries(saved.quizItems)){
    if(item&&['hiragana','katakana','conversation','grammar'].includes(item.scope)&&typeof item.id==='string'&&key===`${item.scope}:${item.id}`&&Number.isFinite(item.correct)&&item.correct>=0&&Number.isFinite(item.wrong)&&item.wrong>=0&&typeof item.lastCorrect==='boolean'&&typeof item.updatedAt==='string')quizItems[key]=item
  }
  return {
    ...defaultProgress,
    ...saved,
    quizItems,
    handwriting: saved.handwriting && typeof saved.handwriting === 'object' ? saved.handwriting : {},
    learned: Array.isArray(saved.learned) ? saved.learned : [],
    katakanaLearned: Array.isArray(saved.katakanaLearned) ? saved.katakanaLearned : [],
    conversationLearned: Array.isArray(saved.conversationLearned) ? saved.conversationLearned : [],
    favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
    grammarLearned: Array.isArray(saved.grammarLearned) ? saved.grammarLearned : [],
    sentenceMistakes: Array.isArray(saved.sentenceMistakes) ? saved.sentenceMistakes : [],
    builderCorrect: Number.isFinite(saved.builderCorrect) ? saved.builderCorrect! : 0,
    completionDates: saved.completionDates ?? {},
    quizStats: { ...emptyQuizStats(), ...(saved.quizStats??{hiragana:{correct:saved.quizCorrect??0,total:saved.quizTotal??0}}) },
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => {
    try { const saved = localStorage.getItem(KEY); return saved ? migrateProgress(JSON.parse(saved)) : defaultProgress }
    catch { return defaultProgress }
  })
  useEffect(() => { try{localStorage.setItem(KEY, JSON.stringify(progress))}catch{} }, [progress])

  const touchStudyDay = (current: Progress) => {
    const today = new Date().toLocaleDateString('sv-SE')
    if (current.lastStudyDate === today) return current
    const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = yesterdayDate.toLocaleDateString('sv-SE')
    return { ...current, lastStudyDate: today, streak: current.lastStudyDate === yesterday ? current.streak + 1 : 1 }
  }
  const toggleItem = (field: 'learned'|'katakanaLearned'|'conversationLearned'|'grammarLearned', id: string) => setProgress(current => {
    const exists = current[field].includes(id)
    const list = exists ? current[field].filter(item => item !== id) : [...current[field], id]
    const completionDates = { ...current.completionDates }
    const dateKey = `${field}:${id}`
    if (exists) delete completionDates[dateKey]
    else completionDates[dateKey] = new Date().toLocaleDateString('sv-SE')
    return touchStudyDay({ ...current, [field]: list, completionDates })
  })
  const toggleKanaLearned = (script: ScriptType, char: string) => toggleItem(script === 'hiragana' ? 'learned' : 'katakanaLearned', char)
  const markKanaLearned=(script:ScriptType,char:string)=>setProgress(current=>{
    const field=script==='hiragana'?'learned':'katakanaLearned'
    if(current[field].includes(char))return touchStudyDay(current)
    return touchStudyDay({...current,[field]:[...current[field],char],completionDates:{...current.completionDates,[`${field}:${char}`]:new Date().toLocaleDateString('sv-SE')}})
  })
  const toggleConversationLearned = (id: string) => toggleItem('conversationLearned', id)
  const toggleFavorite = (id: string) => setProgress(current => touchStudyDay({ ...current, favorites: current.favorites.includes(id) ? current.favorites.filter(item => item !== id) : [...current.favorites, id] }))
  const recordAnswer = (scope: QuizScope|'grammar', correct: boolean,id?:string) => setProgress(current => {
    const key=`${scope}:${id}`, previous=current.quizItems[key]
    const quizItems=id&&scope!=='grammar'?{...current.quizItems,[key]:{scope,id,correct:(previous?.correct??0)+Number(correct),wrong:(previous?.wrong??0)+Number(!correct),lastCorrect:correct,updatedAt:new Date().toISOString()}}:current.quizItems
    return touchStudyDay({ ...current,quizItems, quizTotal: current.quizTotal + 1, quizCorrect: current.quizCorrect + Number(correct), quizStats: { ...current.quizStats, [scope]: { total: current.quizStats[scope].total + 1, correct: current.quizStats[scope].correct + Number(correct) } } })
  })
  const toggleGrammarLearned = (id:string) => toggleItem('grammarLearned',id)
  const recordBuilder = (id:string,correct:boolean) => setProgress(current=>touchStudyDay({...current,builderCorrect:current.builderCorrect+Number(correct),sentenceMistakes:correct?current.sentenceMistakes.filter(item=>item!==id):current.sentenceMistakes.includes(id)?current.sentenceMistakes:[...current.sentenceMistakes,id]}))
  const reset = () => setProgress(defaultProgress)
  const recordHandwriting = (char:string, score:number) => {
    if(!supportedWriting.includes(char)||!Number.isFinite(score)||score<0||score>100) return
    setProgress(current=>{
      const previous=current.handwriting[char]
      return touchStudyDay({...current,handwriting:{...current.handwriting,[char]:{
        attempts:(previous?.attempts??0)+1,
        best:Math.max(previous?.best??0,score),latest:score,sum:(previous?.sum??0)+score,
        lastPracticed:new Date().toISOString(),version:ALGORITHM_VERSION,
      }}})
    })
  }
  const today = new Date().toLocaleDateString('sv-SE')
  const todayLearnedCount = Object.values(progress.completionDates).filter(date => date === today).length
  return { progress, toggleKanaLearned, markKanaLearned,toggleConversationLearned, toggleFavorite, toggleGrammarLearned, recordBuilder, recordAnswer, recordHandwriting, reset, todayLearnedCount }
}
