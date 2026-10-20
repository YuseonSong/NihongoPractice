export type Tab = 'home' | 'hiragana' | 'katakana' | 'conversation' | 'quiz' | 'review' | 'handwriting' | 'pronunciation'
export type QuizScope = 'hiragana' | 'katakana' | 'conversation'
export interface QuizItemStat { scope:QuizScope; id:string; correct:number; wrong:number; lastCorrect:boolean; updatedAt:string }
export interface QuizLaunch { scope:QuizScope; ids?:string[]; mode?:'learned'|'basic'|'all'|'mistakes'; nonce:number }
export interface ResumeTarget { tab:Exclude<Tab,'home'>; label:string }
export type ScriptType = 'hiragana' | 'katakana'
export type KanaKind = 'basic' | 'dakuten' | 'handakuten' | 'yoon'
export type Politeness = '존댓말' | '반말' | '공통'

export interface KanaCharacter {
  char: string
  romaji: string
  sound: string
  group: string
  tip: string
  kind: KanaKind
  example?: { word: string; reading: string; meaning: string }
}

export interface ConversationPhrase {
  id: string
  categoryId: string
  japanese: string
  romaji: string
  koreanSound: string
  meaning: string
  situation: string
  politeness: Politeness
  note: string
}

export interface ConversationCategory {
  id: string
  title: string
  icon: string
  description: string
  phrases: ConversationPhrase[]
}

export interface QuizStat { correct: number; total: number }

export interface WritingStat { attempts:number; best:number; latest:number; sum:number; lastPracticed:string; version:string }
export type WritingStatsMap = Record<string, WritingStat>

export interface Progress {
  quizItems:Record<string,QuizItemStat>
  handwriting: WritingStatsMap
  learned: string[]
  quizCorrect: number
  quizTotal: number
  streak: number
  lastStudyDate: string | null
  katakanaLearned: string[]
  conversationLearned: string[]
  favorites: string[]
  completionDates: Record<string, string>
  quizStats: Record<'hiragana' | 'katakana' | 'conversation', QuizStat>
}
