import { chromium, expect } from '@playwright/test'
import { readFile, mkdir, writeFile } from 'node:fs/promises'

// npm run test:browser (running Vite at 5173)
// node scripts/test-handwriting-browser.mjs --desktop (WebView2 CDP at 9222)
const desktop=process.argv.includes('--desktop')
const data=JSON.parse(await readFile(new URL('../src/data/writing-strokes.json',import.meta.url),'utf8'))
const browser=desktop?await chromium.connectOverCDP('http://127.0.0.1:9222'):await chromium.launch({headless:true})
const context=desktop?browser.contexts()[0]:await browser.newContext({viewport:{width:1200,height:900},hasTouch:true,deviceScaleFactor:2})
const page=desktop?context.pages().find(p=>!p.url().startsWith('devtools:')):await context.newPage()
const errors=[];page.on('pageerror',e=>errors.push(e.message))
const key='hiragana-step-progress-v1'
const report={environment:desktop?'Tauri Release WebView2':'Chromium web',checks:[],scores:{}}
let original=null
const button=(name)=>page.locator('button:visible').filter({hasText:new RegExp(`^${name}$`)}).first()
async function navigate(label){
  const primary=page.getByRole('navigation',{name:'주 메뉴',exact:true}).getByRole('button',{name:label,exact:true})
  if(await primary.isVisible())return primary.click()
  const short={'홈':'홈','히라가나':'문자','일상 회화':'회화','복습':'복습'}[label]
  if(short)return page.getByRole('navigation',{name:'모바일 주 메뉴'}).getByRole('button',{name:short,exact:true}).click()
  await page.getByRole('button',{name:'더보기 메뉴 열기',exact:true}).click()
  await page.getByRole('dialog',{name:'학습 메뉴'}).getByRole('button',{name:label,exact:true}).click()
}
async function reset(){const clear=button('전체 지우기');if(await clear.isEnabled())await clear.click()}
async function draw(char,type='mouse'){
  const canvas=page.getByRole('img',{name:'손글씨 입력 영역'})
  await canvas.scrollIntoViewIfNeeded()
  await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}))
  const box=await canvas.boundingBox()
  const cdp=type==='mouse'?null:await context.newCDPSession(page)
  for(const stroke of data[char]){
    const points=stroke.filter((_,i)=>i%2===0||i===stroke.length-1).map(([x,y])=>({x:box.x+x/109*box.width,y:box.y+y/109*box.height}))
    if(type==='mouse'){
      await page.mouse.move(points[0].x,points[0].y);await page.mouse.down()
      for(const p of points.slice(1))await page.mouse.move(p.x,p.y)
      await page.mouse.up()
    }else if(type==='touch'){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]})
      for(const p of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]})
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    }else{
      await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...points[0],button:'left',buttons:1,clickCount:1,pointerType:'pen',force:.5})
      for(const p of points.slice(1))await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...p,button:'left',buttons:1,pointerType:'pen',force:.5})
      await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...points.at(-1),button:'left',buttons:0,clickCount:1,pointerType:'pen'})
    }
    if(desktop)await page.waitForTimeout(40) // Let native capture notifications finish between physical strokes.
  }
  await cdp?.detach()
}
async function score(){await button('채점하기').click();await expect(button('채점 완료')).toBeDisabled();return Number((await page.locator('p.text-5xl').innerText()).replace('%',''))}
try{
  if(!desktop)await page.goto('http://127.0.0.1:5173')
  await page.waitForSelector('header')
  original=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([name])=>name==='hiragana-step-progress-v1'||name.startsWith('nihongo-mate-view-v1:'))))
  await page.evaluate(()=>Object.keys(localStorage).filter(name=>name==='hiragana-step-progress-v1'||name.startsWith('nihongo-mate-view-v1:')).forEach(name=>localStorage.removeItem(name)))
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({learned:['か'],katakanaLearned:['カ'],quizCorrect:3,quizTotal:4,favorites:['sample'],conversationLearned:['sample']})),key)
  await page.reload();await navigate('직접 그려보기')
  await expect(page.getByRole('heading',{name:'직접 그려보기',exact:true})).toBeVisible()
  await expect(page.getByLabel('연습 문자')).toHaveValue('あ')
  await expect(page.getByLabel('연습 문자').locator('option')).toHaveCount(5)
  await expect(page.getByLabel('획순 가이드 표시')).toBeChecked()
  await expect(button('다시 쓰기')).toHaveCount(0)
  await button('채점하기').click();await expect(page.getByRole('alert')).toContainText('먼저')
  report.checks.push('empty input guidance')
  await page.getByLabel('획순 가이드 표시').check();await page.getByLabel('정답 글자 숨기기').check()
  await expect(page.getByLabel('정답 문자')).toHaveText('?')
  await page.getByLabel('정답 글자 숨기기').uncheck()
  report.checks.push('hide answer and stroke guide controls')
  for(const type of ['mouse','touch','pen']){
    await reset();await draw('あ',type)
    if(type==='touch'&&!desktop)await page.setViewportSize({width:390,height:844})
    const value=await score();report.scores[type]=value
    console.log(`${report.environment}: ${type} = ${value}`)
    await mkdir('artifacts',{recursive:true})
    await page.screenshot({path:`artifacts/handwriting-${desktop?'desktop':'web'}-${type}.png`,fullPage:true})
    expect(value).toBeGreaterThanOrEqual(95)
    await mkdir('artifacts',{recursive:true})
    if(type==='mouse')await page.screenshot({path:`artifacts/handwriting-${desktop?'desktop':'web'}-result.png`,fullPage:true})
    await expect(button('채점 완료')).toBeDisabled()
    if(type==='mouse'){
      await navigate('홈');await navigate('직접 그려보기')
      await expect(button('채점 완료')).toBeDisabled()
      await expect(page.locator('p.text-5xl')).toHaveText(`${value}%`)
      expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).handwriting['あ'].attempts).toBe(1)
    }
    if(!desktop)await page.setViewportSize({width:1200,height:900})
  }
  report.checks.push(`real browser mouse, touch and pen Pointer Events; ${desktop?'':'resize keeps strokes; '}one record per grading`)
  await reset();await draw('い');await button('마지막 획 되돌리기').click()
  await expect(page.locator('#writing-help')).toContainText('1획')
  await button('전체 지우기').click();await expect(page.locator('#writing-help')).toContainText('0획')
  report.checks.push('undo and clear')
  // Offline after load: all data and computation are bundled, no API requests.
  await context.setOffline(true);await draw('あ');expect(await score()).toBeGreaterThanOrEqual(95);await context.setOffline(false)
  report.checks.push('offline drawing and scoring')
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
  expect(saved.learned).toEqual(['か']);expect(saved.katakanaLearned).toEqual(['カ']);expect(saved.quizCorrect).toBe(3);expect(saved.favorites).toEqual(['sample']);expect(saved.handwriting['あ'].attempts).toBe(4)
  report.checks.push('legacy records preserved; four attempts saved')
  await page.reload();await navigate('직접 그려보기');await page.getByText('내 손글씨 연습 통계 보기',{exact:true}).click();await expect(page.getByText('총 4회',{exact:false})).toBeVisible()
  await button('자유 연습 · 전체 문자').click();await page.getByLabel('학습 모드').selectOption('katakana');await expect(button('채점하기')).toBeDisabled();await expect(page.getByLabel('획순 가이드 표시')).toBeDisabled()
  report.checks.push('reload persistence and unsupported katakana grading disabled')
  await navigate('홈');await page.getByText('상세 학습 기록 및 설정',{exact:true}).click();await expect(page.getByRole('heading',{name:'손글씨 연습 기록'})).toBeVisible()
  await navigate('히라가나');await page.getByRole('button',{name:'선택 あ',exact:true}).click();await button('직접 써보기 · あ').click();await expect(page.getByLabel('연습 문자')).toHaveValue('あ')
  report.checks.push('home statistics and kana study entry')
  if(!desktop){
    await page.setViewportSize({width:390,height:844})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
    report.checks.push('390px responsive layout without horizontal overflow')
  }
  await mkdir('artifacts',{recursive:true});await page.screenshot({path:`artifacts/handwriting-${desktop?'desktop':'web'}.png`,fullPage:true})
  expect(errors).toEqual([]);report.checks.push('no JavaScript errors')
  await writeFile(`artifacts/handwriting-${desktop?'desktop':'web'}-results.json`,JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
}finally{
  await context.setOffline(false).catch(()=>{})
  if(desktop&&original){await page.evaluate(original=>{Object.keys(localStorage).filter(name=>name==='hiragana-step-progress-v1'||name.startsWith('nihongo-mate-view-v1:')).forEach(name=>localStorage.removeItem(name));for(const[name,value]of Object.entries(original))localStorage.setItem(name,value)},original);await page.reload()}
  await browser.close()
}
