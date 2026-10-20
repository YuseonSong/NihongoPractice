import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from '../audio/player'
import type { PlaybackEnvironment } from '../audio/player'
import { audioCatalog, audioManifest, getAudioTarget, kanaAudioId } from '../audio/catalog'
import { buildAudioCatalog } from '../audio/catalog-builder'
import { hiragana } from '../data/hiragana'
import { katakana, katakanaBasic } from '../data/katakana'
import { allConversationPhrases } from '../data/conversations'
import readings from '../data/audio-readings.json'

class FakeAudio {
  src:string;preload='';playbackRate=1;preservesPitch=false;loop=false;paused=true
  onended:(()=>void)|null=null;onerror:(()=>void)|null=null;onplaying:(()=>void)|null=null
  play=vi.fn(async()=>{this.paused=false;this.onplaying?.()})
  pause=vi.fn(()=>{this.paused=true})
  load=vi.fn()
  removeAttribute=vi.fn()
  constructor(url:string){this.src=url}
}
function setup(voices:SpeechSynthesisVoice[]=[]){
  const audios:FakeAudio[]=[], voiceEvents=new EventTarget(), utterances:SpeechSynthesisUtterance[]=[]
  const speech={getVoices:vi.fn(()=>voices),speak:vi.fn((u:SpeechSynthesisUtterance)=>utterances.push(u)),cancel:vi.fn(),
    addEventListener:voiceEvents.addEventListener.bind(voiceEvents),removeEventListener:voiceEvents.removeEventListener.bind(voiceEvents)} as unknown as SpeechSynthesis
  const env:PlaybackEnvironment={createAudio:url=>{const a=new FakeAudio(url);audios.push(a);return a as unknown as HTMLAudioElement},getSpeech:()=>speech,createUtterance:text=>({text}) as SpeechSynthesisUtterance}
  return {player:new AudioPlayer(env),audios,speech,voiceEvents,utterances,env}
}
const recorded={id:'a',text:'あ',reading:'あ',url:'/audio/kana/kana_a.wav'}
afterEach(()=>vi.useRealTimers())
describe('오프라인 음성 카탈로그',()=>{
  it('실제 학습 데이터를 모두 매핑하고 동음 문자 파일을 공유한다',()=>{
    expect(buildAudioCatalog(hiragana,katakana,allConversationPhrases,readings)).toEqual(audioCatalog)
    for(const [scope,characters] of [['hiragana',hiragana],['katakana',katakanaBasic]] as const)
      for(const c of characters)expect(getAudioTarget(kanaAudioId(scope,c.char),c.char).id).toBeDefined()
    expect(getAudioTarget('kana:hiragana:あ','あ').id).toBe(getAudioTarget('kana:katakana:ア','ア').id)
    expect(getAudioTarget('kana:hiragana:を','を').id).toBe(getAudioTarget('kana:hiragana:お','お').id)
    expect(getAudioTarget('kana:katakana:ヂ','ヂ').id).toBe(getAudioTarget('kana:katakana:ジ','ジ').id)
  })
  it('は・へ의 단독 모라와 何ですか・空いてる의 읽기를 명시한다',()=>{
    expect(audioCatalog.scripts.kana_ha.synthesisText).toBe("ハ'")
    expect(audioCatalog.scripts.kana_he.synthesisText).toBe("ヘ'")
    expect(audioCatalog.scripts.conversation_hobbies_1.synthesisText).toContain('なんですか')
    expect(audioCatalog.scripts.conversation_dining_3.synthesisText).toContain('なんですか')
    expect(audioCatalog.scripts.conversation_plans_1.synthesisText).toContain('あいてる')
  })
  it('신규 문장의 읽기 검토가 없으면 카탈로그 생성을 거부한다',()=>{
    expect(()=>buildAudioCatalog(hiragana,katakana,[{...allConversationPhrases[0],id:'new-unreviewed'}],readings)).toThrow('읽기 검토')
  })
  it('모든 학습 항목에 실제 생성 메타데이터가 있다',()=>{
    expect(Object.keys(audioCatalog.content)).toHaveLength(266)
    expect(Object.keys(audioManifest.assets)).toHaveLength(216)
    for(const id of Object.values(audioCatalog.content)){
      const asset=audioManifest.assets[id]
      expect(asset?.duration).toBeGreaterThan(.08)
      expect(asset?.sha256).toMatch(/^[a-f0-9]{64}$/)
    }
  })
})
describe('단일 음성 재생기',()=>{
  it('내장 파일이 있으면 시스템 음성을 조회하지 않고 1.0/0.8배로 재생한다',async()=>{
    const {player,audios,speech}=setup()
    await player.play('one',recorded)
    expect(speech.getVoices).not.toHaveBeenCalled()
    expect(audios[0].playbackRate).toBe(1)
    await player.play('two',recorded,.8)
    expect(audios[0].paused).toBe(true)
    expect(audios[1].playbackRate).toBe(.8)
    expect(audios[1].preservesPitch).toBe(true)
    expect(player.getSnapshot().status).toBe('playing')
  })
  it('반복을 켜고 끄며 중지·다른 카드 재생·화면 이탈 시 이전 음성을 정리한다',async()=>{
    const {player,audios}=setup()
    await player.play('one',recorded,1,true)
    expect(audios[0].loop).toBe(true)
    player.setRepeat('one',false);expect(audios[0].loop).toBe(false)
    player.stopOwner('other');expect(audios[0].paused).toBe(false)
    player.stopOwner('one');expect(audios[0].paused).toBe(true)
    expect(player.getSnapshot().status).toBe('idle')
  })
  it('손상/누락 파일 오류를 안내하며 다른 언어 음성으로 대체하지 않는다',async()=>{
    const {player,audios,speech}=setup()
    await player.play('one',recorded)
    audios[0].onerror?.()
    expect(player.getSnapshot().status).toBe('error')
    expect(player.getSnapshot().message).toContain('누락')
    expect(speech.speak).not.toHaveBeenCalled()
  })
  it('지원하지 않는 환경에서도 안내하며 예외를 던지지 않는다',async()=>{
    const {env}=setup();env.getSpeech=()=>undefined
    const player=new AudioPlayer(env)
    await player.play('one',{...recorded,url:undefined})
    expect(player.getSnapshot().message).toContain('지원되지')
  })
  it('일본어 음성 목록의 비동기 로딩을 기다린다',async()=>{
    const {player,speech,voiceEvents,utterances}=setup()
    const pending=player.play('one',{...recorded,url:undefined},.8,true)
    vi.mocked(speech.getVoices).mockReturnValue([{lang:'ja-JP'} as SpeechSynthesisVoice])
    voiceEvents.dispatchEvent(new Event('voiceschanged'));await pending
    expect(utterances[0].voice?.lang).toBe('ja-JP')
    expect(utterances[0].rate).toBe(.8)
    player.stop()
  })
  it('한국어·영어만 있으면 발화하지 않고 누락 안내를 표시한다',async()=>{
    vi.useFakeTimers()
    const {player,speech}=setup([{lang:'ko-KR'} as SpeechSynthesisVoice,{lang:'en-US'} as SpeechSynthesisVoice])
    const pending=player.play('one',{...recorded,url:undefined})
    await vi.advanceTimersByTimeAsync(1500);await pending
    expect(speech.speak).not.toHaveBeenCalled()
    expect(player.getSnapshot().message).toContain('일본어 시스템 음성을 찾지 못했어요')
  })
  it('음성 목록 대기 도중 다른 파일을 재생하면 늦은 발화를 막는다',async()=>{
    const {player,speech,voiceEvents}=setup()
    const pending=player.play('one',{...recorded,url:undefined})
    await player.play('two',recorded)
    vi.mocked(speech.getVoices).mockReturnValue([{lang:'ja-JP'} as SpeechSynthesisVoice]);voiceEvents.dispatchEvent(new Event('voiceschanged'));await pending
    expect(speech.speak).not.toHaveBeenCalled()
    expect(player.getSnapshot().owner).toBe('two')
  })
  it('발화 반복과 재생 종료를 처리한다',async()=>{
    const {player,utterances}=setup([{lang:'ja-JP'} as SpeechSynthesisVoice])
    await player.play('one',{...recorded,url:undefined},1,true)
    utterances[0].onend?.({} as SpeechSynthesisEvent)
    expect(utterances).toHaveLength(2)
    player.setRepeat('one',false);utterances[1].onend?.({} as SpeechSynthesisEvent)
    expect(player.getSnapshot().status).toBe('idle')
  })
  it('취소한 파일의 늦은 play 거부가 새 파일의 재생 상태를 덮어쓰지 않는다',async()=>{
    const {player,env}=setup()
    const delayed=new FakeAudio('/old.wav')
    let rejectOld!:(error:Error)=>void
    delayed.play=vi.fn(()=>new Promise<void>((_resolve,reject)=>{rejectOld=reject}))
    vi.spyOn(env,'createAudio').mockImplementationOnce(()=>delayed as unknown as HTMLAudioElement)
    const old=player.play('old',recorded)
    await player.play('new',recorded)
    rejectOld(new Error('cancelled old request'));await old
    expect(delayed.paused).toBe(true)
    expect(player.getSnapshot()).toMatchObject({owner:'new',status:'playing',message:''})
  })
})
