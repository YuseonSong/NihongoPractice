import { describe, expect, it } from 'vitest'
import { hiragana } from '../data/hiragana'
import { katakanaBasic, katakanaExtended } from '../data/katakana'
import { allConversationPhrases, conversationCategories } from '../data/conversations'
import { makeOptions } from '../utils/quiz'

describe('학습 데이터',()=>{
 it('히라가나와 가타카나 기본 문자를 각각 46개 제공한다',()=>{expect(hiragana).toHaveLength(46);expect(katakanaBasic).toHaveLength(46);expect(new Set(katakanaBasic.map(i=>i.char)).size).toBe(46)})
 it('가타카나 탁음·반탁음·요음을 제공한다',()=>{expect(katakanaExtended.filter(i=>i.kind==='dakuten')).toHaveLength(20);expect(katakanaExtended.filter(i=>i.kind==='handakuten')).toHaveLength(5);expect(katakanaExtended.filter(i=>i.kind==='yoon')).toHaveLength(33)})
 it('10개 회화 카테고리에 각각 20문장을 제공한다',()=>{expect(conversationCategories).toHaveLength(10);conversationCategories.forEach(category=>expect(category.phrases).toHaveLength(20));expect(allConversationPhrases).toHaveLength(200)})
 it('퀴즈 선택지에는 정답을 포함한 네 항목이 들어간다',()=>{const options=makeOptions(hiragana,hiragana[0]);expect(options).toHaveLength(4);expect(options).toContain(hiragana[0])})
})