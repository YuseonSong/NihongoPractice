export function AudioCredits(){
  return <aside className="mx-auto max-w-7xl px-5 pb-24 text-xs text-stone-400 lg:pb-6">
    <details className="rounded-2xl border border-orange-100 p-4"><summary className="cursor-pointer font-bold">음성 출처 및 이용 안내 · VOICEVOX Nemo</summary>
      <p className="mt-3">音声: VOICEVOX Nemo（女声1）· CV: 亜咲比 凛. 앱에 포함한 일본어 합성 음성입니다. Windows 일본어 언어팩 없이 들을 수 있어요.</p>
      <p className="mt-2">음성을 재배포할 때도 출처 표시와 공식 이용약관을 지켜 주세요. 합성 음성이므로 억양이 실제 회화와 다를 수 있어요.</p>
      <p className="mt-2"><a className="underline" href={`${import.meta.env.BASE_URL}audio/LICENSE.md`} target="_blank" rel="noreferrer">앱 음성 출처</a> · <a className="underline" href="https://voicevox.hiroshiba.jp/nemo/term/" target="_blank" rel="noreferrer">VOICEVOX Nemo 공식 이용약관</a></p>
    </details>
  </aside>
}
