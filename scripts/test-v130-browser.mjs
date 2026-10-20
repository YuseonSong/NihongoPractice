import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { hiragana } from '../src/data/hiragana.ts'
import { katakanaBasic } from '../src/data/katakana.ts'

const desktop=process.argv.includes('--desktop')
const browser=desktop?await chromium.connectOverCDP('http://127.0.0.1:9222'):await chromium.launch({headless:true})
const context=desktop?browser.contexts()[0]:await browser.newContext({viewport:{width:1200,height:900},hasTouch:true})
const page=desktop?context.pages().find(item=>!item.url().startsWith('devtools:')):await context.newPage()
const key='hiragana-step-progress-v1',prefix='nihongo-mate-view-v1:'
const report={version:'1.3.1',environment:desktop?'Tauri Release WebView2':'Chromium web',checks:[],mobileTargets:[]},errors=[]
page.on('pageerror',error=>errors.push(error.message))
let original=null
const button=name=>page.getByRole('button',{name,exact:true}).filter({visible:true}).first()
const state=name=>page.evaluate(name=>JSON.parse(localStorage.getItem(`nihongo-mate-view-v1:${name}`)),name)
const progress=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
async function navigate(label){
  const primary=page.getByRole('navigation',{name:'주 메뉴',exact:true}).getByRole('button',{name:label,exact:true})
  if(await primary.isVisible())return primary.click()
  const short={'홈':'홈','히라가나':'문자','일상 회화':'회화','복습':'복습'}[label]
  if(short)return page.getByRole('navigation',{name:'모바일 주 메뉴'}).getByRole('button',{name:short,exact:true}).click()
  await button('더보기 메뉴 열기').click()
  await page.getByRole('dialog',{name:'학습 메뉴'}).getByRole('button',{name:label,exact:true}).click()
}
async function seed(value=null,views={}){
  await page.evaluate(({key,prefix,value,views})=>{Object.keys(localStorage).filter(name=>name===key||name.startsWith(prefix)).forEach(name=>localStorage.removeItem(name));if(value)localStorage.setItem(key,JSON.stringify(value));for(const[name,state]of Object.entries(views))localStorage.setItem(prefix+name,JSON.stringify(state))},{key,prefix,value,views})
  await page.reload();await expect(page.locator('main')).toBeVisible()
}
function labelFor(scope,id){return (scope==='hiragana'?hiragana:katakanaBasic).find(item=>item.char===id).romaji}
async function answerCurrent(wrong=false){
  const saved=await state('quiz'),session=saved.session,question=session.questions[session.index]
  const region=page.getByRole('region',{name:'퀴즈 문제'})
  if(question.options.length===1){
    await region.getByRole('button',{name:'정답 확인',exact:true}).click()
    await region.getByRole('button',{name:wrong?'다시 볼게요':'기억했어요',exact:true}).click()
  }else{
    const id=wrong?question.options.find(id=>id!==question.id):question.id
    await region.getByRole('button',{name:labelFor(session.scope,id),exact:true}).click()
  }
  await expect(region.getByRole('status')).toBeVisible()
  await region.getByRole('button',{name:session.index===session.questions.length-1?'결과 보기':'다음 문제',exact:true}).click()
  return question.id
}
try{
  if(!desktop)await page.goto('http://127.0.0.1:5173')
  await page.waitForSelector('header')
  original=await page.evaluate(({key,prefix})=>Object.fromEntries(Object.entries(localStorage).filter(([name])=>name===key||name.startsWith(prefix))),{key,prefix})
  await seed()
  await mkdir('artifacts',{recursive:true})
  await expect(page.getByRole('heading',{name:'히라가나 먼저 시작해 볼까요?'})).toBeVisible()
  await expect(page.getByText('첫 5글자 배우기',{exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'처음 5글자 시작',exact:true})).toHaveCount(0)
  await expect(page.getByText('기록 없음',{exact:true})).toBeVisible()
  if(!desktop){
    await page.setViewportSize({width:390,height:844})
    await page.screenshot({path:'artifacts/v131-noviceHome390.png',fullPage:true})
    await page.setViewportSize({width:1200,height:900})
  }
  await button('히라가나 시작하기').click()
  await expect(page.getByRole('heading',{name:'히라가나 학습',exact:true})).toBeVisible()
  await expect(button('문자표')).toHaveAttribute('aria-pressed','true')
  const detail=page.getByRole('region',{name:'선택한 문자'})
  for(const[index,char]of ['あ','い','う','え','お','か'].entries()){
    await expect(detail.getByText(char,{exact:true})).toBeVisible()
    await expect(button(`선택 ${char}`)).toHaveAttribute('aria-pressed','true')
    expect((await progress()).learned).toEqual([])
    if(index<5)await detail.getByRole('button',{name:'다음 문자',exact:true}).click()
  }
  await button('선택 を').click()
  await expect(detail.getByText('を',{exact:true})).toBeVisible()
  await button('선택 む').click()
  await expect(detail.getByText('む',{exact:true})).toBeVisible()
  expect((await progress()).learned).toEqual([])
  if(!desktop){
    await page.setViewportSize({width:390,height:844})
    await page.screenshot({path:'artifacts/v131-freeKana390.png',fullPage:true})
    await page.setViewportSize({width:1200,height:900})
  }
  for(const char of ['あ','い']){
    await navigate('히라가나');await button(`선택 ${char}`).click()
    await page.evaluate(()=>localStorage.setItem('nihongo-mate-view-v1:scroll-handwriting','9000'))
    await button(`직접 써보기 · ${char}`).click()
    await expect(page.getByRole('heading',{name:'직접 그려보기',exact:true})).toBeVisible()
    await expect(page.getByLabel('연습 문자')).toHaveValue(char)
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0)
    expect(await page.evaluate(()=>localStorage.getItem('nihongo-mate-view-v1:scroll-handwriting'))).toBe('0')
    await expect(page.getByRole('button',{name:/입문 과정으로 돌아가기/})).toHaveCount(0)
  }
  expect((await progress()).learned).toEqual([])
  report.checks.push('Home starts unrestricted hiragana study; next advances あ→い→う→え→お→か without reading checks or completion; arbitrary character selection works and never completes learning; new writing targets reset stale saved scroll; first-five course entry and return controls absent')

  const legacy={learned:['か'],katakanaLearned:['カ'],conversationLearned:['greetings-2'],favorites:['greetings-2'],quizCorrect:3,quizTotal:4,streak:2,lastStudyDate:'2026-10-19',completionDates:{'learned:か':'2026-10-19'},handwriting:{'あ':{attempts:2,best:92,latest:60,sum:152,lastPracticed:'2026-10-20',version:'kanjivg-rules-v1'}}}
  await seed(legacy,{'resume':{tab:'course',label:'첫 5글자 배우기 · 읽기 확인'},'beginner-course':{index:4,stage:'write',checks:['あ','い','う','え','お']},'course-writing':true,'scroll-course':9000})
  const before=await progress()
  for(const[name,value]of Object.entries(legacy))expect(before[name]).toEqual(value)
  await expect(page.getByRole('heading',{name:'히라가나 먼저 시작해 볼까요?'})).toBeVisible()
  await expect(page.getByText('첫 5글자 배우기',{exact:true})).toHaveCount(0)
  await expect(button('이어서 학습')).toHaveCount(0)
  await button('히라가나 시작하기').click()
  await expect(page.getByRole('heading',{name:'히라가나 학습',exact:true})).toBeVisible()
  expect(await progress()).toEqual(before)
  report.checks.push('upgrade with legacy course resume/stage/writing/scroll state ignores the removed course; Home opens normal hiragana study and preserves all legacy progress, favorites, completion dates, quiz totals, and handwriting')
  await button('선택 い').click()
  expect((await progress()).learned).toEqual(['か'])
  await expect(page.getByRole('group',{name:'い 음성 재생'})).toBeVisible()
  await expect(page.locator('main [data-audio-id]')).toHaveCount(1)
  if(!desktop)await page.screenshot({path:'artifacts/v131-desktopKana1200.png',fullPage:true})
  await button('이 문자를 공부했어요').click();expect((await progress()).learned).toEqual(['か','い'])
  await button('학습 완료 · 취소하기').click();expect((await progress()).learned).toEqual(['か'])
  const afterMark=await progress()
  for(const name of ['learned','katakanaLearned','conversationLearned','favorites','handwriting','completionDates','quizTotal','quizCorrect','quizItems'])expect(afterMark[name]).toEqual(before[name])
  await button('암기 카드').click();await button('암기 카드 뒤집기').click()
  await navigate('홈');await expect(page.getByText('히라가나 · い · 암기 카드',{exact:true})).toBeVisible();await button('이어서 학습').click()
  await expect(button('암기 카드 뒤집기')).toHaveAttribute('aria-pressed','true')
  await expect(page.getByRole('group',{name:'い 음성 재생'})).toBeVisible()
  await page.reload();await button('이어서 학습').click();await expect(button('암기 카드')).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('group',{name:'い 음성 재생'})).toBeVisible()
  await navigate('일상 회화');await page.getByRole('combobox',{name:'회화 문장 선택'}).selectOption('greetings-5')
  await expect(page.getByText('わたしはミンジュです。',{exact:true})).toBeVisible()
  await expect(page.getByText('Watashi wa Minju desu.',{exact:true})).not.toBeVisible()
  await button('한국어·로마자 도움말').click();await button('뜻 숨기기').click();await button('가나 읽기 숨기기').click()
  await navigate('홈');await button('이어서 학습').click();await page.reload();await button('이어서 학습').click()
  await expect(page.getByRole('combobox',{name:'회화 문장 선택'})).toHaveValue('greetings-5')
  await expect(page.getByText('Watashi wa Minju desu.',{exact:true})).toBeVisible()
  await expect(button('뜻 보기')).toHaveAttribute('aria-pressed','false')
  await expect(button('가나 읽기 보기')).toHaveAttribute('aria-pressed','false')
  expect(await progress()).toEqual(afterMark)
  report.checks.push('character selection never completes; explicit completion and undo; one shared kana audio; card/flip/character and conversation reading/help/meaning restore after tabs and reload; all legacy records unchanged')

  await seed({...legacy,learned:['あ','い','う','え','お']})
  const quizBefore=await progress()
  await navigate('퀴즈');await expect(page.getByRole('combobox',{name:'퀴즈 출제 범위'})).toHaveValue('learned')
  await expect(page.getByRole('region',{name:'퀴즈 문제'})).toHaveCount(0)
  await button('퀴즈 시작').click()
  const learnedSession=(await state('quiz')).session
  expect(learnedSession.questions).toHaveLength(5)
  expect(new Set(learnedSession.questions.map(item=>item.id)).size).toBe(5)
  expect(learnedSession.poolIds.sort()).toEqual(['あ','い','う','え','お'].sort())
  for(const question of learnedSession.questions)expect(question.options.every(id=>['あ','い','う','え','お'].includes(id))).toBe(true)
  const missed=await answerCurrent(true)
  await navigate('홈');await button('이어서 학습').click();await page.reload();await button('이어서 학습').click()
  expect((await state('quiz')).session.index).toBe(1)
  for(let index=1;index<5;index++)await answerCurrent()
  await expect(page.getByRole('heading',{name:'이번 학습을 마쳤어요!'})).toBeVisible()
  await expect(page.getByRole('region',{name:'퀴즈 문제'})).toHaveCount(0)
  expect((await progress()).quizTotal).toBe(quizBefore.quizTotal+5)
  expect((await progress()).quizCorrect).toBe(quizBefore.quizCorrect+4)
  await navigate('복습')
  const review=page.getByRole('region',{name:'오답 복습'})
  await expect(review.getByText(missed,{exact:true})).toBeVisible()
  await page.evaluate(()=>localStorage.setItem('nihongo-mate-view-v1:scroll-quiz','9000'))
  await review.getByRole('button',{name:'이 오답 풀기',exact:true}).click()
  await expect(page.getByRole('region',{name:'퀴즈 문제'})).toBeVisible()
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0)
  expect(await page.evaluate(()=>localStorage.getItem('nihongo-mate-view-v1:scroll-quiz'))).toBe('0')
  expect((await state('quiz')).session.poolIds).toEqual([missed])
  await answerCurrent()
  await navigate('복습');await expect(page.getByText('기록된 오답을 모두 다시 맞혔어요!',{exact:true})).toBeVisible()
  expect((await progress()).quizItems[`hiragana:${missed}`]).toMatchObject({wrong:1,correct:1,lastCorrect:true})
  for(const name of ['learned','katakanaLearned','conversationLearned','favorites','handwriting','completionDates'])expect((await progress())[name]).toEqual(quizBefore[name])
  await navigate('퀴즈');await page.getByRole('combobox',{name:'퀴즈 학습 종류'}).selectOption('katakana');await page.getByRole('combobox',{name:'퀴즈 출제 범위'}).selectOption('basic');await button('퀴즈 시작').click()
  const basic=(await state('quiz')).session
  expect(basic.poolIds.length).toBe(46)
  expect(basic.poolIds.every(id=>katakanaBasic.some(item=>item.char===id))).toBe(true)
  for(const question of basic.questions)expect(question.options.every(id=>katakanaBasic.some(item=>item.char===id))).toBe(true)
  report.checks.push('default learned-only quiz questions and distractors, five unique questions then finite result, quiz resume, recorded wrong answer → Review → targeted self-check → resolved, new targeted quiz resets stale saved scroll, basic katakana excludes extensions, legacy records preserved')

  if(!desktop){
    await page.setViewportSize({width:390,height:844})
    const mobile=page.getByRole('navigation',{name:'모바일 주 메뉴'})
    await expect(mobile.getByRole('button')).toHaveCount(5)
    const targets=[['발음 길잡이','발음 길잡이'],['히라가나','히라가나 학습'],['가타카나','가타카나 학습'],['일상 회화','일상 회화 학습'],['직접 그려보기','직접 그려보기'],['퀴즈','배운 내용을 확인해요'],['복습','복습 및 즐겨찾기']]
    for(const[label,heading]of targets){
      await button('더보기 메뉴 열기').click()
      const dialog=page.getByRole('dialog',{name:'학습 메뉴'})
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('button')).toHaveCount(8)
      await expect(dialog.getByRole('button',{name:'처음 5글자 배우기',exact:true})).toHaveCount(0)
      await dialog.getByRole('button',{name:label,exact:true}).click()
      await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible()
      await expect(dialog).toHaveCount(0)
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
      report.mobileTargets.push(label)
    }
    await button('더보기 메뉴 열기').click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
    await navigate('홈');await expect(page.getByRole('heading',{level:1})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    report.checks.push('390px five-item mobile navigation; More reaches all seven learning targets without a course entry, closes after selection and on Escape; no horizontal overflow on every page')
  }
  await mkdir('artifacts',{recursive:true})
  await page.screenshot({path:`artifacts/v131-${desktop?'desktop':'web'}.png`,fullPage:true})
  expect(errors).toEqual([]);report.checks.push('no JavaScript errors')
  await writeFile(`artifacts/v131-${desktop?'desktop':'web'}-results.json`,JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
}finally{
  if(desktop&&original){await page.evaluate(({key,prefix,original})=>{Object.keys(localStorage).filter(name=>name===key||name.startsWith(prefix)).forEach(name=>localStorage.removeItem(name));for(const[name,value]of Object.entries(original))localStorage.setItem(name,value)},{key,prefix,original});await page.reload()}
  await browser.close()
}
