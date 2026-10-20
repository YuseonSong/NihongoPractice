import data from '../data/writing-strokes.json'

export type Point = { x: number; y: number }
export type Stroke = Point[]
export const supportedWriting = Object.keys(data)
export const ALGORITHM_VERSION = 'kanjivg-rules-v1'
export const MAX_STROKES = 24
export const MAX_POINTS = 2048
export function referenceStrokes(char: string): Stroke[] | undefined {
  const paths = (data as Record<string, number[][][]>)[char]
  return paths?.map(stroke => stroke.map(([x, y]) => ({ x: x / 109, y: y / 109 })))
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x-b.x, a.y-b.y)
export const strokeLength = (s: Stroke) => s.slice(1).reduce((sum, p, i) => sum + distance(s[i], p), 0)

// Whole-character isotropic scaling preserves aspect ratios and relative positions.
export function normalize(strokes: Stroke[]): Stroke[] {
  const all = strokes.flat()
  if (!all.length) return []
  const xs = all.map(p=>p.x), ys = all.map(p=>p.y)
  const left = Math.min(...xs), top = Math.min(...ys)
  const width = Math.max(...xs)-left, height = Math.max(...ys)-top
  const scale = Math.max(width, height, 1e-8)
  return strokes.map(s=>s.map(p=>({x:(p.x-left-width/2)/scale*.8+.5, y:(p.y-top-height/2)/scale*.8+.5})))
}
export function resample(s: Stroke, count = 40): Stroke {
  if (!s.length) return []
  const lengths = [0]
  for(let i=1;i<s.length;i++) lengths.push(lengths[i-1]+distance(s[i-1],s[i]))
  const total = lengths[lengths.length-1]
  if (total < 1e-8) return Array.from({length:count},()=>({...s[0]}))
  let j=1
  return Array.from({length:count},(_,i)=>{
    const target = i*total/(count-1)
    while(j<lengths.length-1 && lengths[j]<target) j++
    const t = (target-lengths[j-1])/(lengths[j]-lengths[j-1] || 1)
    return {x:s[j-1].x+(s[j].x-s[j-1].x)*t,y:s[j-1].y+(s[j].y-s[j-1].y)*t}
  })
}
function dtw(a: Stroke, b: Stroke): number {
  let previous = Array(b.length+1).fill(Infinity); previous[0]=0
  for (let i=0;i<a.length;i++) {
    const current = Array(b.length+1).fill(Infinity)
    for(let j=0;j<b.length;j++) current[j+1]=distance(a[i],b[j])+Math.min(previous[j],previous[j+1],current[j])
    previous=current
  }
  return previous[b.length]/Math.max(a.length,b.length)
}
const similarity = (error:number, tolerance:number) => Math.exp(-Math.pow(error/tolerance,2))*100
const mean = (values:number[]) => values.reduce((a,b)=>a+b,0)/Math.max(1,values.length)
const nearest = (p:Point, points:Point[]) => Math.min(...points.map(q=>distance(p,q)))

export interface WritingResult {
  total:number; shape:number; path:number; length:number; count:number; order:number
  reference:Stroke[]; user:Stroke[]; errors:boolean[][]; mismatchedStrokes:boolean[]
  feedback:string[]; version:string
}

export function evaluateWriting(char:string, input:Stroke[]):WritingResult {
  const reference = referenceStrokes(char)
  if(!reference) throw new Error('이 문자는 아직 검증된 채점을 지원하지 않아요. 획순 평가도 제공하지 않습니다.')
  if(!input.length || input.some(s=>s.length<2 || s.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))) || input.reduce((n,s)=>n+strokeLength(s),0)<.02)
    throw new Error('먼저 연습 영역에 글자를 써 주세요. 점만 찍은 입력은 채점하지 않아요.')
  if(input.length>MAX_STROKES || input.some(s=>s.length>MAX_POINTS)) throw new Error('입력이 너무 많아요. 지우고 다시 써 주세요.')
  const ref=normalize(reference).map(s=>resample(s)), user=normalize(input).map(s=>resample(s))
  const rp=ref.flat(), up=user.flat()
  const shape=similarity((mean(up.map(p=>nearest(p,rp)))+mean(rp.map(p=>nearest(p,up))))/2,.13)
  const costs=user.map(s=>ref.map(r=>{
    const forward=dtw(s,r), reverse=dtw([...s].reverse(),r)
    return {error:Math.min(forward,reverse), reversed:reverse+.012<forward}
  }))
  // Exhaustive one-to-one matching is small for the supported two/three-stroke kana.
  // Missing strokes carry unit distance; extra strokes are penalized by count/shape.
  let bestCost=Infinity, best:number[]=[]
  const visit=(indices:number[], used:Set<number>, cost:number)=>{
    const j=indices.length
    if(j===ref.length){if(cost<bestCost){bestCost=cost;best=indices.slice()}return}
    for(let i=0;i<user.length;i++) if(!used.has(i)) {
      used.add(i); visit([...indices,i],used,cost+costs[i][j].error);used.delete(i)
    }
    if(user.length<ref.length) visit([...indices,-1],used,cost+1)
  }
  visit([],new Set(),0)
  const path=similarity(bestCost/ref.length,.14)
  const length=mean(best.map((i,j)=>i<0?0:100*Math.min(strokeLength(user[i]),strokeLength(ref[j]))/Math.max(strokeLength(user[i]),strokeLength(ref[j]),1e-8)))
  const count=100*Math.min(ref.length,user.length)/Math.max(ref.length,user.length)
  const order=100*best.filter((i,j)=>i===j&&!costs[i][j].reversed).length/Math.max(ref.length,user.length)
  // Geometric gates prevent a good silhouette from hiding bad stroke paths/count.
  // These are rule tolerances, not a calibrated probability of correct recognition.
  const total=Math.round((shape*.45+path*.25+length*.1+count*.1+order*.1)*Math.sqrt(shape*path*count/1_000_000)*(.8+.2*order/100))
  const mismatchedStrokes=user.map((_,i)=>{
    const j=best.indexOf(i)
    return j<0 || i!==j || costs[i][j].reversed || costs[i][j].error>.12
  })
  const feedback:string[]=[]
  if(shape<75) feedback.push('반투명 기준 획과 비교하며 전체 모양과 획 사이 간격을 확인해 보세요.')
  if(count<100) feedback.push(`기준은 ${ref.length}획, 입력은 ${user.length}획이에요. 펜을 떼는 위치를 확인해 보세요.`)
  if(order<100) feedback.push('획 번호와 시작점을 따라 순서와 진행 방향을 확인해 보세요.')
  if(length<80) feedback.push('긴 획과 짧은 획의 비율을 조절해 보세요.')
  if(!feedback.length) feedback.push('기준 획과 잘 맞아요. 글자를 숨기고 한 번 더 써 보세요.')
  return {total,shape:Math.round(shape),path:Math.round(path),length:Math.round(length),count:Math.round(count),order:Math.round(order),reference:ref,user,errors:user.map(s=>s.map(p=>nearest(p,rp)>.075)),mismatchedStrokes,feedback,version:ALGORITHM_VERSION}
}

export const scoreMessage=(score:number)=>score>=90?'매우 잘했어요!':score>=75?'잘했어요!':score>=50?'조금 더 연습해 봐요!':'다시 도전해 봐요!'
