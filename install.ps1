# Установка плагина Prizrak-Box VPN для OpenDeck (Windows)
#
# Запуск: правый клик -> "Выполнить с помощью PowerShell"
# либо в терминале: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

$pluginName = "com.enerby.prizrakvpn.sdPlugin"
$source = Join-Path $PSScriptRoot $pluginName
$targetRoot = Join-Path $env:APPDATA "opendeck\plugins"
$target = Join-Path $targetRoot $pluginName

Write-Host ""
Write-Host "  Установка Prizrak-Box VPN для OpenDeck" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $source)) {
    Write-Host "  ОШИБКА: не найдена папка $pluginName" -ForegroundColor Red
    Write-Host "  Запустите install.ps1 из корня репозитория." -ForegroundColor Yellow
    exit 1
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  ОШИБКА: Node.js не найден." -ForegroundColor Red
    Write-Host "  OpenDeck запускает плагины через Node. Установите:" -ForegroundColor Yellow
    Write-Host "    https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$version = (& node --version).TrimStart("v")
$major = [int]($version.Split(".")[0])
if ($major -lt 20) {
    Write-Host "  ОШИБКА: нужен Node.js 20 или новее (у вас $version)." -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js $version - подходит" -ForegroundColor Green

if (-not (Test-Path $targetRoot)) {
    Write-Host "  Каталог плагинов OpenDeck не найден, создаю:" -ForegroundColor Yellow
    Write-Host "  $targetRoot" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
}

if (Test-Path $target) {
    Write-Host "  Плагин уже установлен - обновляю..." -ForegroundColor Yellow
    Remove-Item $target -Recurse -Force
}
Copy-Item $source $target -Recurse -Force
Write-Host "  Скопировано в:" -ForegroundColor Green
Write-Host "  $target"

Write-Host ""
Write-Host "  Готово." -ForegroundColor Green
Write-Host ""
Write-Host "  Что дальше:" -ForegroundColor Cyan
Write-Host "   1. Полностью закройте OpenDeck"
Write-Host "   2. Запустите его заново (плагины читаются только при старте)"
Write-Host "   3. Перетащите действия из категории Prizrak-Box VPN на клавиши"
Write-Host ""
Write-Host "  Лог для проверки:" -ForegroundColor Cyan
Write-Host "   $target\logs\prizrakvpn.log"
Write-Host ""