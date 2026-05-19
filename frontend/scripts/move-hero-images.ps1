# Перенос картинок героев в правильную папку и обновление models.json
# Запуск: правый клик -> "Выполнить с PowerShell" или: npm run fix-models

$ErrorActionPreference = "Stop"
$FrontendRoot = Split-Path $PSScriptRoot -Parent
$TargetDir = Join-Path $FrontendRoot "public\assets\models"

$ImageExt = @("*.png", "*.jpg", "*.jpeg", "*.webp", "*.gif", "*.PNG", "*.JPG", "*.JPEG")

# Откуда ещё часто кладут файлы по ошибке
$SourceDirs = @(
    (Join-Path $FrontendRoot "models"),
    (Join-Path $FrontendRoot "public\models"),
    (Join-Path $FrontendRoot "src\models"),
    (Join-Path $FrontendRoot "src\assets\models"),
    (Join-Path $FrontendRoot "assets\models"),
    (Join-Path (Split-Path $FrontendRoot -Parent) "models")
)

Write-Host ""
Write-Host "=== Перенос моделей для главного экрана ===" -ForegroundColor Cyan
Write-Host "Куда:" $TargetDir
Write-Host ""

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    Write-Host "Создана папка:" $TargetDir -ForegroundColor Green
}

$moved = 0
$skipped = 0

foreach ($srcDir in $SourceDirs) {
    if (-not (Test-Path $srcDir)) { continue }
    if ((Resolve-Path $srcDir).Path -eq (Resolve-Path $TargetDir).Path) { continue }

    Write-Host "Проверяю:" $srcDir -ForegroundColor DarkGray

    foreach ($pattern in $ImageExt) {
        Get-ChildItem -Path $srcDir -Filter $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {
            $dest = Join-Path $TargetDir $_.Name
            if (Test-Path $dest) {
                Write-Host "  пропуск (уже есть):" $_.Name -ForegroundColor Yellow
                $skipped++
                return
            }
            Move-Item -LiteralPath $_.FullName -Destination $dest -Force
            Write-Host "  перенесено:" $_.Name -ForegroundColor Green
            $moved++
        }
    }
}

Write-Host ""
if ($moved -eq 0 -and $skipped -eq 0) {
    Write-Host "В других папках картинок не найдено." -ForegroundColor Yellow
    Write-Host "Если файлы уже в public\assets\models — это правильно, просто запустите sync." -ForegroundColor Yellow
}

$inTarget = @()
foreach ($pattern in $ImageExt) {
    $inTarget += Get-ChildItem -Path $TargetDir -Filter $pattern -File -ErrorAction SilentlyContinue
}
Write-Host ""
Write-Host "Сейчас в целевой папке картинок:" $inTarget.Count -ForegroundColor Cyan
$inTarget | ForEach-Object { Write-Host "  •" $_.Name }

Write-Host ""
Write-Host "Обновляю models.json..." -ForegroundColor Cyan
& node (Join-Path $PSScriptRoot "sync-hero-models.js")
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка sync-hero-models.js" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Готово! Перезапустите сайт: npm start" -ForegroundColor Green
Write-Host "На главной нажмите «Выбрать модель» или «Обновить»." -ForegroundColor Green
Write-Host ""
