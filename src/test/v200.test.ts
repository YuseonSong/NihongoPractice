import { describe, expect, it } from 'vitest'
import { conversationCategories, allConversationPhrases } from '../data/conversations'
import { particles, basicGrammar, particleComparisons } from '../data/grammar'
import { builderQuestions } from '../data/sentence-builder'
import { migrateProgress } from '../hooks/useProgress'

describe('2.0 학습 콘텐츠',()=>{
  it('10개 회화 카테고리에 총 210개의 완전한 문장을 제공한다',()=>{
    expect(conversationCategories).toHaveLength(10)
    expect(allConversationPhrases).toHaveLength(210)
    expect(new Set(allConversationPhrases.map(item=>item.id)).size).toBe(210)
    for(const category of conversationCategories)expect(category.phrases).toHaveLength(category.id==='work'?30:20)
    for(const item of allConversationPhrases)for(const key of ['japanese','romaji','koreanSound','meaning','situation','politeness','note','related'] as const)expect(item[key].trim().length).toBeGreaterThan(0)
  })
  it('필수 조사 12개와 기본 문법 14개, 조사 비교 3개를 제공한다',()=>{
    expect(particles.map(item=>item.title)).toEqual(expect.arrayContaining(['は','が','を','に','へ','で','と','も','の','から','まで','や']))
    expect(particles).toHaveLength(12)
    expect(basicGrammar).toHaveLength(14)
    expect(particleComparisons).toHaveLength(3)
    for(const item of particles)expect(item.examples).toHaveLength(5)
  })
  it('문장 만들기 문제와 난이도·대체 정답·조사 설명을 제공한다',()=>{
    expect(builderQuestions.length).toBeGreaterThanOrEqual(10)
    expect(new Set(builderQuestions.map(item=>item.difficulty))).toEqual(new Set(['초급','중급','도전']))
    for(const item of builderQuestions){expect(item.answer.length).toBeGreaterThan(1);expect(item.explanation.length).toBeGreaterThan(0)}
  })
  it('이전 저장 키의 데이터는 유지하고 신규 필드만 기본값으로 보완한다',()=>{
    const old={learned:['あ'],favorites:['greetings-1'],quizCorrect:1,quizTotal:2}
    const migrated=migrateProgress(old)
    expect(migrated.learned).toEqual(['あ'])
    expect(migrated.favorites).toEqual(['greetings-1'])
    expect(migrated.quizCorrect).toBe(1)
    expect(migrated.quizTotal).toBe(2)
    expect(migrated.grammarLearned).toEqual([])
    expect(migrated.sentenceMistakes).toEqual([])
  })
})