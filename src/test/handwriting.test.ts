import { describe, expect, it } from 'vitest'
import { evaluateWriting, normalize, referenceStrokes, scoreMessage, supportedWriting } from '../utils/handwriting'
import type { Stroke } from '../utils/handwriting'
import { canvasPoint } from '../components/WritingCanvas'

describe('KanjiVG 기본 가나 92자 획 채점',()=>{
  it('히라가나와 가타카나 기본 문자 92자의 기준 획을 모두 제공한다',()=>{
    expect(supportedWriting).toHaveLength(92)
    expect(new Set(supportedWriting).size).toBe(92)
    for(const char of ['あ','ん','ア','ン'])expect(referenceStrokes(char)?.length).toBeGreaterThan(0)
  })
  it('92자 모두 자신의 기준 획을 100점으로 채점한다',()=>{
    for(const char of supportedWriting)expect(evaluateWriting(char,referenceStrokes(char)!).total,char).toBe(100)
  })
  for(const char of ['あ','う','そ','ふ','ん','ア','シ','ソ','フ','ン']){
    const reference=referenceStrokes(char)!
    it(char+': 이동·크기 변경과 작은 흔들림을 허용한다',()=>{
      const shifted=reference.map(s=>s.map(p=>({x:p.x*.45+.25,y:p.y*.45+.1})))
      expect(evaluateWriting(char,shifted).total).toBe(100)
      const jitter=reference.map(s=>s.map((p,i)=>({x:p.x+Math.sin(i)*.003,y:p.y+Math.cos(i)*.003})))
      expect(evaluateWriting(char,jitter).total).toBeGreaterThanOrEqual(90)
    })
    it(char+': 획 방향과 잘못된 직선 입력을 감점한다',()=>{
      const direction=evaluateWriting(char,reference.map(s=>[...s].reverse()))
      expect(direction.order).toBe(0)
      expect(direction.total).toBeLessThan(75)
      const line:Stroke[]=[[{x:.2,y:.2},{x:.8,y:.8}]]
      if(JSON.stringify(reference)!==JSON.stringify(line))expect(evaluateWriting(char,line).total).toBeLessThan(75)
    })
  }
  it('빈 입력, 점 입력, 비정상 좌표와 미지원 복합 문자를 거부한다',()=>{
    expect(()=>evaluateWriting('あ',[])).toThrow('먼저')
    expect(()=>evaluateWriting('あ',[[{x:.5,y:.5},{x:.5,y:.5}]])).toThrow('먼저')
    expect(()=>evaluateWriting('あ',[[{x:NaN,y:0},{x:1,y:1}]])).toThrow()
    expect(()=>evaluateWriting('キャ',referenceStrokes('あ')!)).toThrow('지원하지')
  })
  it('화면 크기와 위치가 달라도 동일한 논리 좌표를 만든다',()=>{
    expect(canvasPoint(150,250,{left:50,top:50,width:200,height:400})).toEqual({x:.5,y:.5})
    expect(canvasPoint(300,400,{left:100,top:100,width:400,height:600})).toEqual({x:.5,y:.5})
    expect(normalize(referenceStrokes('あ')!)).toHaveLength(3)
  })
  it('획과 획의 점 개수가 제한을 과도하게 넘은 입력을 거부한다',()=>{
    const line=[{x:.1,y:.1},{x:.9,y:.9}]
    expect(()=>evaluateWriting('あ',Array.from({length:25},()=>line))).toThrow('너무 많아요')
    expect(()=>evaluateWriting('あ',[Array.from({length:2049},(_,i)=>({x:i/2049,y:i/2049}))])).toThrow('너무 많아요')
  })
  it('학습 안내 점수 경계를 유지한다',()=>{
    expect([0,49,50,74,75,89,90,100].map(scoreMessage)).toEqual(['다시 도전해 봐요!','다시 도전해 봐요!','조금 더 연습해 봐요!','조금 더 연습해 봐요!','잘했어요!','잘했어요!','매우 잘했어요!','매우 잘했어요!'])
  })
})