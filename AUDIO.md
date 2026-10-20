# 오프라인 일본어 발음 (1.2.0)

## 구현 결과

Windows 일본어 언어팩 대신 앱에 포함된 실제 WAV를 우선 재생합니다.
외부 API, Node.js, TTS 프로그램은 배포 앱의 음성 재생에 필요하지 않습니다.

| 콘텐츠 | 매핑 항목 수 | 공유 음성 |
|---|---:|---|
| 히라가나 기본 | 46 | 기본 모라 음성을 가타카나와 공유 |
| 가타카나 기본 | 46 | 히라가나와 공유, を/ヲ는 お/オ와 공유 |
| 가타카나 탁음·반탁음·요음 | 58 | ヂ/ジ, ヅ/ズ 등 동일 발음 공유 |
| 가타카나 예시 단어 | 46 | ヲ 예시만 kana_o 사용, 45개 단어 녹음 |
| 일상 회화 | 70 | 문장 전체를 각각 합성 |
| 합계 | **266개 콘텐츠 참조** | **실제 파일 216개** |

실제 파일은 `public/audio/kana/` 101개, `vocabulary/` 45개,
`conversations/` 70개입니다. PCM16, 모노, 24kHz WAV이며
합계 **8,092,960 bytes (약 7.72MiB), 168.41초**입니다.
빈 파일이나 무음 대체 파일을 만들지 않았습니다.

문자표·암기 카드·단어 카드·회화·복습·퀴즈·손글씨 화면에 공통
`AudioControls`를 연결했습니다. 1.0배, 음높이를 유지하는 0.8배,
반복 켜기/끄기, 중지, 재생 상태, 파일 실패 안내를 제공합니다.
전체 앱은 하나의 재생기를 공유하며 다른 음성을 재생하거나 해당 카드를
떠나면 이전 음성을 정리합니다. 학습 완료 버튼 안에 음성 버튼을 넣지 않아
음성을 듣는 동작이 완료 기록을 변경하지 않습니다.

## 생성 도구·승인·라이선스

사용자가 외부 무료 로컬 음성 생성 도구 실행을 승인한 뒤
**VOICEVOX NEMO ENGINE 0.24.0 CPU, 女声1, style 10005**를 사용했습니다.
음성 제공자: 亜咲比 凛. 크레딧: **音声: VOICEVOX Nemo（女声1）**.

- 공식 엔진: https://github.com/VOICEVOX/voicevox_nemo_engine/releases/tag/0.24.0
- 원본 Windows CPU 아카이브 SHA256: `0c48d0139c12a52aef6e9d96150b09e70761b3f0bea8fd88c726bf5ce7aa249b`
- 공식 제품: https://voicevox.hiroshiba.jp/nemo/
- 생성 음성 이용약관: https://voicevox.hiroshiba.jp/nemo/term/

공식 이용약관은 크레딧을 표시한 상업·비상업 이용을 허용합니다.
친구에게 배포하는 앱에도 크레딧과 이용 안내를 유지해야 합니다.
음성은 CC0/퍼블릭 도메인 자료가 아니며, 기계학습 사용 등 공식 금지사항을
준수해야 합니다. 앱의 모든 화면 아래에 출처 안내를 표시하고
`public/audio/LICENSE.md`를 번들에 포함했습니다. 2026-10-20에 약관을 확인했습니다.

개발용 엔진·모델·압축 해제 도구는 `.tools/`에만 보관하며 Git 및 앱 번들에서
제외했습니다. 외부 유료 API·API 키·유료 서비스는 사용하지 않았습니다.
음성 생성 후 로컬 엔진을 종료한 상태에서 앱 재생을 검사합니다.

## 읽기 검토와 오독 교정

원문과 별도로 `src/data/audio-readings.json`에 회화 70문장의 읽기를 보관합니다.
`src/audio/catalog.json`에는 콘텐츠 ID, 음성 ID, 원문, 기대 읽기,
실제 합성 입력과 읽기 주의사항을 기록합니다.

생성 전에 `/audio_query`와 `/accent_phrases`의 실제 모라·악센트 쿼리를
`artifacts/audio-query-review-report.json`에 내보내 원문·기대 읽기와 대조했습니다.
발견하고 교정한 사례:

- 고립된 `は・へ`가 조사 `ワ・エ`로 분석되는 문제: `accent_phrases`의
  `is_kana=true`로 **ハ・ヘ를 명시**합니다. 모라 결과가 기대값과 다르면 생성하지 않습니다.
- `趣味は何ですか。`, `おすすめは何ですか。`의 `ナニデスカ`: 합성 입력만
  **なんですか**로 지정했습니다. 화면의 일본어 원문과 기존 학습 데이터는 유지합니다.
- `今週末、空いてる？`: 합성 입력에 **あいてる**를 명시해 문맥에 따른 오독을 방지합니다.
- 조사 は・へ・を가 포함된 문장과 `二人`, `何時`, `新宿` 등의 읽기를 모라로 확인했습니다.
- 단독 모라의 무성 모음은 유성으로 지정하고 모음 길이를 확보해 초보자가 듣기 쉽게 했습니다.

`src/audio/reading-review.json`에 검토한 입력 해시와 실제 모라를 고정했습니다.
원문·읽기·합성 설정이 달라지거나 실제 모라가 검토 결과와 달라지면 재검토해야 합니다.
이는 **텍스트·음소 검토이며 원어민 청취 검수 인증이 아닙니다.**

## 재생 우선순위·실패 처리

1. 매니페스트에 내장 파일이 있으면 항상 HTML Audio로 그 파일을 재생합니다.
2. 내장 파일 항목이 없는 경우에만 SpeechSynthesis를 보조로 사용합니다.
3. 음성 목록이 늦게 로드되면 `voiceschanged`를 기다리며, `ja`/`ja-JP`만 선택합니다.
4. 일본어 음성이 없거나 API 자체가 없으면 안내합니다. 한국어·영어로 대신 읽지 않습니다.
5. 내장 파일이 있다고 기록되어 있지만 실제 파일이 손상·누락되면 파일 오류를 안내합니다.
   임의의 다른 언어 음성으로 넘기지 않습니다.

빠른 재생 전환·취소 중 도착하는 이전 파일의 오류가 새 재생 상태를 덮어쓰지 않도록
요청 토큰을 사용합니다. 반복은 내장 파일의 `loop` 또는 일본어 시스템 음성의 종료
이벤트를 사용하며, 화면 이탈 시 반복도 종료합니다.

## 파일 검사·새 콘텐츠 추가

`npm.cmd run build`는 소스 검사 → TypeScript → Vite → 배포 폴더 검사를 실행합니다.
실제 학습 데이터의 모든 참조, 카탈로그 최신성, 읽기 검토, 파일 경로,
SHA256, WAV 헤더, 채널·샘플링, 길이, 음성 신호 RMS 및 심한 클리핑을 검사합니다.
파일이 누락되거나 읽기 검토가 오래됐으면 빌드를 실패시킵니다.
`src/audio/manifest.json`에 실제 파일 해시·길이·용량·읽기를 보관합니다.

새 표현을 추가할 때 기존 콘텐츠 ID를 재사용하거나 번호를 바꾸지 마세요.
현재 회화 ID는 카테고리와 순번이므로 기존 문장을 재배열할 때 특히 주의가 필요합니다.

```powershell
# 학습 데이터 및 회화 읽기 목록을 먼저 수정
npm.cmd run audio:catalog
# 승인받은 개발용 Nemo 엔진을 127.0.0.1:50021에서 실행한 뒤
npm.cmd run audio:preview
# artifacts/audio-query-review-report.json에서 기대 읽기와 실제 모라·합성 입력을 검토
npm.cmd run audio:review -- --confirm-text-review
npm.cmd run audio:generate
npm.cmd run audio:check
npm.cmd test
npm.cmd run build
```

새로운 외부 TTS 도구·API·유료 서비스가 필요하면 먼저 사용자의 승인을 받아야 합니다.
`audio:review`는 개발자가 실제로 검토한 텍스트·음소 결과를 기록하는 명령이며
자동으로 발음 품질이나 원어민 검수를 인증하지 않습니다.
파일은 입력·생성 설정 해시가 일치하고 WAV/해시 검사를 통과하면 재사용합니다.

## 검증 결과와 범위

- 초기 5자: 실제 파일 생성 후 시스템 SpeechSynthesis가 없는 브라우저에서
  디코딩, 비무음, 다섯 문자 끝까지 재생, 반복과 중지를 확인했습니다.
- **Vitest: 6개 파일, 42개 테스트 통과.** 기존 학습·손글씨 테스트와 더불어
  매핑·동음 재사용·오독 교정·누락 안내·속도·반복·중지·겹침 방지,
  비동기 일본어 음성 목록·다른 언어 차단·늦은 취소 오류를 검사합니다.
- **소스와 dist:** 216개 모두 존재하며, 누락·손상·검토 불일치 0건입니다.
- **웹 Chromium:** SpeechSynthesis를 비활성화하고 앱 원본 외의 네트워크 요청을
  차단한 상태에서 모든 216개를 직접 가져와 해시·디코딩·길이·음성 신호를 확인했습니다.
  기본 문자 92개와 회화 70개 화면의 매핑을 확인하고, 각 회화 카테고리의 대표 문장을
  끝까지 실제 미디어 재생했습니다. 1.0/0.8배, 반복·중지·겹침 방지,
  실제 404 오류 안내, 단어·복습·퀴즈·손글씨 화면 재생 및 기존 기록 보존을 확인했습니다.
- 모바일: 390px 화면에서 가로 넘침 없이 표시됩니다.
- **Windows Release WebView2:** 동일한 216개 파일 해시·디코딩·비무음 검사,
  실제 재생·속도·반복·중지·누락 안내·화면 통합·기존 기록 보존 검사를 통과했습니다.
  시스템 음성을 비활성화하고 외부 인터넷/TTS 요청을 차단한 테스트 구성입니다.
  검사 후 검사 포트가 없는 일반 배포 설정으로 설치 프로그램을 다시 빌드했습니다.

```powershell
# 웹 개발 서버가 5173에서 실행 중일 때
npm.cmd run test:audio
# Windows Release 테스트 → 일반 설치 프로그램 재생성
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-handwriting-desktop.ps1 -TestScript test-audio-browser.mjs
```

보고서: `artifacts/audio-source-check.json`, `audio-dist-check.json`,
`audio-pilot-browser-results.json`, `audio-web-results.json`, `audio-desktop-results.json`.
화면: `artifacts/audio-web.png`, `artifacts/audio-desktop.png`.

## 품질·오프라인 한계

모든 파일은 실제 일본어 합성 결과이며 파일·모라·미디어 재생을 확인했습니다.
다만 실제 스피커에서의 청감, 원어민에 의한 전 문장 억양 검수,
다양한 친구 PC의 오디오 장치 실측은 하지 않았습니다.
Nemo의 합성 억양은 실제 원어민 회화와 다를 수 있으며,
`ん`의 실제 소리는 뒤 음절에 따라 달라집니다. 단독 모라는 하나의 학습용 예시입니다.

오프라인 검사는 앱 로컬 원본만 허용하고 외부 인터넷/TTS 요청을 차단하는 방식입니다.
웹 사이트를 인터넷 없이 처음 방문하도록 하는 PWA 캐시는 추가하지 않았습니다.
Windows 앱에는 Vite의 `dist/audio/`가 Tauri 리소스로 내장됩니다.
WebView2가 설치된 Windows에서는 일본어 언어팩·TTS·Node.js 없이 음성을 재생합니다.
WebView2가 없는 PC에서는 기존 설치 프로그램 설정에 따라 WebView2 런타임 다운로드가
필요할 수 있습니다. 이는 일본어 언어팩과 별개인 앱 실행 환경입니다.

## 배포 파일

- 바로 실행: `release/NihongoMate-1.2.0.exe`
- 설치: `release/NihongoMate-1.2.0-windows-x64-setup.exe`
- 원본 설치 산출물: `src-tauri/target/release/bundle/nsis/Nihongo Mate_1.2.0_x64-setup.exe`

## 수정 파일

- 공통 재생: `src/audio/player.ts`, `src/audio/catalog.ts`, `src/components/AudioControls.tsx`
- 읽기·매핑·생성 기록: `src/audio/catalog-builder.ts`, `catalog.json`, `manifest.json`,
  `reading-review.json`, `src/data/audio-readings.json`
- UI 통합: `src/pages/KanaStudy.tsx`, `Conversation.tsx`, `Review.tsx`, `Quiz.tsx`,
  `Handwriting.tsx`, `src/App.tsx`, `src/components/AudioCredits.tsx`, `src/styles.css`
- 실제 음성·출처: `public/audio/**`
- 관리: `scripts/audio-catalog.mjs`, `audio-utils.mjs`, `generate-audio.mjs`,
  `review-audio.mjs`, `check-audio.mjs`
- 검증: `src/test/audio.test.ts`, `scripts/test-audio-pilot.mjs`,
  `test-audio-browser.mjs`, `test-handwriting-desktop.ps1`
- 배포: `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `Cargo.lock`,
  `tauri.conf.json`, `.gitignore`, `README.md`

기존 학습 데이터와 localStorage 저장 구조는 변경하지 않았습니다.
