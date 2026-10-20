import { AudioControls } from '../components/AudioControls'
import { kanaAudioId } from '../audio/catalog'
import { useEffect, useMemo, useRef, useState } from 'react'
import { hiragana } from '../data/hiragana'
import { katakanaBasic, katakanaExtended } from '../data/katakana'
import { WritingCanvas } from '../components/WritingCanvas'
import { WritingStats } from '../components/WritingStats'
import { useSavedState } from '../hooks/useSavedState'
import { ALGORITHM_VERSION, MAX_POINTS, MAX_STROKES, evaluateWriting, referenceStrokes, scoreMessage, supportedWriting } from '../utils/handwriting'
import type { Stroke, WritingResult } from '../utils/handwriting'
import type { ScriptType, WritingStatsMap } from '../types'

type PracticeMode='guided'|'free'
type Draft={script:ScriptType;char:string;mode:PracticeMode;strokes:Stroke[];graded:boolean;version:string}
type Preferences={hide:boolean;guide:boolean;overlay:boolean}
type Props={
  initialScript:ScriptType
  initialChar:string
  stats:WritingStatsMap
  onRecord:(char:string,score:number)=>void
  onTargetChange?:(script:ScriptType,char:string)=>void
}
const katakana=[...katakanaBasic,...katakanaExtended]
const charactersFor=(script:ScriptType)=>script==='hiragana'?hiragana:katakana
const supported=(script:ScriptType,char:string)=>script==='hiragana'&&supportedWriting.includes(char)
function isDraft(raw:unknown):raw is Draft {
  if(!raw||typeof raw!=='object')return false
  const draft=raw as Partial<Draft>
  if((draft.script!=='hiragana'&&draft.script!=='katakana')||typeof draft.char!=='string'||!charactersFor(draft.script).some(item=>item.char===draft.char))return false
  if(draft.mode!=='guided'&&draft.mode!=='free')return false
  if(draft.mode==='guided'&&!supported(draft.script,draft.char))return false
  if(typeof draft.graded!=='boolean'||typeof draft.version!=='string'||!Array.isArray(draft.strokes)||draft.strokes.length>MAX_STROKES)return false
  if(draft.graded&&(!supported(draft.script,draft.char)||draft.strokes.length===0))return false
  return draft.strokes.every(stroke=>Array.isArray(stroke)&&stroke.length>=2&&stroke.length<=MAX_POINTS&&stroke.every(point=>point&&typeof point==='object'&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1))
}
function isPreferences(raw:unknown):raw is Preferences {
  if(!raw||typeof raw!=='object')return false
  const preferences=raw as Partial<Preferences>
  return typeof preferences.hide==='boolean'&&typeof preferences.guide==='boolean'&&typeof preferences.overlay==='boolean'
}
function target(script:ScriptType,char:string):Draft {
  const validChar=charactersFor(script).some(item=>item.char===char)?char:script==='hiragana'?'あ':'ア'
  return {script,char:validChar,mode:supported(script,validChar)?'guided':'free',strokes:[],graded:false,version:ALGORITHM_VERSION}
}
function restoredResult(draft:Draft):WritingResult|null {
  if(!draft.graded||draft.version!==ALGORITHM_VERSION)return null
  try{return evaluateWriting(draft.char,draft.strokes)}catch{return null}
}

export function Handwriting({initialScript,initialChar,stats,onRecord,onTargetChange}:Props){
  const first=target(initialScript,initialChar)
  const [draft,setDraft]=useSavedState<Draft>('handwriting-draft',first,(raw):raw is Draft=>isDraft(raw)&&raw.script===first.script&&raw.char===first.char)
  const [preferences,setPreferences]=useSavedState<Preferences>('handwriting-preferences',{hide:false,guide:true,overlay:true},isPreferences)
  const [result,setResult]=useState<WritingResult|null>(()=>restoredResult(draft))
  const [notice,setNotice]=useState('')
  const latestDraft=useRef(draft);latestDraft.current=draft
  const targetCallback=useRef(onTargetChange);targetCallback.current=onTargetChange
  const graded=useRef(draft.graded);graded.current=draft.graded
  const {script,char,mode,strokes}=draft
  const {hide,guide,overlay}=preferences
  const reference=useMemo(()=>referenceStrokes(char),[char])
  const characters=mode==='guided'?hiragana.filter(item=>supportedWriting.includes(item.char)):charactersFor(script)
  const item=charactersFor(script).find(character=>character.char===char)!
  const setPreference=(key:keyof Preferences,value:boolean)=>setPreferences(previous=>({...previous,[key]:value}))
  // Commit a fresh initial target too, so a discarded draft cannot reappear later.
  useEffect(()=>{setDraft(previous=>previous)},[])
  useEffect(()=>{
    const next=target(initialScript,initialChar)
    const changed=latestDraft.current.script!==next.script||latestDraft.current.char!==next.char
    if(changed){
      latestDraft.current=next;graded.current=false;setDraft(next);setResult(null);setNotice('')
    }
  },[initialScript,initialChar])
  useEffect(()=>{targetCallback.current?.(script,char)},[script,char])
  const update=(next:Stroke[])=>{
    graded.current=false
    setDraft(previous=>({...previous,strokes:next,graded:false,version:ALGORITHM_VERSION}))
    setResult(null);setNotice('')
  }
  const choose=(nextScript:ScriptType,nextChar:string,nextMode:PracticeMode=mode)=>{
    if(nextScript===script&&nextChar===char){setDraft(previous=>({...previous,mode:nextMode}));return}
    const next={...target(nextScript,nextChar),mode:nextMode}
    latestDraft.current=next;graded.current=false;setDraft(next);setResult(null);setNotice('')
  }
  const grade=()=>{
    if(graded.current)return
    try{
      const evaluation=evaluateWriting(char,strokes)
      graded.current=true
      setDraft(previous=>({...previous,graded:true,version:evaluation.version}))
      setResult(evaluation);setNotice('');onRecord(char,evaluation.total)
    }catch(error){setNotice(error instanceof Error?error.message:'채점을 완료하지 못했어요.')}
  }
  return <main className="mx-auto max-w-7xl px-5 pb-28 pt-9">
    <p className="text-sm font-bold text-rose-500">손으로 기억하는 일본어</p><h1 className="mt-1 text-3xl font-black">직접 그려보기</h1>
    <p className="mt-3 text-sm text-stone-500">먼저 あ・い・う・え・お 5자를 가이드에 맞춰 써 보세요. 채점은 기준 획과의 학습용 유사도예요.</p>
    <div className="mt-5 flex gap-2" role="group" aria-label="필기 연습 종류"><button className={`writing-button ${mode==='guided'?'primary':''}`} aria-pressed={mode==='guided'} onClick={()=>{choose('hiragana',supported('hiragana',char)?char:'あ','guided');setPreference('guide',true)}}>가이드 연습 · 5글자</button><button className={`writing-button ${mode==='free'?'primary':''}`} aria-pressed={mode==='free'} onClick={()=>setDraft(previous=>({...previous,mode:'free'}))}>자유 연습 · 전체 문자</button></div>
    <section className="writing-panel mt-5"><div className="flex flex-wrap items-end gap-4">
      {mode==='free'&&<label className="font-bold">학습 모드<select className="writing-select" value={script} onChange={event=>{const next=event.target.value as ScriptType;choose(next,next==='hiragana'?'あ':'ア','free')}}><option value="hiragana">히라가나</option><option value="katakana">가타카나</option></select></label>}
      <label className="font-bold">연습 문자<select className="writing-select" value={char} onChange={event=>choose(script,event.target.value)}>{characters.map(character=><option key={character.char} value={character.char}>{hide?character.romaji:`${character.char} · ${character.romaji}`}{supported(script,character.char)?'':' (자유 필기)'}</option>)}</select></label>
      <button className="writing-button" onClick={()=>{const pool=characters.filter(character=>character.char!==char);if(pool.length)choose(script,pool[Math.floor(Math.random()*pool.length)].char)}}>랜덤 출제</button>
    </div><div className="mt-5 flex flex-wrap items-center gap-5"><span aria-label="정답 문자" lang="ja" className="text-6xl">{hide?'?':item.char}</span><div><p className="text-xl font-black text-rose-500">{item.romaji} · {item.sound}</p><p className="mt-1 text-sm text-stone-500">{reference?`기준 ${reference.length}획`:'자유 필기 · 채점과 획순 가이드 미지원'}</p></div></div>
      <AudioControls key={char} contentId={kanaAudioId(script,char)} label={char}/>
      <div className="mt-4 flex flex-wrap gap-5 text-sm"><label><input type="checkbox" checked={hide} onChange={event=>setPreference('hide',event.target.checked)}/> 정답 글자 숨기기</label><label><input type="checkbox" checked={guide} disabled={!reference} onChange={event=>setPreference('guide',event.target.checked)}/> 획순 가이드 표시</label></div>
      {hide&&guide&&reference&&<p className="mt-2 text-xs text-stone-400">입력 영역의 가이드도 숨기려면 ‘획순 가이드 표시’를 꺼 주세요.</p>}
      {!reference&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">이 문자는 자유롭게 써 볼 수 있어요. 검증된 기준 데이터가 없어 채점·획순 평가는 비활성화되어 있어요.</p>}
    </section>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="writing-panel"><h2 className="text-xl font-black">여기에 써 보세요</h2><p id="writing-help" className="my-3 text-sm text-stone-400">마우스·터치·펜으로 입력 · {strokes.length}획{guide&&reference?' · 분홍 점에서 화살표 방향으로 시작':''}</p>
      <WritingCanvas key={`${script}:${char}`} strokes={strokes} onChange={update} guide={reference} showGuide={guide} onNotice={setNotice}/>
      <div className="mt-4 flex flex-wrap gap-2"><button className="writing-button" disabled={!strokes.length} onClick={()=>update(strokes.slice(0,-1))}>마지막 획 되돌리기</button><button className="writing-button" disabled={!strokes.length} onClick={()=>update([])}>전체 지우기</button><button className="writing-button primary" disabled={!reference||draft.graded} onClick={grade}>{draft.graded?'채점 완료':'채점하기'}</button></div>
      <p className="mt-3 text-xs text-stone-400">같은 글자의 필기는 메뉴를 옮기거나 앱을 다시 열어도 이어져요. 문자를 바꾸면 새로 시작해요.</p>
      {draft.graded&&!result&&<p className="mt-3 text-sm text-stone-500">이전 버전에서 채점한 필기예요. 결과를 다시 기록하지 않았어요. 새로 연습하려면 지워 주세요.</p>}
      {notice&&<p className="mt-4 text-sm font-bold text-rose-600" role="alert">{notice}</p>}
    </section><section className="writing-panel" aria-live="polite"><h2 className="text-xl font-black">채점 결과</h2>{result?<>
      <p className="mt-5 text-5xl font-black text-rose-500">{result.total}%</p><p className="mt-2 text-xl font-bold">{scoreMessage(result.total)}</p><p className="mt-1 text-xs text-stone-400">기준 획과의 유사도 · 인식 정확도가 아니에요</p>
      <ul className="my-4 list-disc space-y-2 pl-5 text-sm">{result.feedback.map(feedback=><li key={feedback}>{feedback}</li>)}</ul>
      <label className="text-sm"><input type="checkbox" checked={overlay} onChange={event=>setPreference('overlay',event.target.checked)}/> 정답 획 반투명 겹쳐 보기</label>
      <svg viewBox="0 0 1 1" role="img" aria-label="정답과 사용자 필기 정규화 비교" className="mt-3 aspect-square w-full rounded-2xl border border-orange-100 bg-orange-50/30">
        {overlay&&result.reference.map((stroke,index)=><g key={index}><polyline points={stroke.map(point=>`${point.x},${point.y}`).join(' ')} fill="none" stroke="#fb718566" strokeWidth=".025" strokeLinecap="round" strokeLinejoin="round"/><text x={stroke[0].x-.025} y={stroke[0].y-.025} fontSize=".04" fill="#be123c">{index+1}</text></g>)}
        {result.user.map((stroke,index)=><g key={index}>{stroke.slice(1).map((point,j)=><line key={j} x1={stroke[j].x} y1={stroke[j].y} x2={point.x} y2={point.y} stroke={result.errors[index][j]||result.errors[index][j+1]?'#dc2626':'#334155'} strokeWidth=".012" strokeLinecap="round"/>)}<text x={stroke[0].x+.012} y={stroke[0].y+.035} fontSize=".035" fill={result.mismatchedStrokes[index]?'#dc2626':'#334155'}>{index+1}</text></g>)}
      </svg><p className="mt-2 text-xs leading-relaxed text-stone-500">분홍: 기준 · 진회색: 내 필기 · 빨간 선: 위치 차이 · 빨간 획 번호: 순서·방향·경로 확인 필요. 크기와 위치를 정규화한 비교예요.</p>
      <details className="mt-4 rounded-xl border border-orange-100 p-3 text-sm"><summary className="cursor-pointer font-bold">세부 점수 보기</summary><dl className="mt-3 grid grid-cols-2 gap-3">{[['글자 형태',result.shape],['획 경로·위치',result.path],['길이·비율',result.length],['획 개수',result.count],['획순·방향',result.order]].map(([label,value])=><div key={label} className="rounded-xl bg-orange-50 p-3"><dt>{label}</dt><dd className="font-black">{value}%</dd></div>)}</dl><p className="mt-3 text-xs text-stone-400">평가 버전: {result.version}</p></details>
    </>:<p className="mt-6 text-sm leading-relaxed text-stone-400">{reference?'가이드에 맞춰 글자를 쓰고 ‘채점하기’를 눌러 보세요. 점수와 개선할 부분을 함께 확인할 수 있어요.':'자유 필기는 저장되지만 점수를 매기지 않아요. 채점을 연습하려면 ‘가이드 연습 · 5글자’를 선택해 주세요.'}</p>}</section></div>
    <details className="mt-6"><summary className="cursor-pointer text-sm font-bold text-stone-500">내 손글씨 연습 통계 보기</summary><WritingStats stats={stats}/></details>
    <details className="writing-panel mt-6 text-sm text-stone-500"><summary className="cursor-pointer font-bold">평가 방식·한계 및 데이터 출처</summary><p className="mt-3">전체 형태 45%, 획 경로·위치 25%, 길이 비율 10%, 획 개수 10%, 획순·방향 10%를 합산하고, 형태·경로·획 개수 일치도 곱의 제곱근과 획순 보정 계수(0.8~1)를 곱합니다. 전체 글자 크기와 위치를 정규화하고 획별 경로를 DTW로 비교합니다. 회전·가로세로 비율은 보정하지 않아요.</p><p className="mt-2">단일 기준 서체와의 비교이므로 올바른 개인 필체도 감점될 수 있어요. 실제 사람의 필기 데이터로 인식 정확도나 점수 구간을 검증한 것은 아닙니다. 빨간 표시는 참고용이며 교사의 판단을 대신하지 않습니다. 기록은 이 브라우저 또는 데스크톱 앱에 각각 저장됩니다.</p><p className="mt-2">기준 획: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noreferrer" className="underline">KanjiVG</a> · © Ulrich Apel 및 기여자 · CC BY-SA 3.0. 원본과 샘플링 파생 데이터는 동일 라이선스입니다. <a href={`${import.meta.env.BASE_URL}strokes/ATTRIBUTION.md`} target="_blank" rel="noreferrer" className="underline">출처·변경 내역</a> · <a href={`${import.meta.env.BASE_URL}strokes/LICENSE.txt`} target="_blank" rel="noreferrer" className="underline">라이선스 전문</a></p></details>
  </main>
}
