import { ArrowRight } from 'lucide-react'
import { AudioControls } from '../components/AudioControls'
import { conversationAudioId, kanaAudioId, vocabularyAudioId } from '../audio/catalog'

type Props={onStudy:()=>void}
export function PronunciationGuide({onStudy}:Props){
  return <main className="mx-auto max-w-3xl px-5 pb-28 pt-9">
    <p className="text-sm font-bold text-rose-500">문자에서 회화로 넘어가기 전에</p>
    <h1 className="mt-1 text-3xl font-black">발음 길잡이</h1>
    <p className="mt-3 text-sm leading-relaxed text-stone-500">한 번에 외울 필요는 없어요. 모르는 표기가 나오면 여기서 확인하고, 내장 음성을 천천히 따라 해 보세요. 한글·로마자는 일본어 소리와 완전히 같지 않아요.</p>
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">1. 작은 점과 동그라미 · 탁음과 반탁음</h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">오른쪽 위의 ゛는 소리를 바꿔요. か → が (ka → ga), さ → ざ (sa → za)처럼 읽어요. は행에 ゜를 붙이면 ぱ・ぴ・ぷ・ぺ・ぽ가 돼요. 히라가나와 가타카나에 같은 규칙이 적용돼요.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-stone-50 p-3"><p className="mb-2 text-center font-bold"><span lang="ja">ガ / が</span> · ga</p><AudioControls contentId={kanaAudioId('katakana','ガ')} label="ガ" compact/></div><div className="rounded-xl bg-stone-50 p-3"><p className="mb-2 text-center font-bold"><span lang="ja">パ / ぱ</span> · pa</p><AudioControls contentId={kanaAudioId('katakana','パ')} label="パ" compact/></div></div>
      </section>
      <section className="rounded-2xl border border-orange-100 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">2. 길게 읽는 소리 · 장음</h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">모음을 한 박자 더 이어서 읽어요. 가타카나는 보통 ー로 표시해요. 히라가나는 おかあさん처럼 모음을 덧붙이며, おう・えい가 긴 소리로 읽히는 단어도 많아요.</p>
        <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm"><strong lang="ja">コーヒー</strong> · こーひー · 커피<br/><span className="text-stone-500">コ・ー・ヒ・ー, 네 박자의 길이를 의식해 보세요.</span></p>
        <div className="mt-3"><AudioControls contentId={vocabularyAudioId('コーヒー')} label="コーヒー"/></div>
      </section>
      <section className="rounded-2xl border border-orange-100 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">3. 작은 っ / ッ · 잠깐 막는 한 박자</h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">작은 っ는 ‘츠’라고 읽지 않아요. 다음 자음으로 넘어가기 전에 한 박자 막거나 멈춰요. 앞의 모음을 길게 늘이는 장음과 구별해 보세요.</p>
        <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm"><strong lang="ja">ちょっと忙しい。</strong><br/><span lang="ja">ちょっと いそがしい。</span> · 조금 바빠.<br/><span className="text-stone-500">ちょ・っ・と에서 작은 っ의 한 박자를 들어 보세요.</span></p>
        <div className="mt-3"><AudioControls contentId={conversationAudioId('daily-3')} label="ちょっと忙しい。"/></div>
      </section>
      <section className="rounded-2xl border border-orange-100 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">4. 작은 ゃ・ゅ・ょ · 두 글자가 한 박자</h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">き・し・ち 같은 글자 뒤에 작은 ゃ・ゅ・ょ가 붙으면 묶어서 읽어요. きゃ (kya)는 한 박자, 큰 や를 쓴 きや (ki-ya)는 두 박자예요.</p>
        <p className="mt-4 text-center font-bold"><span lang="ja">キャ / きゃ</span> · kya</p>
        <div className="mt-3"><AudioControls contentId={kanaAudioId('katakana','キャ')} label="キャ"/></div>
      </section>
      <section className="rounded-2xl border border-orange-100 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">5. 조사 は・へ・を · 적는 글자와 읽는 소리</h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">문장 속에서 조사로 쓰인 は는 wa, へ는 e, を는 보통 o로 읽어요. は・へ가 모든 단어에서 이렇게 읽히는 것은 아니에요.</p>
        <div className="mt-4 rounded-xl bg-orange-50 p-3 text-sm"><p><strong lang="ja">こんにちは。</strong> · 읽기: <span lang="ja">こんにちわ</span> · 안녕하세요.</p><p className="mt-1 text-stone-500">인사말의 は도 wa로 읽어요. 표기는 こんにちは예요.</p></div>
        <div className="mt-3"><AudioControls contentId={conversationAudioId('greetings-2')} label="こんにちは。"/></div>
        <div className="mt-4 rounded-xl bg-orange-50 p-3 text-sm"><p><strong lang="ja">ここへ行きたいです。</strong><br/>읽기: <span lang="ja">ここえ いきたいです</span> · 여기에 가고 싶어요.</p></div>
        <div className="mt-3"><AudioControls contentId={conversationAudioId('travel-2')} label="ここへ行きたいです。"/></div>
        <p className="mt-4 text-sm text-stone-600"><span lang="ja">ほんを よむ</span> (hon o yomu) · 책을 읽다 — を는 o로 읽어요.</p>
      </section>
    </div>
    <button className="writing-button primary mt-6 justify-center" onClick={onStudy}>히라가나 학습으로<ArrowRight size={16}/></button>
  </main>
}
