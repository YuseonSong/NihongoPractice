import { Check } from 'lucide-react'
import { groups, hiragana } from '../data/hiragana'
import type { Progress } from '../types'

export function Learn({ progress, toggleLearned }: { progress: Progress; toggleLearned: (char: string) => void }) {
  return <main className="mx-auto max-w-6xl px-5 pb-28 pt-10">
    <div><p className="text-sm font-bold text-rose-500">기본 46자</p><h1 className="mt-1 text-3xl font-black md:text-4xl">문자표로 익히기</h1><p className="mt-3 text-stone-500">문자를 눌러 학습 완료로 표시하세요. <span className="font-bold text-ink">{progress.learned.length}/46 완료</span></p></div>
    <div className="mt-9 space-y-8">{groups.map((group) => <section key={group}><h2 className="mb-3 text-sm font-black text-stone-400">{group}</h2><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{hiragana.filter((item) => item.group === group).map((item) => { const done = progress.learned.includes(item.char); return <button key={item.char} onClick={() => toggleLearned(item.char)} className={`group relative min-h-36 rounded-2xl border p-4 text-center transition hover:-translate-y-1 hover:shadow-soft ${done ? 'border-rose-300 bg-rose-50' : 'border-orange-100 bg-white'}`}><span className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full ${done ? 'bg-rose-400 text-white' : 'border border-stone-200 text-transparent'}`}><Check size={14}/></span><span className="block text-5xl font-medium text-ink">{item.char}</span><span className="mt-2 block font-black text-rose-500">{item.romaji}</span><span className="mt-1 block text-xs text-stone-400">{item.sound} · {item.tip}</span></button>})}</div></section>)}</div>
  </main>
}
