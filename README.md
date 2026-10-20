# Nihongo Mate

한국인을 위한 히라가나·가타카나·일상 일본어 회화 학습 앱입니다. 웹과 Windows 데스크톱에서 같은 소스 코드를 사용하며, 학습 기록은 각 실행 환경의 `localStorage`에 독립적으로 저장됩니다.

## 웹 개발 실행

```powershell
npm install
npm run dev
```

## 검증

```powershell
npm test
npm run build
```

## Windows 데스크톱

필수 개발 환경은 Rust MSVC, Visual Studio 2022 Build Tools의 **Desktop development with C++** 워크로드, Microsoft Edge WebView2입니다.

```powershell
npm run desktop:dev
npm run desktop:build
```

`desktop:build`는 웹 번들을 먼저 생성한 다음 `src-tauri/target/release/bundle/nsis`에 NSIS 설치 프로그램을 만듭니다. 새 버전 배포 시 `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`의 버전을 함께 올리고 다시 빌드하세요.