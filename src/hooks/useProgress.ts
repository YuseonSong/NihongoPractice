import { useEffect, useState } from 'react'
import type { Progress, ScriptType } from '../types'

const KEY = 'hiragana-step-progress-v1'
const emptyQuizStats = () => ({ hiragana: { correct: 0, total: 0 }, katakana: { correct: 0, total: 0 }, conversation: { correct: 0, total: 0 } })
export const defaultProgress: Progress = { learned: [], quizCorrect: 0, quizTotal: 0, streak: 0, lastStudyDate: null, katakanaLearned: [], conversationLearned: [], favorites: [], completionDates: {}, quizStats: emptyQuizStats() }

function migrateProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return defaultProgress
  const saved = raw as Partial<Progress>
  return {
    ...defaultProgress,
    ...saved,
    learned: Array.isArray(saved.learned) ? saved.learned : [],
    katakanaLearned: Array.isArray(saved.katakanaLearned) ? saved.katakanaLearned : [],
    conversationLearned: Array.isArray(saved.conversationLearned) ? saved.conversationLearned : [],
    favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
    completionDates: saved.completionDates ?? {},
    quizStats: saved.quizStats ?? { ...emptyQuizStats(), hiragana: { correct: saved.quizCorrect ?? 0, total: saved.quizTotal ?? 0 } },
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => {
    try { const saved = localStorage.getItem(KEY); return saved ? migrateProgress(JSON.parse(saved)) : defaultProgress }
    catch { return defaultProgress }
  })
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(progress)) }, [progress])

  const touchStudyDay = (current: Progress) => {
    const today = new Date().toLocaleDateString('sv-SE')
    if (current.lastStudyDate === today) return current
    const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = yesterdayDate.toLocaleDateString('sv-SE')
    return { ...current, lastStudyDate: today, streak: current.lastStudyDate === yesterday ? current.streak + 1 : 1 }
  }
  const toggleItem = (field: 'learned'|'katakanaLearned'|'conversationLearned', id: string) => setProgress(current => {
    const exists = current[field].includes(id)
    const list = exists ? current[field].filter(item => item !== id) : [...current[field], id]
    const completionDates = { ...current.completionDates }
    const dateKey = `${field}:${id}`
    if (exists) delete completionDates[dateKey]
    else completionDates[dateKey] = new Date().toLocaleDateString('sv-SE')
    return touchStudyDay({ ...current, [field]: list, completionDates })
  })
  const toggleKanaLearned = (script: ScriptType, char: string) => toggleItem(script === 'hiragana' ? 'learned' : 'katakanaLearned', char)
  const toggleConversationLearned = (id: string) => toggleItem('conversationLearned', id)
  const toggleFavorite = (id: string) => setProgress(current => touchStudyDay({ ...current, favorites: current.favorites.includes(id) ? current.favorites.filter(item => item !== id) : [...current.favorites, id] }))
  const recordAnswer = (scope: 'hiragana'|'katakana'|'conversation', correct: boolean) => setProgress(current => touchStudyDay({ ...current, quizTotal: current.quizTotal + 1, quizCorrect: current.quizCorrect + Number(correct), quizStats: { ...current.quizStats, [scope]: { total: current.quizStats[scope].total + 1, correct: current.quizStats[scope].correct + Number(correct) } } }))
  const reset = () => setProgress(defaultProgress)
  const today = new Date().toLocaleDateString('sv-SE')
  const todayLearnedCount = Object.values(progress.completionDates).filter(date => date === today).length
  return { progress, toggleKanaLearned, toggleConversationLearned, toggleFavorite, recordAnswer, reset, todayLearnedCount }
}