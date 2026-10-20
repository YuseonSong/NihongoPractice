import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KanaStudy } from '../pages/KanaStudy'
import { Conversation } from '../pages/Conversation'
import { Home } from '../pages/Home'
import { Navigation } from '../components/Navigation'
import { hiragana } from '../data/hiragana'
import { katakanaBasic, katakanaExtended } from '../data/katakana'
import { defaultProgress } from '../hooks/useProgress'

vi.mock('../components/AudioControls',()=>({AudioControls:({contentId,label}:{contentId:string;label:string})=><div role="group" aria-label={`${label} 음성 재생`} data-audio-id={contentId}/>}))
beforeEach(()=>localStorage.clear())
afterEach(cleanup)

describe('문자 학습 화면',()=>{
  const base={script:'hiragana' as const,basic:hiragana,learned:[],toggleLearned:vi.fn(),onWrite:vi.fn()}
  it('문자 선택과 완료 기록을 분리하고 선택한 글자에만 음성을 표시한다',()=>{
    const toggle=vi.fn(),write=vi.fn()
    render(<KanaStudy {...base} toggleLearned={toggle} onWrite={write}/>)
    fireEvent.click(screen.getByRole('button',{name:'선택 い'}))
    expect(toggle).not.toHaveBeenCalled()
    expect(screen.getByRole('button',{name:'선택 い'})).toHaveAttribute('aria-pressed','true')
    expect(screen.getAllByRole('group',{name:/음성 재생/})).toHaveLength(1)
    expect(screen.getByRole('group',{name:'い 음성 재생'})).toHaveAttribute('data-audio-id','kana:hiragana:い')
    fireEvent.click(screen.getByRole('button',{name:'이 문자를 공부했어요'}))
    expect(toggle).toHaveBeenCalledWith('hiragana','い')
    fireEvent.click(screen.getByRole('button',{name:'직접 써보기 · い'}))
    expect(write).toHaveBeenCalledWith('hiragana','い')
  })
  it('재진입 시 암기 카드 위치와 뒤집기 상태를 복원한다',()=>{
    const first=render(<KanaStudy {...base}/>)
    fireEvent.click(screen.getByRole('button',{name:'암기 카드'}))
    fireEvent.click(screen.getByRole('button',{name:'다음 문자'}))
    fireEvent.click(screen.getByRole('button',{name:'암기 카드 뒤집기'}))
    first.unmount()
    render(<KanaStudy {...base}/>)
    expect(screen.getByRole('button',{name:'암기 카드'})).toHaveAttribute('aria-pressed','true')
    expect(screen.getByRole('button',{name:'암기 카드 뒤집기'})).toHaveAttribute('aria-pressed','true')
    expect(screen.getByRole('group',{name:'い 음성 재생'})).toBeInTheDocument()
  })
  it('문자 종류와 스크립트별 선택을 각각 복원한다',()=>{
    const {rerender}=render(<KanaStudy {...base}/>)
    fireEvent.click(screen.getByRole('button',{name:'선택 い'}))
    rerender(<KanaStudy {...base} script="katakana" basic={katakanaBasic} extended={katakanaExtended}/>)
    fireEvent.click(screen.getByRole('button',{name:'탁음'}))
    fireEvent.click(screen.getByRole('button',{name:'선택 ギ'}))
    rerender(<KanaStudy {...base}/>)
    expect(screen.getByRole('button',{name:'선택 い'})).toHaveAttribute('aria-pressed','true')
    rerender(<KanaStudy {...base} script="katakana" basic={katakanaBasic} extended={katakanaExtended}/>)
    expect(screen.getByRole('button',{name:'탁음'})).toHaveAttribute('aria-pressed','true')
    expect(screen.getByRole('button',{name:'선택 ギ'})).toHaveAttribute('aria-pressed','true')
  })
  it('손상된 저장값을 안전하게 초기화하고 학습 기록은 건드리지 않는다',()=>{
    const old='{"learned":["あ"],"quizTotal":12}'
    localStorage.setItem('hiragana-step-progress-v1',old)
    localStorage.setItem('nihongo-mate-view-v1:kana-hiragana',JSON.stringify({mode:'cards',filter:'yoon',char:'없는 문자',flipped:'yes'}))
    render(<KanaStudy {...base}/>)
    expect(screen.getByRole('button',{name:'선택 あ'})).toHaveAttribute('aria-pressed','true')
    expect(localStorage.getItem('hiragana-step-progress-v1')).toBe(old)
  })
  it('이어하기 콜백이 교체되어도 같은 위치에서 반복 호출하지 않는다',()=>{
    const first=vi.fn(),next=vi.fn()
    const {rerender}=render(<KanaStudy {...base} onResume={first}/>)
    expect(first).toHaveBeenCalledTimes(1)
    rerender(<KanaStudy {...base} onResume={next}/>)
    expect(next).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'선택 う'}))
    expect(next).toHaveBeenCalledWith('히라가나 · う · 문자표')
  })
  it.each([['hiragana',hiragana],['katakana',katakanaBasic]] as const)('문자표에서 %s 기본 46자를 순서대로 보고 양끝에서 순환한다',(script,characters)=>{
    const toggle=vi.fn()
    render(<KanaStudy {...base} script={script} basic={[...characters]} toggleLearned={toggle}/>)
    const detail=screen.getByRole('region',{name:'선택한 문자'})
    for(const item of characters){
      expect(within(detail).getByText(item.char,{exact:true,selector:'p[lang="ja"]'})).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button',{name:'다음 문자'}))
    }
    expect(within(detail).getByText(characters[0].char,{exact:true,selector:'p[lang="ja"]'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'이전 문자'}))
    expect(within(detail).getByText(characters[45].char,{exact:true,selector:'p[lang="ja"]'})).toBeInTheDocument()
    expect(toggle).not.toHaveBeenCalled()
  })
})

describe('자유 학습 진입',()=>{
  it('이어하기 기록과 관계없이 히라가나 시작 버튼을 유지하고 이어하기를 별도로 제공한다',()=>{
    const setTab=vi.fn(),onContinue=vi.fn()
    const props={progress:defaultProgress,todayLearnedCount:0,setTab,reset:vi.fn(),resume:null,onContinue}
    const {rerender}=render(<Home {...props}/>)
    expect(screen.getByRole('heading',{name:'히라가나 먼저 시작해 볼까요?'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'히라가나 시작하기'}))
    expect(setTab).toHaveBeenCalledWith('hiragana')
    expect(screen.queryByRole('button',{name:'이어서 학습'})).not.toBeInTheDocument()
    rerender(<Home {...props} resume={{tab:'katakana',label:'가타카나 · カ · 암기 카드'}}/>)
    expect(screen.getByRole('heading',{name:'히라가나 먼저 시작해 볼까요?'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'히라가나 시작하기'})).toBeInTheDocument()
    expect(screen.getByText('가타카나 · カ · 암기 카드')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'이어서 학습'}))
    expect(onContinue).toHaveBeenCalledOnce()
    expect(screen.queryByText(/처음 5글자 배우기|입문 과정/)).not.toBeInTheDocument()
  })
  it('입문 과정 메뉴 없이 히라가나 시작과 기존 학습 메뉴를 제공한다',()=>{
    const setTab=vi.fn()
    render(<Navigation tab="home" setTab={setTab}/>)
    fireEvent.click(screen.getByRole('button',{name:'히라가나 시작'}))
    expect(setTab).toHaveBeenCalledWith('hiragana')
    fireEvent.click(screen.getByRole('button',{name:'더보기 메뉴 열기'}))
    const dialog=screen.getByRole('dialog',{name:'학습 메뉴'})
    for(const name of ['히라가나','가타카나','일상 회화','직접 그려보기','퀴즈','복습','발음 길잡이'])expect(within(dialog).getByRole('button',{name})).toBeInTheDocument()
    expect(screen.queryByText(/처음 5글자 배우기|처음 배우기/)).not.toBeInTheDocument()
  })
})

describe('회화 학습 화면',()=>{
  const props={progress:defaultProgress,toggleLearned:vi.fn(),toggleFavorite:vi.fn()}
  it('한자 문장에 가나 읽기를 표시하고 한국어·로마자는 필요할 때 펼친다',()=>{
    render(<Conversation {...props}/>)
    fireEvent.change(screen.getByRole('combobox',{name:'회화 문장 선택'}),{target:{value:'greetings-5'}})
    expect(screen.getByText('私はミンジュです。')).toBeInTheDocument()
    expect(screen.getByText('わたしはミンジュです。')).toBeInTheDocument()
    expect(screen.queryByText('Watashi wa Minju desu.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'한국어·로마자 도움말'}))
    expect(screen.getByText('Watashi wa Minju desu.')).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar')).toHaveLength(1)
  })
  it('카테고리·문장·읽기·뜻·도움말 표시 상태를 재진입 시 복원한다',()=>{
    const first=render(<Conversation {...props}/>)
    fireEvent.click(screen.getByRole('button',{name:'친구와 일상 대화'}))
    fireEvent.click(screen.getByRole('button',{name:'다음 문장'}))
    fireEvent.click(screen.getByRole('button',{name:'가나 읽기 숨기기'}))
    fireEvent.click(screen.getByRole('button',{name:'뜻 숨기기'}))
    fireEvent.click(screen.getByRole('button',{name:'한국어·로마자 도움말'}))
    first.unmount()
    render(<Conversation {...props}/>)
    expect(screen.getByRole('combobox',{name:'회화 문장 선택'})).toHaveValue('daily-2')
    expect(screen.getByText('今、何してる？')).toBeInTheDocument()
    expect(screen.queryByText('いま、なにしてる？')).not.toBeInTheDocument()
    expect(screen.getByRole('button',{name:'뜻 보기'})).toHaveAttribute('aria-pressed','false')
    expect(screen.getByText('Ima nani shiteru?')).toBeInTheDocument()
  })
  it('현재 문장 ID로 즐겨찾기와 학습 완료를 기록한다',()=>{
    const learned=vi.fn(),favorite=vi.fn()
    render(<Conversation {...props} toggleLearned={learned} toggleFavorite={favorite}/>)
    fireEvent.click(screen.getByRole('button',{name:'다음 문장'}))
    fireEvent.click(screen.getByRole('button',{name:'즐겨찾기 추가'}))
    fireEvent.click(screen.getByRole('button',{name:'이 문장을 공부했어요'}))
    expect(favorite).toHaveBeenCalledWith('greetings-2')
    expect(learned).toHaveBeenCalledWith('greetings-2')
    expect(within(screen.getByRole('main')).getByRole('group',{name:'こんにちは。 음성 재생'})).toHaveAttribute('data-audio-id','conversation:greetings-2')
  })
  it('유효하지 않은 회화 저장값에서 안전하게 시작한다',()=>{
    localStorage.setItem('nihongo-mate-view-v1:conversation','{"categoryId":"deleted","phraseId":"deleted","showReading":true}')
    render(<Conversation {...props}/>)
    expect(screen.getByRole('combobox',{name:'회화 문장 선택'})).toHaveValue('greetings-1')
  })
})
