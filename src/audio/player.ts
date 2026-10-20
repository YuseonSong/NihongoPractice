import type { AudioTarget } from './catalog'

export type PlaybackRate=.8|1
export interface PlaybackState { owner:string|null; status:'idle'|'loading'|'playing'|'error'; source:'file'|'speech'|null; rate:PlaybackRate; repeat:boolean; message:string }
export interface PlaybackEnvironment {
  createAudio:(url:string)=>HTMLAudioElement
  getSpeech:()=>SpeechSynthesis|undefined
  createUtterance:(text:string)=>SpeechSynthesisUtterance
}
const browserEnvironment:PlaybackEnvironment={
  createAudio:url=>new Audio(url),
  getSpeech:()=>typeof window!=='undefined'?window.speechSynthesis:undefined,
  createUtterance:text=>new SpeechSynthesisUtterance(text),
}
const initialState=():PlaybackState=>({owner:null,status:'idle',source:null,rate:1,repeat:false,message:''})

export class AudioPlayer {
  private state=initialState()
  private listeners=new Set<()=>void>()
  private token=0
  private audio:HTMLAudioElement|null=null
  private utterance:SpeechSynthesisUtterance|null=null
  private cancelVoiceWait:(()=>void)|null=null
  constructor(private environment:PlaybackEnvironment=browserEnvironment){}
  getSnapshot=()=>this.state
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}}
  private publish(next:Partial<PlaybackState>){this.state={...this.state,...next};this.listeners.forEach(listener=>listener())}
  private release(){
    this.cancelVoiceWait?.();this.cancelVoiceWait=null
    if(this.audio){this.audio.onended=null;this.audio.onerror=null;this.audio.onplaying=null;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.audio=null}
    if(this.utterance){this.utterance.onend=null;this.utterance.onerror=null;this.utterance.onstart=null;this.environment.getSpeech()?.cancel();this.utterance=null}
  }
  stop=()=>{this.token++;this.release();this.publish(initialState())}
  stopOwner=(owner:string)=>{if(this.state.owner===owner)this.stop()}
  setRepeat=(owner:string,repeat:boolean)=>{
    if(this.state.owner!==owner)return
    this.publish({repeat});if(this.audio)this.audio.loop=repeat
  }
  async play(owner:string,target:AudioTarget,rate:PlaybackRate=1,repeat=false){
    this.stop()
    const token=this.token
    this.publish({owner,status:'loading',source:target.url?'file':'speech',rate,repeat,message:''})
    const fail=(message:string)=>{if(token!==this.token)return;this.token++;this.release();this.publish({status:'error',repeat:false,message})}
    if(target.url){
      try{
        const audio=this.environment.createAudio(target.url);this.audio=audio
        audio.preload='auto';audio.playbackRate=rate;audio.preservesPitch=true;audio.loop=repeat
        audio.onplaying=()=>{if(token===this.token)this.publish({status:'playing'})}
        audio.onended=()=>{if(token===this.token&&!this.state.repeat){this.release();this.publish({status:'idle',repeat:false})}}
        audio.onerror=()=>fail('내장 음성 파일을 재생할 수 없어요. 파일이 누락되었거나 손상됐을 수 있으니 앱을 다시 설치해 주세요.')
        await audio.play()
        if(token===this.token&&this.audio===audio)this.publish({status:'playing'})
      }catch{fail('음성을 재생하지 못했어요. 소리 설정을 확인하고 발음 듣기를 다시 눌러 주세요.')}
      return
    }
    // Only an absent bundled asset may use the optional Japanese system voice.
    const speech=this.environment.getSpeech()
    if(!speech){fail('이 항목의 내장 음성이 없고 일본어 시스템 음성도 지원되지 않아요. 음성이 포함된 최신 앱을 사용해 주세요.');return}
    const findJapanese=()=>speech.getVoices().find(v=>/^ja(?:-JP)?$/i.test(v.lang.replace(/_/g,'-')))
    let voice=findJapanese()
    if(!voice){
      voice=await new Promise<SpeechSynthesisVoice|undefined>(resolve=>{
        let done=false
        const finish=(value?:SpeechSynthesisVoice)=>{if(done)return;done=true;clearTimeout(timer);speech.removeEventListener('voiceschanged',changed);this.cancelVoiceWait=null;resolve(value)}
        const changed=()=>{const found=findJapanese();if(found)finish(found)}
        const timer=setTimeout(()=>finish(),1500)
        this.cancelVoiceWait=()=>finish();speech.addEventListener('voiceschanged',changed);changed()
      })
    }
    if(token!==this.token)return
    if(!voice){fail('이 항목의 내장 음성이 없고 일본어 시스템 음성을 찾지 못했어요. 한국어·영어 음성으로 대신 읽지 않습니다. 음성이 포함된 최신 앱을 사용해 주세요.');return}
    const say=()=>{
      if(token!==this.token)return
      try{
        const utterance=this.environment.createUtterance(target.text);this.utterance=utterance
        utterance.lang='ja-JP';utterance.voice=voice;utterance.rate=rate
        utterance.onstart=()=>{if(token===this.token)this.publish({status:'playing',message:'내장 음성이 없어 일본어 시스템 음성으로 재생 중이에요.'})}
        utterance.onerror=()=>fail('일본어 시스템 음성을 재생하지 못했어요. 내장 음성이 포함된 최신 앱을 사용해 주세요.')
        utterance.onend=()=>{
          if(token!==this.token)return
          this.utterance=null
          if(this.state.repeat)say();else this.publish({status:'idle',repeat:false})
        }
        speech.speak(utterance)
      }catch{fail('일본어 시스템 음성을 재생하지 못했어요.')}
    }
    say()
  }
}
export const audioPlayer=new AudioPlayer()
