import { useState } from 'react'
import { ChevronLeft, ChevronRight, Rotate3D } from 'lucide-react'
import { hiragana } from '../data/hiragana'
import type { Progress } from '../types'

export function Cards({ progress, toggleLearned }: { progress: Progress; toggleLearned: (char: string) => void }) {
  const [index, setIndex] = useState(0); const [flipped, setFlipped] = useState(false)
  const card = hiragana[index]; const done = progress.learned.includes(card.char)
  const move = (delta: number) => { setIndex((index + delta + hiragana.length) % hiragana.length); setFlipped(false) }
  return <main className="mx-auto max-w-3xl px-5 pb-28 pt-10 text-center">
    <p className="text-sm font-bold text-rose-500">암기 카드</p><h1 className="mt-1 text-3xl font-black">보고, 떠올리고, 뒤집기</h1><p className="mt-3 text-stone-500">카드를 눌러 발음과 설명을 확인하세요.</p>
    <div className="mx-auto mt-8 flex max-w-xl items-center justify-between text-sm font-bold text-stone-400"><span>{index + 1} / 46</span><span>{card.group}</span></div>
    <button aria-label="암기 카드 뒤집기" onClick={() => setFlipped(!flipped)} className="mx-auto mt-3 block h-96 w-full max-w-xl [perspective:1000px]">
      <div className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
        <div className="absolute inset-0 grid place-items-center rounded-[2rem] border border-orange-100 bg-white shadow-soft [backface-visibility:hidden]"><div><span className="text-[9rem] font-medium leading-none text-ink">{card.char}</span><p className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-stone-400"><Rotate3D size={17}/>눌러서 정답 확인</p></div></div>
        <div className="absolute inset-0 grid place-items-center rounded-[2rem] bg-gradient-to-br from-rose-400 to-orange-300 p-8 text-white shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)]"><div><p className="text-7xl font-black">{card.romaji}</p><p className="mt-4 text-2xl font-black">한국어로 “{card.sound}”</p><p className="mt-4 rounded-2xl bg-white/20 px-5 py-3 font-semibold">{card.tip}</p></div></div>
      </div>
    </button>
    <div className="mx-auto mt-6 flex max-w-xl items-center justify-between"><button onClick={() => move(-1)} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm"><ChevronLeft/></button><button onClick={() => toggleLearned(card.char)} className={`rounded-2xl px-7 py-3 font-black ${done ? 'bg-rose-100 text-rose-500' : 'bg-ink text-white'}`}>{done ? '학습 완료 ✓' : '외웠어요'}</button><button onClick={() => move(1)} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm"><ChevronRight/></button></div>
  </main>
}
