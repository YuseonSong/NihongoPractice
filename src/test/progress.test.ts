import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useProgress } from '../hooks/useProgress'

const KEY='hiragana-step-progress-v1'
describe('기존 학습 기록 마이그레이션',()=>{beforeEach(()=>localStorage.clear());it('이전 히라가나 완료와 퀴즈 누계를 보존한다',()=>{localStorage.setItem(KEY,JSON.stringify({learned:['あ','い'],quizCorrect:3,quizTotal:4,streak:2,lastStudyDate:'2026-10-19'}));const{result}=renderHook(()=>useProgress());expect(result.current.progress.learned).toEqual(['あ','い']);expect(result.current.progress.quizCorrect).toBe(3);expect(result.current.progress.quizStats.hiragana).toEqual({correct:3,total:4});expect(result.current.progress.katakanaLearned).toEqual([])})})