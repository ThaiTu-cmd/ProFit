# ============================================================
#  pull-safe.ps1 - Pull code an toan tu origin/develop
#  Muc dich: tranh mat code local khi pull code moi tu team
#
#  Cach dung:
#    cd C:\Users\Admin\Desktop\ProFit-springboot
#    .\pull-safe.ps1
#
#  Script se:
#    1. Backup code local ra folder _backups/ (zip, khong commit)
#    2. Stash moi thay doi local chua commit
#    3. Fetch + pull tu origin/develop
#    4. Neu co conflict: dung lai, huong dan xu ly
#    5. Neu OK: pop stash tro lai (neu conflict thi stash van nam do)
# ============================================================

$ErrorActionPreference = "Stop"

# Mau sac cho de doc
function Write-Section($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)      { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "[ERR] $msg" -ForegroundColor Red }

# Buoc 0: kiem tra moi truong
Write-Section "Pre-flight checks"

if (-not (Test-Path ".git")) {
    Write-Err "Khong tim thay .git. Chay script tu thu muc goc cua repo."
    exit 1
}

$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Branch hien tai: $currentBranch"

if ($currentBranch -ne "develop") {
    Write-Warn "Ban dang o branch '$currentBranch' (khong phai develop)."
    $ans = Read-Host "Tiep tuc pull? (y/N)"
    if ($ans -ne "y") { Write-Host "Da huy." ; exit 0 }
}

# Buoc 1: backup code local
Write-Section "Backup local code"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "_backups"
$backupFile = "$backupDir/code_before_pull_$timestamp.zip"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

git archive --format=zip --output=$backupFile HEAD 2>&1 | Out-Null
Write-Ok "Backup code (tracked) tai: $backupFile"

# Backup luon DB neu docker dang chay
$mysqlRunning = docker ps --format "{{.Names}}" 2>$null | Select-String "profit-mysql"
if ($mysqlRunning) {
    Write-Ok "Phat hien MySQL container dang chay, dang dump DB..."
    $dbBackup = "$backupDir/db_before_pull_$timestamp.sql"
    $dump = docker exec -e MYSQL_PWD=root profit-mysql mysqldump -uroot --single-transaction --routines --triggers ProFitSuppsDB 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dump | Out-File -FilePath $dbBackup -Encoding utf8
        Write-Ok "Backup DB tai: $dbBackup"
    } else {
        Write-Warn "Dump DB that bai, tiep tuc khong co backup DB."
    }
} else {
    Write-Warn "MySQL container khong chay, bo qua backup DB."
}

# Buoc 2: stash thay doi local
Write-Section "Stash local changes"
$stashOutput = git stash push -u -m "auto-stash before pull $timestamp" 2>&1
if ($LASTEXITCODE -eq 0) {
    if ($stashOutput -match "No local changes to save") {
        Write-Ok "Khong co thay doi local, skip stash."
    } else {
        Write-Ok "Da stash local changes. Co the pop lai sau."
    }
} else {
    Write-Err "Stash that bai:"
    Write-Host $stashOutput
    exit 1
}

# Buoc 3: fetch + pull
Write-Section "Fetch + pull tu origin"
$fetchResult = git fetch origin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Err "Fetch that bai:"
    Write-Host $fetchResult
    Write-Warn "Dang pop stash lai..."
    git stash pop 2>&1 | Out-Null
    exit 1
}
Write-Ok "Fetch OK"

# Kiem tra co gi moi khong
$newCommits = git rev-list --left-right --count HEAD...origin/develop
Write-Host "Commits ahead/behind: $newCommits"
$behind = ($newCommits -split '\s+')[0]

if ($behind -eq 0) {
    Write-Ok "Da dong bo voi origin/develop. Khong co gi moi de pull."
} else {
    Write-Host "Co $behind commit(s) moi tu origin/develop. Dang pull..."
    $pullResult = git pull origin develop 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Pull that bai - co the da xay ra CONFLICT:"
        Write-Host $pullResult
        Write-Host ""
        Write-Warn "De xem danh sach file conflict:"
        Write-Host "    git status"
        Write-Host ""
        Write-Warn "De xem chi tiet 1 file conflict:"
        Write-Host "    git diff --name-only --diff-filter=U"
        Write-Host ""
        Write-Warn "De huy pull va quay lai trang thai truoc:"
        Write-Host "    git merge --abort"
        Write-Host "    git stash pop  # khoi phuc thay doi local"
        Write-Host ""
        Write-Warn "Sau khi fix conflict:"
        Write-Host "    git add <file>"
        Write-Host "    git commit"
        Write-Host "    git stash pop  # lay lai thay doi local (co the bi conflict lai)"
        exit 1
    }
    Write-Ok "Pull thanh cong."
}

# Buoc 4: pop stash neu co
Write-Section "Restore local changes"
$stashList = git stash list 2>&1
if ($stashList -match "auto-stash before pull $timestamp") {
    Write-Host "Dang pop stash..."
    $popResult = git stash pop 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Pop stash co conflict. Cac thay doi local van con trong stash:"
        Write-Host "    git stash list"
        Write-Host "    git stash show -p stash@{0}"
        Write-Host ""
        Write-Host "Co the giu nguyen stash nay va tu merge thu cong sau."
    } else {
        Write-Ok "Da pop stash thanh cong."
    }
} else {
    Write-Ok "Khong co stash de pop."
}

# Buoc 5: tom tat
Write-Section "Tom tat"
Write-Host "Branch:           $currentBranch"
Write-Host "Last commit:      $(git log -1 --oneline)"
Write-Host "Tracked files:    $((git ls-files | Measure-Object -Line).Lines)"
Write-Host "Backup code:      $backupFile"
if ($dbBackup) { Write-Host "Backup DB:        $dbBackup" }
Write-Host ""
Write-Ok "Hoan tat!"
