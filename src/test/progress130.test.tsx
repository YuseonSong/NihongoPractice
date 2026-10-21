import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateProgress, useProgress } from '../hooks/useProgress'
import { unresolvedQuizItems } from '../utils/quizSession'

const KEY='hiragana-step-progress-v1'
const handwriting={あ:{attempts:3,best:94,latest:81,sum:258,lastPracticed:'2026-10-19T11:00:00.000Z',version:'1.1.0'}}
const legacy=()=>({learned:['あ','い'],katakanaLearned:['ア'],conversationLearned:['greetings-1'],favorites:['greetings-1','daily-2'],completionDates:{'learned:あ':'2026-10-18','katakanaLearned:ア':'2026-10-19'},handwriting,quizCorrect:7,quizTotal:12,quizStats:{hiragana:{correct:3,total:5},katakana:{correct:2,total:4},conversation:{correct:2,total:3}},streak:4,lastStudyDate:'2026-10-19'})
beforeEach(()=>{localStorage.clear();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,20,12))})
afterEach(()=>{cleanup();vi.useRealTimers()})

describe('1.3.0 학습 기록 보존',()=>{
  it('1.2.0 기록을 그대로 보존하고 문자별 과거 오답을 임의로 만들지 않는다',()=>{
    const saved=legacy(),migrated=migrateProgress(saved)
    for(const [key,value] of Object.entries(saved)){if(key==='quizStats')continue;expect(migrated[key as keyof typeof saved]).toEqual(value)}
    expect(migrated.quizStats).toEqual({...saved.quizStats,grammar:{correct:0,total:0}})
    expect(migrated.quizItems).toEqual({})
    expect(unresolvedQuizItems(migrated)).toEqual([])
    expect(saved).not.toHaveProperty('quizItems')
  })
  it('오래된 히라가나 합계를 과목 통계로 옮겨도 새 오답은 생성하지 않는다',()=>{
    const migrated=migrateProgress({learned:['あ'],quizTotal:8,quizCorrect:3})
    expect(migrated.quizStats).toEqual({hiragana:{correct:3,total:8},katakana:{correct:0,total:0},conversation:{correct:0,total:0},grammar:{correct:0,total:0}})
    expect(migrated.quizTotal).toBe(8);expect(migrated.quizCorrect).toBe(3)
    expect(migrated.quizItems).toEqual({})
  })
  it('새 오답을 기록한 뒤 정답으로 해결해도 과거 합계와 누적 오답 횟수를 유지한다',()=>{
    const saved=legacy();localStorage.setItem(KEY,JSON.stringify(saved))
    const {result,unmount}=renderHook(()=>useProgress())
    act(()=>result.current.recordAnswer('hiragana',false,'あ'))
    expect(result.current.progress.quizItems['hiragana:あ']).toMatchObject({scope:'hiragana',id:'あ',wrong:1,correct:0,lastCorrect:false})
    expect(unresolvedQuizItems(result.current.progress).map(item=>item.id)).toEqual(['あ'])
    act(()=>result.current.recordAnswer('hiragana',true,'あ'))
    expect(result.current.progress.quizItems['hiragana:あ']).toMatchObject({wrong:1,correct:1,lastCorrect:true})
    expect(unresolvedQuizItems(result.current.progress)).toEqual([])
    expect(result.current.progress.quizTotal).toBe(14);expect(result.current.progress.quizCorrect).toBe(8)
    expect(result.current.progress.quizStats).toEqual({...saved.quizStats,hiragana:{total:7,correct:4},grammar:{correct:0,total:0}})
    for(const key of ['learned','katakanaLearned','conversationLearned','favorites','completionDates','handwriting'] as const)expect(result.current.progress[key]).toEqual(saved[key])
    expect(Number.isNaN(Date.parse(result.current.progress.quizItems['hiragana:あ'].updatedAt))).toBe(false)
    unmount();const restored=renderHook(()=>useProgress())
    expect(restored.result.current.progress.quizItems['hiragana:あ'].lastCorrect).toBe(true)
    expect(restored.result.current.progress.quizTotal).toBe(14)
  })
  it('다른 학습 종류의 같은 ID와 ID 없는 이전 호출을 구분한다',()=>{
    const {result}=renderHook(()=>useProgress())
    act(()=>{result.current.recordAnswer('hiragana',false,'あ');result.current.recordAnswer('conversation',true,'あ');result.current.recordAnswer('katakana',false)})
    expect(result.current.progress.quizItems['hiragana:あ']).toMatchObject({wrong:1,correct:0})
    expect(result.current.progress.quizItems['conversation:あ']).toMatchObject({wrong:0,correct:1})
    expect(Object.keys(result.current.progress.quizItems)).toHaveLength(2)
    expect(result.current.progress.quizItems['katakana:undefined']).toBeUndefined()
    expect(result.current.progress.quizTotal).toBe(3);expect(result.current.progress.quizCorrect).toBe(1)
  })
  it('입문 과정에서 같은 문자를 여러 번 완료해도 중복 등록되거나 완료 날짜가 바뀌지 않는다',()=>{
    const saved=legacy();localStorage.setItem(KEY,JSON.stringify(saved))
    const {result}=renderHook(()=>useProgress())
    act(()=>{result.current.markKanaLearned('hiragana','あ');result.current.markKanaLearned('hiragana','う');result.current.markKanaLearned('hiragana','う');result.current.markKanaLearned('katakana','イ');result.current.markKanaLearned('katakana','イ')})
    expect(result.current.progress.learned).toEqual(['あ','い','う'])
    expect(result.current.progress.katakanaLearned).toEqual(['ア','イ'])
    expect(result.current.progress.completionDates['learned:あ']).toBe('2026-10-18')
    expect(result.current.progress.completionDates['katakanaLearned:ア']).toBe('2026-10-19')
    expect(result.current.todayLearnedCount).toBe(2)
    expect(result.current.progress.handwriting).toEqual(handwriting)
  })
  it('불완전한 문자별 퀴즈 기록을 제거하면서 정상 기록과 기존 합계는 보존한다',()=>{
    const valid={scope:'hiragana',id:'あ',correct:1,wrong:2,lastCorrect:false,updatedAt:'2026-10-20T10:00:00Z'}
    const malformed={
      'hiragana:あ':valid,
      'hiragana:い':{...valid,id:'い',updatedAt:undefined},
      'hiragana:う':{...valid,id:'う',updatedAt:42},
      'hiragana:え':{...valid,id:'え',wrong:-1},
      'hiragana:お':{...valid,id:'お',correct:Number.POSITIVE_INFINITY},
      'hiragana:か':{...valid,id:'か',lastCorrect:'false'},
      'wrong:key':{...valid,id:'き'},
      'english:a':{...valid,scope:'english',id:'a'},
      'katakana:ア':null,
    }
    const migrated=migrateProgress({...legacy(),quizItems:malformed})
    expect(migrated.quizItems).toEqual({'hiragana:あ':valid})
    expect(migrated.quizTotal).toBe(12);expect(migrated.quizCorrect).toBe(7)
  })
})
