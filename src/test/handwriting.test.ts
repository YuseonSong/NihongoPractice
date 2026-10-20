import { describe, expect, it } from 'vitest'
import { evaluateWriting, normalize, referenceStrokes, scoreMessage, supportedWriting } from '../utils/handwriting'
import type { Stroke } from '../utils/handwriting'
import { canvasPoint } from '../components/WritingCanvas'

describe('실제 KanjiVG 5자 기준 획 채점',()=>{
  for(const char of supportedWriting){
    const reference=referenceStrokes(char)!
    it(`${char}: 동일·유사·이동·크기 변경`,()=>{
      expect(evaluateWriting(char,reference).total).toBe(100)
      const shifted=reference.map(s=>s.map(p=>({x:p.x*.45+.25,y:p.y*.45+.1})))
      expect(evaluateWriting(char,shifted).total).toBe(100)
      const jitter=reference.map(s=>s.map((p,i)=>({x:p.x+Math.sin(i)*.003,y:p.y+Math.cos(i)*.003})))
      expect(evaluateWriting(char,jitter).total).toBeGreaterThanOrEqual(90)
      const warped=reference.map(s=>s.map(p=>({x:p.x+.012*Math.sin(p.y*8),y:p.y+.012*Math.cos(p.x*7)})))
      expect(evaluateWriting(char,warped).total).toBeGreaterThanOrEqual(90)
    })
    it(`${char}: 획순·역방향 감점`,()=>{
      const reversed=evaluateWriting(char,[...reference].reverse())
      expect(reversed.shape).toBe(100)
      expect(reversed.order).toBeLessThan(100)
      expect(reversed.total).toBeLessThan(90)
      const direction=evaluateWriting(char,reference.map(s=>[...s].reverse()))
      expect(direction.order).toBe(0)
      expect(direction.total).toBeLessThan(75)
    })
    it(`${char}: 직선·낙서·누락·추가 획`,()=>{
      const line:Stroke[]=[[{x:.2,y:.2},{x:.8,y:.8}]]
      expect(evaluateWriting(char,line).total).toBeLessThan(50)
      const scribble:Stroke[]=Array.from({length:8},(_,i)=>[{x:.1,y:.1+i*.1},{x:.9,y:.9-i*.1}])
      expect(evaluateWriting(char,scribble).total).toBeLessThan(50)
      expect(evaluateWriting(char,reference.slice(1)).total).toBeLessThan(90)
      expect(evaluateWriting(char,[...reference,line[0]]).total).toBeLessThan(90)
    })
  }
  it('다른 5자 사이의 모든 쌍은 75점 미만',()=>{
    const matrix=supportedWriting.map(target=>supportedWriting.map(input=>evaluateWriting(target,referenceStrokes(input)!).total))
    console.info('5자 혼동 행렬 (행:정답, 열:입력 あいうえお)',JSON.stringify(matrix))
    for(let i=0;i<matrix.length;i++)for(let j=0;j<matrix.length;j++)if(i!==j)expect(matrix[i][j]).toBeLessThan(75)
  })
  it('빈 입력, 점 입력, 비정상 좌표와 미지원 문자를 거부',()=>{
    expect(()=>evaluateWriting('あ',[])).toThrow('먼저')
    expect(()=>evaluateWriting('あ',[[{x:.5,y:.5},{x:.5,y:.5}]])).toThrow('먼저')
    expect(()=>evaluateWriting('あ',[[{x:NaN,y:0},{x:1,y:1}]])).toThrow()
    expect(()=>evaluateWriting('ア',referenceStrokes('あ')!)).toThrow('지원하지')
  })
  it('화면 크기와 위치가 달라도 동일한 논리 좌표',()=>{
    expect(canvasPoint(150,250,{left:50,top:50,width:200,height:400})).toEqual({x:.5,y:.5})
    expect(canvasPoint(300,400,{left:100,top:100,width:400,height:600})).toEqual({x:.5,y:.5})
    expect(normalize(referenceStrokes('あ')!)).toHaveLength(3)
  })
  it('획 수와 한 획의 점 수를 제한해 과도한 입력을 거부',()=>{
    const line=[{x:.1,y:.1},{x:.9,y:.9}]
    expect(()=>evaluateWriting('あ',Array.from({length:25},()=>line))).toThrow('너무 많아요')
    expect(()=>evaluateWriting('あ',[Array.from({length:2049},(_,i)=>({x:i/2049,y:i/2049}))])).toThrow('너무 많아요')
  })
  it('학습 안내 구간 경계',()=>{
    expect([0,49,50,74,75,89,90,100].map(scoreMessage)).toEqual(['다시 도전해 봐요!','다시 도전해 봐요!','조금 더 연습해 봐요!','조금 더 연습해 봐요!','잘했어요!','잘했어요!','매우 잘했어요!','매우 잘했어요!'])
  })
})
