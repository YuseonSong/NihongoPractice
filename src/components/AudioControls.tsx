import { useEffect, useId, useSyncExternalStore } from 'react'
import { Repeat2, Square, Volume2 } from 'lucide-react'
import { getAudioTarget } from '../audio/catalog'
import { audioPlayer } from '../audio/player'

export function AudioControls({contentId,label,compact=false}:{contentId:string;label:string;compact?:boolean}){
  const owner=useId(), state=useSyncExternalStore(audioPlayer.subscribe,audioPlayer.getSnapshot,audioPlayer.getSnapshot)
  const target=getAudioTarget(contentId,label), mine=state.owner===owner
  const busy=mine&&(state.status==='playing'||state.status==='loading')
  useEffect(()=>()=>audioPlayer.stopOwner(owner),[owner,contentId])
  return <div className={`audio-controls ${compact?'compact':''}`} role="group" aria-label={`${label} 음성 재생`} data-audio-id={target.id}>
    <div className="flex flex-wrap justify-center gap-1.5">
      <button type="button" className="audio-button" aria-label={`${label} 발음 듣기`} onClick={()=>void audioPlayer.play(owner,target,1,mine&&state.repeat)}><Volume2 size={14}/>{compact?'듣기':'발음 듣기'} <span className="text-[10px] opacity-60">1.0×</span></button>
      <button type="button" className="audio-button" aria-label={`${label} 느리게 듣기`} onClick={()=>void audioPlayer.play(owner,target,.8,mine&&state.repeat)}>{compact?'느리게':'느리게 듣기'} <span className="text-[10px] opacity-60">0.8×</span></button>
      <button type="button" className={`audio-button ${mine&&state.repeat?'active':''}`} aria-label={`${label} 반복 재생`} aria-pressed={mine&&state.repeat} onClick={()=>{
        if(busy)audioPlayer.setRepeat(owner,!state.repeat);else void audioPlayer.play(owner,target,mine?state.rate:1,true)
      }}><Repeat2 size={14}/>{compact?'반복':'반복 재생'}</button>
      {busy&&<button type="button" className="audio-button" aria-label={`${label} 재생 중지`} onClick={()=>audioPlayer.stopOwner(owner)}><Square size={12}/>중지</button>}
    </div>
    <div aria-live="polite" className="mt-1 text-center text-xs">
      {busy&&<p className="font-bold text-blue-600">{state.status==='loading'?'음성 준비 중…':`재생 중 · ${state.rate.toFixed(1)}배${state.repeat?' · 반복':''}`}</p>}
      {!target.url&&<p className="text-amber-700">내장 음성 없음 · 일본어 시스템 음성만 보조 사용</p>}
      {mine&&state.message&&<p role={state.status==='error'?'alert':'status'} className="rounded-lg bg-amber-50 p-2 text-amber-800">{state.message}</p>}
    </div>
  </div>
}
