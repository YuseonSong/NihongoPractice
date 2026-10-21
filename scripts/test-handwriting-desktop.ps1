# Build a Release test harness with a local CDP port, test, then restore the normal installer.
param([switch]$SkipBuild, [switch]$KeepTestBuild, [ValidateSet('test-handwriting-browser.mjs','test-audio-browser.mjs','test-v130-browser.mjs')][string]$TestScript='test-handwriting-browser.mjs')
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$config = Join-Path $project 'artifacts\tauri-test.conf.json'
$profileDir = Join-Path $project 'artifacts\webview2-test-profile'
$oldProfile = $env:WEBVIEW2_USER_DATA_FOLDER
$appProcess = $null
Push-Location $project
try {
  New-Item -ItemType Directory -Force (Join-Path $project 'artifacts') | Out-Null
  $env:Path = "$(Join-Path $env:USERPROFILE '.cargo\bin');$env:Path"
  '{"app":{"windows":[{"label":"main","title":"Yuseon's Nihongo","width":1200,"height":900,"additionalBrowserArgs":"--remote-debugging-port=9222 --remote-debugging-address=127.0.0.1"}]}}' | Set-Content -LiteralPath $config -Encoding UTF8
  if (-not $SkipBuild) {
    & (Join-Path $project 'node_modules\.bin\tauri.cmd') build --no-bundle --config $config
    if ($LASTEXITCODE -ne 0) { throw 'Test Release build failed.' }
  }
  $env:WEBVIEW2_USER_DATA_FOLDER = $profileDir
  $exe = Join-Path $project 'src-tauri\target\release\nihongo-mate.exe'
  $appProcess = Start-Process -FilePath $exe -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $project 'artifacts\desktop-process.log') -RedirectStandardError (Join-Path $project 'artifacts\desktop-process-error.log')
  $ready = $false
  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    try {
      $null = Invoke-WebRequest -Uri 'http://127.0.0.1:9222/json/version' -UseBasicParsing -TimeoutSec 1
      $ready = $true
      break
    } catch { Start-Sleep -Milliseconds 250 }
  }
  if (-not $ready) { throw 'WebView2 CDP endpoint did not open.' }
  & node (Join-Path $PSScriptRoot $TestScript) --desktop
  if ($LASTEXITCODE -ne 0) { throw 'Desktop browser tests failed.' }
} finally {
  $env:WEBVIEW2_USER_DATA_FOLDER = $oldProfile
  if ($appProcess -and -not $appProcess.HasExited) { Stop-Process -Id $appProcess.Id }
  if (-not $KeepTestBuild) { & (Join-Path $PSScriptRoot 'tauri.ps1') build }
  Pop-Location
}
