import { conversationAudioId, kanaAudioId } from '../audio/catalog'
import { allConversationPhrases } from '../data/conversations'
import { hiragana } from '../data/hiragana'
import { katakana } from '../data/katakana'
import type { Progress, QuizItemStat, QuizScope } from '../types'

export type QuizMode = 'learned' | 'basic' | 'all' | 'mistakes'
export interface QuizItem { id:string; prompt:string; label:string; note:string; audioId:string; basic:boolean }
export interface QuizQuestion { id:string; options:string[]; answer:string|null; revealed:boolean }
export interface QuizSession { id:string; scope:QuizScope; mode:QuizMode; poolIds:string[]; questions:QuizQuestion[]; index:number }
export interface SavedQuiz { scope:QuizScope; mode:QuizMode; size:5|10; session:QuizSession|null; requestNonce:number }
export const SELF_REVIEW = '__self_review__'
export const scopeLabels:Record<QuizScope,string> = {hiragana:'히라가나',katakana:'가타카나',conversation:'일상 회화'}
export const modeLabels:Record<QuizMode,string> = {learned:'배운 것만',basic:'기본 범위',all:'전체 범위',mistakes:'오답만'}

const items:Record<QuizScope,QuizItem[]> = {
  hiragana:hiragana.map(item=>({id:item.char,prompt:item.char,label:item.romaji,note:`${item.sound} · ${item.tip}`,audioId:kanaAudioId('hiragana',item.char),basic:true})),
  katakana:katakana.map(item=>({id:item.char,prompt:item.char,label:item.romaji,note:`${item.sound} · ${item.tip}`,audioId:kanaAudioId('katakana',item.char),basic:item.kind==='basic'})),
  conversation:allConversationPhrases.map(item=>({id:item.id,prompt:item.japanese,label:item.meaning,note:`${item.koreanSound} · ${item.note}`,audioId:conversationAudioId(item.id),basic:item.categoryId==='greetings'})),
}
export function getQuizItems(scope:QuizScope){return items[scope]}
export function getQuizItem(scope:QuizScope,id:string){return items[scope].find(item=>item.id===id)}
export function unresolvedQuizItems(progress:Pick<Progress,'quizItems'>):QuizItemStat[]{
  return Object.values(progress.quizItems).filter(stat=>stat.wrong>0&&!stat.lastCorrect&&getQuizItem(stat.scope,stat.id))
    .sort((a,b)=>b.wrong-a.wrong||b.updatedAt.localeCompare(a.updatedAt))
}
export function quizPool(progress:Progress,scope:QuizScope,mode:QuizMode,ids?:string[]):QuizItem[]{
  const learned = scope==='hiragana'?progress.learned:scope==='katakana'?progress.katakanaLearned:progress.conversationLearned
  const mistakes = new Set(unresolvedQuizItems(progress).filter(stat=>stat.scope===scope).map(stat=>stat.id))
  const restricted=ids?new Set(ids):null
  return items[scope].filter(item=>(!restricted||restricted.has(item.id))&&(mode==='all'||mode==='basic'&&item.basic||mode==='learned'&&learned.includes(item.id)||mode==='mistakes'&&mistakes.has(item.id)))
}
export function shuffle<T>(values:T[],random:()=>number=Math.random):T[]{
  const result=[...values]
  for(let index=result.length-1;index>0;index--){const other=Math.min(index,Math.floor(Math.max(0,random())*(index+1)));[result[index],result[other]]=[result[other],result[index]]}
  return result
}
export function makeQuizSession(scope:QuizScope,mode:QuizMode,pool:QuizItem[],size:number,random:()=>number=Math.random):QuizSession|null{
  const unique=[...new Map(pool.map(item=>[item.id,item])).values()]
  if(!unique.length)return null
  const questions=shuffle(unique,random).slice(0,Math.min(10,Math.max(1,size))).map(answer=>{
    const labels=new Set([answer.label])
    const distractors=shuffle(unique,random).filter(item=>{if(labels.has(item.label))return false;labels.add(item.label);return true}).slice(0,3)
    return {id:answer.id,options:shuffle([answer.id,...distractors.map(item=>item.id)],random),answer:null,revealed:false}
  })
  return {id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,scope,mode,poolIds:unique.map(item=>item.id),questions,index:0}
}
export function answerQuiz(session:QuizSession,answer:string):QuizSession{
  const question=session.questions[session.index]
  if(!question||question.answer!==null)return session
  const selfCheck=question.options.length===1
  if(!question.options.includes(answer)&&!(selfCheck&&answer===SELF_REVIEW))return session
  if(selfCheck&&!question.revealed)return session
  return {...session,questions:session.questions.map((item,index)=>index===session.index?{...item,answer}:item)}
}
export function nextQuizQuestion(session:QuizSession):QuizSession{
  return session.questions[session.index]?.answer!==null&&session.index<session.questions.length?{...session,index:session.index+1}:session
}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)
const scope=(value:unknown):value is QuizScope=>value==='hiragana'||value==='katakana'||value==='conversation'
const mode=(value:unknown):value is QuizMode=>value==='learned'||value==='basic'||value==='all'||value==='mistakes'
export function validSavedQuiz(value:unknown):value is SavedQuiz{
  if(!object(value)||!scope(value.scope)||!mode(value.mode)||(value.size!==5&&value.size!==10)||!Number.isFinite(value.requestNonce))return false
  const session=value.session
  if(session===null)return true
  if(!object(session)||typeof session.id!=='string'||!scope(session.scope)||!mode(session.mode)||!Array.isArray(session.poolIds)||!session.poolIds.length||!Array.isArray(session.questions)||!session.questions.length||session.questions.length>10||!Number.isInteger(session.index)||Number(session.index)<0||Number(session.index)>session.questions.length)return false
  const known=new Map(items[session.scope].map(item=>[item.id,item]))
  const pool=session.poolIds
  if(pool.some(id=>typeof id!=='string'||!known.has(id))||new Set(pool).size!==pool.length)return false
  const seen=new Set<string>()
  return session.questions.every((question,index)=>{
    if(!object(question)||typeof question.id!=='string'||!pool.includes(question.id)||seen.has(question.id)||!Array.isArray(question.options)||!question.options.length||question.options.length>4||!question.options.includes(question.id)||typeof question.revealed!=='boolean')return false
    seen.add(question.id)
    const labels=question.options.map(id=>typeof id==='string'&&pool.includes(id)?known.get(id)?.label:undefined)
    if(labels.includes(undefined)||new Set(labels).size!==labels.length)return false
    if(question.answer!==null&&(!question.options.includes(question.answer)&&!(question.options.length===1&&question.answer===SELF_REVIEW)))return false
    if(question.options.length===1&&question.answer!==null&&!question.revealed)return false
    return index<Number(session.index)?question.answer!==null:index>Number(session.index)?question.answer===null:true
  })
}
