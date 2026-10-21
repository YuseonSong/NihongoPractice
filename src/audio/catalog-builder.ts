import type { ConversationPhrase, KanaCharacter } from '../types'

export interface AudioScript {
  id:string
  kind:'kana'|'vocabulary'|'conversations'
  text:string
  reading:string
  synthesisText:string
  readingNote:string
}
export interface AudioCatalog { schemaVersion:1; scripts:Record<string,AudioScript>; content:Record<string,string> }
export function buildAudioCatalog(hiragana:KanaCharacter[],katakana:KanaCharacter[],phrases:ConversationPhrase[],readings:Record<string,string>):AudioCatalog {
  const result:AudioCatalog={schemaVersion:1,scripts:{},content:{}}
  const put=(contentId:string,script:AudioScript)=>{
    const previous=result.scripts[script.id]
    if(previous&&previous.synthesisText!==script.synthesisText)throw new Error(`음성 ID 충돌: ${script.id}`)
    result.scripts[script.id]=previous??script;result.content[contentId]=script.id
  }
  const kataToHira=(text:string)=>Array.from(text).map(c=>{const cp=c.codePointAt(0)!;return cp>=0x30a1&&cp<=0x30f6?String.fromCodePoint(cp-0x60):c}).join('')
  for(const [scope,characters] of [['hiragana',hiragana],['katakana',katakana]] as const){
    for(const kana of characters){
      const sound=kana.romaji==='wo'?'o':kana.romaji
      const id=`kana_${sound}`
      const reading=kataToHira(kana.char).replace(/を/g,'お').replace(/ぢ/g,'じ').replace(/づ/g,'ず')
      const phonetic=Array.from(reading).map(c=>String.fromCodePoint(c.codePointAt(0)!+0x60)).join('')+"'"
      put(`kana:${scope}:${kana.char}`,{id,kind:'kana',text:reading,reading,synthesisText:phonetic,readingNote:'고립된 모라를 명시적인 엔진 가나 입력으로 합성하여 は/へ를 조사로 읽지 않도록 합니다. を/ヲ는 お/オ, ぢ/ヂ는 じ/ジ, づ/ヅ는 ず/ズ와 음성 공유. ん은 문맥에 따라 달라집니다.'})
      if(kana.example){
        const word=kana.example.word
        const wordId=`vocab_${Array.from(word).map(c=>c.codePointAt(0)!.toString(16)).join('_')}`
        if(word==='ヲ')result.content[`vocabulary:${word}`]='kana_o'
        else put(`vocabulary:${word}`,{id:wordId,kind:'vocabulary',text:word,reading:word,synthesisText:word,readingNote:`원본 카타카나 표기 확인. 학습 데이터 로마자: ${kana.example.reading}`})
      }
    }
  }
  for(const phrase of phrases){
    const reading=readings[phrase.id]??phrase.japanese
    const overrides:Record<string,string>={'plans-1':'今週末、あいてる？','hobbies-1':'趣味はなんですか。','dining-3':'おすすめはなんですか。'}
    put(`conversation:${phrase.id}`,{id:`conversation_${phrase.id.replace(/-/g,'_')}`,kind:'conversations',text:phrase.japanese,reading,
      synthesisText:overrides[phrase.id]??phrase.japanese,
      readingNote:phrase.id==='plans-1'?'空いてる를 すいてる로 오독하지 않도록 あいてる 명시.':overrides[phrase.id]?'何ですか를 ナニデスカ가 아닌 ナンデスカ로 명시.':'원문·로마자와 대조한 읽기. 합성 전 쿼리의 실제 읽기를 별도 검토.'})
  }
  return result
}
