import type { WritingStatsMap } from '../types'

export function WritingStats({stats}:{stats:WritingStatsMap}){
  const entries=Object.entries(stats), count=entries.reduce((n,[,s])=>n+s.attempts,0)
  const average=count?Math.round(entries.reduce((n,[,s])=>n+s.sum,0)/count):0
  const difficult=entries.filter(([,s])=>s.sum/s.attempts<75).sort((a,b)=>a[1].sum/a[1].attempts-b[1].sum/b[1].attempts).slice(0,5)
  return <section className="writing-panel mt-7"><h2 className="text-xl font-black">손글씨 연습 기록</h2><p className="mt-3 text-stone-500">총 {count}회 · 평균 {average}% · 90점 이상 달성 {entries.filter(([,s])=>s.best>=90).length}/5자</p>
    {entries.length>0?<div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['문자','연습 횟수','최고','최근','평균'].map(t=><th className="p-2" key={t}>{t}</th>)}</tr></thead><tbody>{entries.map(([char,s])=><tr key={char} className="border-t border-orange-100"><th className="p-2 text-xl">{char}</th><td>{s.attempts}회</td><td>{s.best}%</td><td>{s.latest}%</td><td>{Math.round(s.sum/s.attempts)}%</td></tr>)}</tbody></table></div>:<p className="mt-3 text-sm text-stone-400">첫 글자를 쓰고 채점하면 기록이 쌓여요.</p>}
    <p className="mt-4 text-sm text-stone-500">자주 틀리는 문자 (평균 75점 미만): {difficult.length?difficult.map(([c])=>c).join(' · '):'아직 없어요'}</p>
  </section>
}
