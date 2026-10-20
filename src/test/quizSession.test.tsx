import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Quiz } from '../pages/Quiz'
import { Review } from '../pages/Review'
import type { Progress, QuizItemStat } from '../types'
import { answerQuiz, getQuizItem, makeQuizSession, nextQuizQuestion, quizPool, SELF_REVIEW, unresolvedQuizItems, validSavedQuiz } from '../utils/quizSession'

vi.mock('../components/AudioControls',()=>({AudioControls:({label}:{label:string})=><span>{label} 음성</span>}))
const base=():Progress=>({learned:[],katakanaLearned:[],conversationLearned:[],favorites:[],completionDates:{},quizCorrect:0,quizTotal:0,streak:0,lastStudyDate:null,quizStats:{hiragana:{correct:0,total:0},katakana:{correct:0,total:0},conversation:{correct:0,total:0}},handwriting:{},quizItems:{}})
const stat=(id:string,lastCorrect=false,wrong=1):QuizItemStat=>({scope:'hiragana',id,correct:lastCorrect?1:0,wrong,lastCorrect,updatedAt:'2026-10-20'})
beforeEach(()=>localStorage.clear())
afterEach(cleanup)

describe('유한 퀴즈의 출제 범위와 보기',()=>{
  it('기본은 배운 ID만 사용하며 확장 가타카나를 몰래 추가하지 않는다',()=>{
    const progress={...base(),learned:['あ','い'],katakanaLearned:['ア','ガ','없는 문자']}
    expect(quizPool(progress,'hiragana','learned').map(item=>item.id)).toEqual(['あ','い'])
    expect(quizPool(progress,'katakana','learned').map(item=>item.id)).toEqual(['ア','ガ'])
    expect(quizPool(progress,'katakana','basic')).toHaveLength(46)
    expect(quizPool(progress,'katakana','basic').some(item=>item.id==='ガ')).toBe(false)
    expect(quizPool(progress,'katakana','all').some(item=>item.id==='キャ')).toBe(true)
    expect(quizPool(progress,'conversation','basic')).toHaveLength(10)
  })
  it('짧은 범위는 실제 개수만 출제하며 오답 보기도 해당 범위 안에서 고른다',()=>{
    const pool=quizPool({...base(),learned:['あ','い']},'hiragana','learned')
    const session=makeQuizSession('hiragana','learned',pool,5,()=>.4)!
    expect(session.questions).toHaveLength(2)
    expect(new Set(session.questions.map(item=>item.id)).size).toBe(2)
    for(const question of session.questions){expect(question.options).toHaveLength(2);expect(question.options.every(id=>pool.some(item=>item.id===id))).toBe(true)}
    expect(makeQuizSession('hiragana','learned',[],5)).toBeNull()
  })
  it('10문제에서 정답 ID를 반복하지 않고 동음 로마자 보기를 중복하지 않는다',()=>{
    const session=makeQuizSession('katakana','all',quizPool(base(),'katakana','all'),10,()=>.2)!
    expect(new Set(session.questions.map(item=>item.id)).size).toBe(10)
    for(const question of session.questions){const labels=question.options.map(id=>getQuizItem('katakana',id)!.label);expect(new Set(labels).size).toBe(labels.length);expect(question.options).toContain(question.id)}
    const homophones=quizPool({...base(),katakanaLearned:['ジ','ヂ']},'katakana','learned')
    expect(makeQuizSession('katakana','learned',homophones,5)!.questions.every(item=>item.options.length===1)).toBe(true)
  })
  it('답변 전 다음 문제로 가지 않으며 중복 답변을 기록하지 않는다',()=>{
    const session=makeQuizSession('hiragana','basic',quizPool(base(),'hiragana','basic'),5)!
    expect(nextQuizQuestion(session)).toBe(session)
    expect(answerQuiz(session,'존재하지 않음')).toBe(session)
    const answered=answerQuiz(session,session.questions[0].id)
    expect(answerQuiz(answered,answered.questions[0].options[0])).toBe(answered)
    expect(nextQuizQuestion(answered).index).toBe(1)
  })
  it('단일 항목은 정답을 공개한 뒤 명시적 자가 확인을 한다',()=>{
    const session=makeQuizSession('hiragana','learned',quizPool({...base(),learned:['あ']},'hiragana','learned'),5)!
    expect(answerQuiz(session,'あ')).toBe(session)
    const revealed={...session,questions:session.questions.map(item=>({...item,revealed:true}))}
    expect(answerQuiz(revealed,SELF_REVIEW).questions[0].answer).toBe(SELF_REVIEW)
  })
})

describe('오답 기록과 저장된 회차',()=>{
  it('해결된 오답을 빼고 실제 기록된 오류만 조회하며 지정된 ID와 범위를 교차한다',()=>{
    const progress={...base(),quizTotal:20,quizCorrect:10,quizItems:{'hiragana:あ':stat('あ',false,3),'hiragana:い':stat('い',true,8),'hiragana:う':stat('う',false,1)}}
    expect(unresolvedQuizItems(progress).map(item=>item.id)).toEqual(['あ','う'])
    expect(quizPool(progress,'hiragana','mistakes',['あ','い']).map(item=>item.id)).toEqual(['あ'])
    const legacy={...base(),quizTotal:20,quizCorrect:10}
    expect(unresolvedQuizItems(legacy)).toEqual([])
  })
  it('유효한 회차는 복원하지만 변조된 ID·중복 문제·잘못된 보기·진행 인덱스를 거부한다',()=>{
    const session=makeQuizSession('hiragana','basic',quizPool(base(),'hiragana','basic'),5)!
    const saved={scope:'hiragana',mode:'basic',size:5,session,requestNonce:1}
    expect(validSavedQuiz(JSON.parse(JSON.stringify(saved)))).toBe(true)
    expect(validSavedQuiz({...saved,session:{...session,index:99}})).toBe(false)
    expect(validSavedQuiz({...saved,session:{...session,questions:[session.questions[0],session.questions[0]]}})).toBe(false)
    expect(validSavedQuiz({...saved,session:{...session,questions:[{...session.questions[0],options:['不存在']}]}})).toBe(false)
    expect(validSavedQuiz({...saved,session:{...session,questions:[{...session.questions[0],answer:'不存在'}]}})).toBe(false)
    expect(validSavedQuiz({...saved,session:{...session,index:1}})).toBe(false)
  })
})

describe('퀴즈·복습 화면',()=>{
  it('미학습 상태는 시작 버튼 대신 배우러 가기를 제공한다',()=>{
    const learn=vi.fn();render(<Quiz progress={base()} recordAnswer={vi.fn()} onLearn={learn}/>);
    expect(screen.getByText(/아직 배운 항목이 없어요/)).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'퀴즈 시작'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:/배우러 가기/}));expect(learn).toHaveBeenCalledWith('hiragana')
  })
  it('답변을 한 번만 기록하고 메뉴를 다녀와도 같은 회차와 선택을 복원한다',()=>{
    const progress={...base(),learned:['あ','い']},record=vi.fn()
    const first=render(<Quiz progress={progress} recordAnswer={record}/>);
    fireEvent.click(screen.getByRole('button',{name:'퀴즈 시작'}))
    const question=screen.getByRole('region',{name:'퀴즈 문제'}),button=within(question).getByRole('button',{name:'a'})
    fireEvent.click(button);fireEvent.click(button);expect(record).toHaveBeenCalledTimes(1)
    const stored=JSON.parse(localStorage.getItem('nihongo-mate-view-v1:quiz')!)
    expect(record.mock.calls[0][2]).toBe(stored.session.questions[0].id)
    first.unmount();render(<Quiz progress={progress} recordAnswer={record}/>);
    expect(screen.getByRole('button',{name:'a'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'다음 문제'}));expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(record).toHaveBeenCalledTimes(1)
  })
  it('오답 하나도 자가 확인으로 연습하고 유한 결과 화면까지 마친다',()=>{
    const progress={...base(),quizItems:{'hiragana:あ':stat('あ')}},record=vi.fn()
    render(<Quiz progress={progress} recordAnswer={record} initialRequest={{scope:'hiragana',mode:'mistakes',ids:['あ'],nonce:2}}/>);
    fireEvent.click(screen.getByRole('button',{name:'정답 확인'}));fireEvent.click(screen.getByRole('button',{name:'기억했어요'}));
    expect(record).toHaveBeenCalledWith('hiragana',true,'あ')
    fireEvent.click(screen.getByRole('button',{name:'결과 보기'}));expect(screen.getByRole('region',{name:'퀴즈 결과'})).toBeInTheDocument()
    expect(screen.getByText(/1문제 중 1개 정답/)).toBeInTheDocument()
  })
  it('오답 복습은 미해결 ID만 전달하고 해결 수·즐겨찾기를 유지한다',()=>{
    const start=vi.fn(),favorite=vi.fn(),progress={...base(),favorites:['greetings-1'],quizItems:{'hiragana:あ':stat('あ',false,2),'hiragana:い':stat('い',true)}}
    render(<Review progress={progress} toggleFavorite={favorite} setTab={vi.fn()} onStartQuiz={start}/>);
    fireEvent.click(screen.getByRole('button',{name:'이 오답 풀기'}));expect(start).toHaveBeenCalledWith({scope:'hiragana',mode:'mistakes',ids:['あ']})
    expect(screen.getByText('1개 복습 해결')).toBeInTheDocument()
    expect(screen.getByText('누적 오답 2회')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:/즐겨찾기 해제/}));expect(favorite).toHaveBeenCalledWith('greetings-1')
  })
})
