# Nihongo Mate

한국인을 위한 히라가나·가타카나·일상 일본어 회화 학습 앱입니다. 웹과 Windows 데스크톱에서 같은 소스 코드를 사용하며, 학습 기록은 각 실행 환경의 `localStorage`에 독립적으로 저장됩니다.

## 아이패드 홈 화면 설치

Safari의 ‘홈 화면에 추가’로 사용하는 웹앱(PWA)을 지원합니다. 최초 접속 후 음성 216개와
학습 자료의 저장이 끝나 ‘오프라인 준비 완료’가 표시되면 오프라인 학습을 지원합니다.
PC와 아이패드의 기록은 별도로 저장됩니다. iOS 네이티브 설치 파일(IPA)은 생성하지 않았습니다.

[설치 주소·사용 방법·검증 범위](PWA.md)

## 자유 문자 학습 (1.3.1)

시작 화면의 ‘히라가나 먼저 시작해 볼까요?’ 안내에서 바로 히라가나를 공부합니다.
첫 5글자 입문 과정은 제거했고, 문자표에서 원하는 문자를 고르거나 이전·다음 버튼으로
46자를 자유롭게 이동합니다. 완료 표시, 이어하기, 발음 길잡이, 회화, 퀴즈·오답 복습은 유지합니다.
기존 입문 과정에서 얻은 완료 기록과 216개 오프라인 음성도 보존합니다.

[변경 내용·검증 결과·배포 파일·한계](UX131.md)

Windows 배포: `release/NihongoMate-1.3.1-windows-x64-setup.exe` (설치용),
`release/NihongoMate-1.3.1.exe` (바로 실행). 배포 파일은 Git 추적에서 제외합니다.

## 오프라인 발음 (1.2.0)

일본어 언어팩 없이 들을 수 있는 실제 음성 파일 216개를 포함합니다.
기본 문자 92자, 가타카나 확장 58개, 예시 단어 46개와 회화 70문장을
동일 발음 공유 방식으로 연결했습니다. 발음 듣기·0.8배·반복·중지를 제공합니다.
音声: VOICEVOX Nemo（女声1）. 배포 시 출처와 공식 이용약관을 유지하세요.

[파일 수·라이선스·읽기 검토·생성 방법·검증·한계·배포 파일](AUDIO.md)

## 손글씨 연습 (1.1.0)

‘직접 그려보기’에서 마우스·터치·펜으로 연습하고 **あ・い・う・え・お**의
형태·획순 유사도를 오프라인으로 비교할 수 있습니다. 다른 문자는 자유 필기만 지원합니다.
정답 숨기기, 획순 가이드, 되돌리기, 비교 겹침과 문자별 기록을 제공합니다.

점수는 KanjiVG 기준 획과 비교한 학습용 수치이며 실제 인식 정확도가 아닙니다.
[구현·계산식·검증 결과·한계·수정 파일](HANDWRITING.md)을 확인하세요.
기준 데이터 출처와 라이선스는 [여기](public/strokes/ATTRIBUTION.md)에 있습니다.
PowerShell에서 npm 스크립트 실행이 차단된다면 `npm` 대신 `npm.cmd`를 사용하세요.

## 웹 개발 실행

```powershell
npm install
npm run dev
```

## 검증

```powershell
npm test
npm run build
npm run test:ux
npm run test:audio
npm run test:browser
npm run test:pwa
```

브라우저 검증은 별도로 실행한 개발 서버(`npm run dev`, 기본 포트 5173)를 사용합니다.

## Windows 데스크톱

필수 개발 환경은 Rust MSVC, Visual Studio 2022 Build Tools의 **Desktop development with C++** 워크로드, Microsoft Edge WebView2입니다.

```powershell
npm run desktop:dev
npm run desktop:build
```

`desktop:build`는 웹 번들을 먼저 생성한 다음 `src-tauri/target/release/bundle/nsis`에 NSIS 설치 프로그램을 만듭니다. 새 버전 배포 시 `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`의 버전을 함께 올리고 다시 빌드하세요.
