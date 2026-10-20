import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useProgress } from '../hooks/useProgress'

const KEY='hiragana-step-progress-v1'
describe('기존 학습 기록 마이그레이션',()=>{beforeEach(()=>localStorage.clear());it('이전 히라가나 완료와 퀴즈 누계를 보존한다',()=>{localStorage.setItem(KEY,JSON.stringify({learned:['あ','い'],quizCorrect:3,quizTotal:4,streak:2,lastStudyDate:'2026-10-19'}));const{result}=renderHook(()=>useProgress());expect(result.current.progress.learned).toEqual(['あ','い']);expect(result.current.progress.quizCorrect).toBe(3);expect(result.current.progress.quizStats.hiragana).toEqual({correct:3,total:4});expect(result.current.progress.katakanaLearned).toEqual([])})})

describe('손글씨 기록 추가와 보존',()=>{
  beforeEach(()=>localStorage.clear())
  it('기존 완료·회화·퀴즈·즐겨찾기를 유지하며 횟수, 최고, 최근, 평균을 저장',()=>{
    const existing={learned:['あ'],katakanaLearned:['ア'],conversationLearned:['greeting-1'],favorites:['greeting-1'],quizCorrect:3,quizTotal:4,completionDates:{'learned:あ':'2026-10-19'}}
    localStorage.setItem(KEY,JSON.stringify(existing))
    const {result,unmount}=renderHook(()=>useProgress())
    act(()=>result.current.recordHandwriting('あ',92))
    act(()=>result.current.recordHandwriting('あ',60))
    expect(result.current.progress.handwriting['あ']).toMatchObject({attempts:2,best:92,latest:60,sum:152})
    for(const [key,value] of Object.entries(existing))expect(result.current.progress[key as keyof typeof existing]).toEqual(value)
    act(()=>result.current.recordHandwriting('ア',100))
    expect(result.current.progress.handwriting['ア']).toBeUndefined()
    unmount()
    expect(renderHook(()=>useProgress()).result.current.progress.handwriting['あ'].attempts).toBe(2)
  })
})
