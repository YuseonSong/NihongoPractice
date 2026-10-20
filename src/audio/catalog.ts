import catalogJson from './catalog.json'
import manifestJson from './manifest.json'
import type { AudioCatalog } from './catalog-builder'

export interface AudioAsset { file:string; sha256:string; scriptHash:string; duration:number; sampleRate:number; channels:number; rms:number; peak:number; bytes:number; actualReading:string }
export interface AudioManifest { schemaVersion:number; engine:Record<string,unknown>|null; assets:Record<string,AudioAsset> }
export const audioCatalog=catalogJson as AudioCatalog
export const audioManifest=manifestJson as AudioManifest
export interface AudioTarget { id:string; text:string; reading:string; url?:string }
export function getAudioTarget(contentId:string,fallbackText:string):AudioTarget {
  const id=audioCatalog.content[contentId], script=audioCatalog.scripts[id], asset=audioManifest.assets[id]
  return {id:id??contentId,text:script?.kind==='kana'?script.synthesisText.replace(/'/g,''):script?.text??fallbackText,reading:script?.reading??fallbackText,
    url:asset?`${import.meta.env.BASE_URL}audio/${asset.file}`:undefined}
}
export const kanaAudioId=(script:'hiragana'|'katakana',char:string)=>`kana:${script}:${char}`
export const conversationAudioId=(id:string)=>`conversation:${id}`
export const vocabularyAudioId=(word:string)=>`vocabulary:${word}`
