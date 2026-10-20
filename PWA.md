# Nihongo Mate — iPad 홈 화면 웹앱

React + TypeScript + Vite 앱을 Safari의 홈 화면 웹앱으로 설치할 수 있도록 확장했습니다.
iOS 네이티브 IPA나 App Store/TestFlight 배포를 완료한 것은 아닙니다.
Tauri iOS 빌드에는 Mac과 Xcode가 필요합니다.

## 설치

설치 주소: **https://nihongo-mate-yuseon-ipad.breezypearl514.chatgpt.site**

본인 전용 비공개 주소입니다. 접근 시 로그인이 표시되면 이 사이트를 만든 본인 계정으로 로그인하세요.

1. 아이패드 Safari에서 위 주소를 엽니다.
2. 공유 버튼 → ‘홈 화면에 추가’를 선택합니다. ‘웹 앱으로 열기’가 보이면 켭니다.
3. 홈 화면의 Nihongo Mate 아이콘을 엽니다.
4. 화면 아래 ‘오프라인 준비 완료’를 확인할 때까지 인터넷 연결을 유지합니다.
5. 완료 후 인터넷이 없는 상황에서도 저장한 학습 화면과 음성을 사용하도록 구성되어 있습니다.

처음 접속에는 인터넷이 필요합니다. 파일 저장이 실패하면 완료로 표시하지 않으며 재시도할 수 있습니다.
아이패드에서 앱·사이트 데이터를 지우거나 저장 공간이 정리되면 자료와 기록이 삭제될 수 있습니다.
그 경우 인터넷에 연결해 자료를 다시 저장해야 합니다.
PC와 아이패드의 학습 기록은 자동 동기화하지 않습니다.

## 포함 기능

히라가나·가타카나 자유 학습, 발음 길잡이, 회화, 퀴즈·오답 복습, 직접 그려보기와 학습 기록을 유지합니다.
기존 음성 216개(약 8.1MB)를 포함한 232개 자료, 총 8,761,341바이트를 오프라인 저장합니다.
저장 파일은 크기와 SHA256을 검사합니다. 새 버전은 파일 내용의 해시로 구분하며,
앱 자체의 이전 캐시만 정리하고 `localStorage` 학습 기록은 지우지 않습니다.
오디오의 부분 요청(206/416)을 지원해 오프라인 미디어 재생에 대응합니다.

아이패드 화면의 안전 여백·홈 인디케이터를 반영하고, 회전·화면 숨김·크기 변경 시 미완성 획만 취소합니다.
완성한 획과 기존 기록은 보존합니다. 손글씨 채점 범위는 기존 あ・い・う・え・お 5자입니다.
다른 문자는 자유 필기를 지원합니다. 점수는 학습용 규칙 기반 유사도이며 실제 인식 정확도가 아닙니다.

기존 Windows 배포 파일은 변경하지 않았습니다. Windows Tauri 환경에서는 SW를 등록하거나 웹 설치 안내를 표시하지 않습니다.
웹 배포를 위한 별도 폴더 `../NihongoMate-iPad/`를 사용하므로 원래 GitHub 저장소에 임의로 커밋·푸시하지 않았습니다.

## 검증

- 단위 테스트: 12개 파일, 104개 통과. 기존 기능과 Windows 환경 제외, 회전·숨김·리사이즈 시 필기 보존을 포함합니다.
- TypeScript·Vite·PWA 빌드: 통과. 실제 음성 216개와 모든 정적 자료를 검증했습니다.
- 복구 검사 5개: 음성 404, 같은 크기 파일 변조, 캐시 소실 감지·재시도, 호스팅 서버의 HTML 추가·리다이렉트 대응, 프로덕션 Tauri의 SW 등록 0건 통과.
- Chromium 프로덕션 PWA: 루트와 `/NihongoPractice/` 각각 실제 216개 음성의 캐시·오프라인 해시, 실제 정상·느린 재생·반복·중지, Range 206/416, 오프라인 퀴즈·오답 복습·터치 필기 100점, 기존 기록 보존 통과. 새 버전 SW의 전체 캐시 교체와 관련 없는 캐시 보존도 통과했습니다. 768×1024·1024×768에서 가로 넘침과 JavaScript 오류가 없었습니다.
- 비공개 사이트 배포는 완료했습니다. 배포된 SW·manifest·대표 음성 파일이 검증한 원본과 동일함을 확인했습니다. 서버가 HTML에 코드를 추가하고 `/index.html`을 `/`로 이동시키므로, SW에는 검증된 원본 HTML을 내장해 저장하도록 대응했습니다.
- 배포 주소의 브라우저 오프라인 최종 검사는 미완료입니다. 자동화용 서비스 접근 헤더는 실제 사용자 로그인 세션을 만들지 않아, 브라우저가 SW 스크립트를 가져올 때 401을 받았습니다. 본인 계정으로 로그인한 실제 Safari에서 ‘오프라인 준비 완료’ 확인이 남아 있습니다. 이 한계를 통과 결과로 보고하지 않습니다.

**실제 iPad Safari의 홈 화면 설치, Apple Pencil 하드웨어, Safari WebKit에서는 아직 검증하지 않았습니다.**
자동화는 Windows의 Chromium에서 실행했습니다. 다음은 실제 기기에서 확인할 항목입니다.
홈 화면 설치 → 자료 저장 완료 → 앱 종료 → 비행기 모드로 다시 열기 → 음성·학습 기록·손가락/펜 필기 확인.

보고서: `artifacts/pwa-results.json`, `artifacts/pwa-recovery-results.json`, `release/validation-ipad/pwa-hosting-summary.json`.

## 관련 파일

`public/manifest.webmanifest`, `public/icons/`, `src/pwa/client.ts`, `src/pwa/service-worker.js`,
`scripts/build-pwa.mjs`, `src/components/OfflineSupport.tsx`, `src/main.tsx`, `src/App.tsx`,
`src/styles.css`, `src/components/Navigation.tsx`, `src/components/WritingCanvas.tsx`,
`src/components/AudioCredits.tsx`, `index.html`, `vite.config.ts`, `package.json`,
`src/test/pwa.test.ts`, `src/test/WritingCanvas.test.tsx`, `scripts/test-pwa-browser.mjs`,
`scripts/test-pwa-recovery.mjs`, `README.md`, `PWA.md`.

공식 참고: [Apple 홈 화면 웹앱](https://support.apple.com/ko-kr/guide/ipad/ipad8f1f7a29/ipados),
[Tauri iOS 빌드 조건](https://v2.tauri.app/start/prerequisites/#ios),
[오프라인 미디어의 부분 요청 처리](https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video).
