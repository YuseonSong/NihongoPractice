import { useSyncExternalStore } from 'react'
import { Download, WifiOff } from 'lucide-react'
import { offlineSupport } from '../pwa/client'

export function OfflineSupport(){
  const state=useSyncExternalStore(offlineSupport.subscribe,offlineSupport.getSnapshot,offlineSupport.getSnapshot)
  if(state.status==='unsupported'||state.status==='idle')return null
  const ready=state.status==='ready',preparing=state.status==='preparing'
  return <aside className="mx-auto mb-5 max-w-7xl px-5" aria-label="앱 설치 및 오프라인 사용">
    <div className="rounded-2xl border border-orange-100 bg-white p-4 text-sm text-stone-600">
      <p role="status" className="flex items-center gap-2 font-bold">
        {ready?<WifiOff size={17} className="shrink-0 text-emerald-600"/>:<Download size={17} className="shrink-0 text-rose-500"/>}
        {ready?'오프라인 준비 완료':preparing?'학습 자료를 이 기기에 저장하고 있어요':'오프라인 자료 저장을 완료하지 못했어요'}
      </p>
      {preparing&&<div className="mt-3"><progress aria-label="오프라인 자료 저장" className="h-2 w-full accent-rose-500" value={state.completed} max={Math.max(1,state.total)}/><p className="mt-1 text-xs">{state.total?`${state.completed} / ${state.total}개`:'저장할 자료 확인 중…'} · 완료될 때까지 인터넷을 연결해 주세요.</p></div>}
      {ready&&<p className="mt-2 text-xs leading-relaxed">음성 216개와 학습 자료를 저장했어요. 인터넷 없이도 다시 열어 공부할 수 있어요.</p>}
      {state.status==='error'&&<div className="mt-2"><p role="alert" className="text-xs leading-relaxed">{state.message??'인터넷 연결과 기기의 저장 공간을 확인한 뒤 다시 시도해 주세요.'}</p><button className="writing-button mt-3" onClick={()=>void offlineSupport.prepare()}>저장 다시 시도</button></div>}
      <details className="mt-3"><summary className="cursor-pointer text-sm font-bold">아이패드 홈 화면에 설치하기</summary><ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed"><li>아이패드 Safari에서 이 주소를 열어 주세요.</li><li>공유 버튼 → ‘홈 화면에 추가’를 선택하고, ‘웹 앱으로 열기’가 보이면 켜 주세요.</li><li>홈 화면의 Nihongo Mate를 열고 ‘오프라인 준비 완료’를 확인해 주세요.</li></ol><p className="mt-3 text-xs leading-relaxed">학습 기록은 이 기기에 저장되며 PC와 자동으로 동기화되지 않아요. 앱이나 사이트 데이터를 지우면 저장한 자료와 기록도 삭제될 수 있어요.</p></details>
    </div>
  </aside>
}
