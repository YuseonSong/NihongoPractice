import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Handwriting } from '../pages/Handwriting'
import { PronunciationGuide } from '../pages/PronunciationGuide'
import { getAudioTarget } from '../audio/catalog'
import type { ScriptType } from '../types'
import type { Stroke } from '../utils/handwriting'

vi.mock('../components/AudioControls',()=>({AudioControls:({contentId,label}:{contentId:string;label:string})=><div data-testid="audio-target" data-content-id={contentId}>{label} 음성</div>}))
vi.mock('../components/WritingCanvas',()=>({WritingCanvas:({strokes,onChange,guide,showGuide}:{strokes:Stroke[];onChange:(strokes:Stroke[])=>void;guide?:Stroke[];showGuide:boolean})=><div><span data-testid="canvas-count">{strokes.length}</span><span data-testid="guide-state">{String(showGuide)}</span><button onClick={()=>onChange(guide??[[{x:.2,y:.2},{x:.8,y:.8}]])}>테스트 필기 입력</button></div>}))
const createProps=()=>({initialScript:'hiragana' as const,initialChar:'あ',stats:{},onRecord:vi.fn()})
beforeEach(()=>localStorage.clear())
afterEach(cleanup)

describe('손글씨 1.3 화면',()=>{
  it('기본은 가이드가 켜진 5자이며 자유 연습에서 가타카나 확장 문자도 쓸 수 있다',()=>{
    render(<Handwriting {...createProps()}/>)
    expect(screen.getByLabelText('획순 가이드 표시')).toBeChecked()
    expect(screen.getByLabelText('연습 문자').querySelectorAll('option')).toHaveLength(5)
    expect(screen.queryByRole('button',{name:'다시 쓰기'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'자유 연습 · 전체 문자'}))
    fireEvent.change(screen.getByLabelText('학습 모드'),{target:{value:'katakana'}})
    fireEvent.change(screen.getByLabelText('연습 문자'),{target:{value:'ガ'}})
    expect(screen.getByRole('button',{name:'채점하기'})).toBeDisabled()
    expect(screen.getByLabelText('획순 가이드 표시')).toBeDisabled()
    expect(screen.getByLabelText('연습 문자')).toHaveValue('ガ')
  })

  it('동일한 필기의 결과를 복원하되 기록을 중복 추가하지 않는다',()=>{
    const props=createProps()
    const first=render(<Handwriting {...props}/>)
    fireEvent.click(screen.getByRole('button',{name:'테스트 필기 입력'}))
    fireEvent.click(screen.getByRole('button',{name:'채점하기'}))
    expect(props.onRecord).toHaveBeenCalledExactlyOnceWith('あ',100)
    expect(screen.getByText('100%',{selector:'p'})).toBeInTheDocument()
    expect(screen.getByText('세부 점수 보기').parentElement).not.toHaveAttribute('open')
    first.unmount()
    render(<Handwriting {...props}/>)
    expect(screen.getByText('100%',{selector:'p'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'채점 완료'})).toBeDisabled()
    expect(props.onRecord).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button',{name:'전체 지우기'}))
    fireEvent.click(screen.getByRole('button',{name:'채점하기'}))
    expect(screen.getByRole('alert')).toHaveTextContent('먼저 연습 영역에 글자를 써 주세요')
    expect(props.onRecord).toHaveBeenCalledTimes(1)
  })

  it('부모가 선택 대상을 반영해도 초안을 지우지 않으며 실제 대상 변경에서는 지운다',()=>{
    const props=createProps(),onTarget=vi.fn()
    function Connected(){
      const [target,setTarget]=useState<{script:ScriptType;char:string}>({script:'hiragana',char:'あ'})
      return <><button onClick={()=>setTarget({script:'hiragana',char:'う'})}>외부 대상 변경</button><Handwriting {...props} initialScript={target.script} initialChar={target.char} onTargetChange={(script,char)=>{onTarget(script,char);setTarget({script,char})}}/></>
    }
    render(<Connected/>)
    fireEvent.change(screen.getByLabelText('연습 문자'),{target:{value:'い'}})
    fireEvent.click(screen.getByRole('button',{name:'테스트 필기 입력'}))
    expect(screen.getByTestId('canvas-count')).toHaveTextContent('2')
    expect(onTarget).toHaveBeenLastCalledWith('hiragana','い')
    fireEvent.click(screen.getByRole('button',{name:'외부 대상 변경'}))
    expect(screen.getByLabelText('연습 문자')).toHaveValue('う')
    expect(screen.getByTestId('canvas-count')).toHaveTextContent('0')
    expect(onTarget).toHaveBeenCalledTimes(3)
  })

  it('저장된 좌표가 범위를 벗어나면 복원하지 않는다',()=>{
    localStorage.setItem('nihongo-mate-view-v1:handwriting-draft',JSON.stringify({script:'hiragana',char:'あ',mode:'guided',strokes:[[{x:-2,y:.1},{x:.5,y:.9}]],graded:false,version:'kanjivg-rules-v1'}))
    render(<Handwriting {...createProps()}/>)
    expect(screen.getByTestId('canvas-count')).toHaveTextContent('0')
  })

  it('다른 문자로 진입한 뒤에는 이전 문자 초안이 다시 나타나지 않는다',()=>{
    const props=createProps()
    const first=render(<Handwriting {...props}/>)
    fireEvent.click(screen.getByRole('button',{name:'테스트 필기 입력'}))
    first.unmount()
    const second=render(<Handwriting {...props} initialChar="い"/>)
    expect(screen.getByTestId('canvas-count')).toHaveTextContent('0')
    second.unmount()
    render(<Handwriting {...props}/>)
    expect(screen.getByTestId('canvas-count')).toHaveTextContent('0')
  })

  it('저장한 가이드 표시 설정을 복원하고 사용자가 가이드 연습을 선택할 때만 켠다',()=>{
    localStorage.setItem('nihongo-mate-view-v1:handwriting-preferences',JSON.stringify({hide:false,guide:false,overlay:false}))
    render(<Handwriting {...createProps()}/>)
    expect(screen.getByLabelText('획순 가이드 표시')).not.toBeChecked()
    expect(screen.queryByRole('button',{name:/입문 과정으로 돌아가기/})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'가이드 연습 · 5글자'}))
    expect(screen.getByLabelText('획순 가이드 표시')).toBeChecked()
  })
})

describe('발음 길잡이',()=>{
  it('기존 내장 음성 예제 7개와 히라가나 학습 연결 하나를 제공한다',()=>{
    const onStudy=vi.fn()
    render(<PronunciationGuide onStudy={onStudy}/>)
    const examples=screen.getAllByTestId('audio-target')
    expect(examples).toHaveLength(7)
    for(const example of examples){
      const id=example.getAttribute('data-content-id')!
      expect(getAudioTarget(id,'').url,id).toBeTruthy()
    }
    expect(screen.queryByRole('button',{name:/첫 5글자/})).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button',{name:'히라가나 학습으로'}))
    expect(onStudy).toHaveBeenCalledOnce()
  })
})
