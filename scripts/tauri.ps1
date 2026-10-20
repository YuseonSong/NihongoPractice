param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('dev', 'build', 'info')]
  [string]$Command
)

$ErrorActionPreference = 'Stop'
$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
$cargoExe = Join-Path $cargoBin 'cargo.exe'
$tauriCli = Join-Path $PSScriptRoot '..\node_modules\.bin\tauri.cmd'

if (-not (Test-Path -LiteralPath $cargoExe)) {
  throw "Cargo를 찾을 수 없습니다. Rustup을 설치한 뒤 새 터미널을 열어 주세요: https://rustup.rs/"
}
if (-not (Test-Path -LiteralPath $tauriCli)) {
  throw "Tauri CLI를 찾을 수 없습니다. 먼저 npm install을 실행해 주세요."
}

$env:Path = "$cargoBin;$env:Path"
if ($Command -eq 'build') {
  & $tauriCli build --bundles nsis
} else {
  & $tauriCli $Command
}
exit $LASTEXITCODE