# =============================================================
# Script tải ảnh sản phẩm supplement bằng PowerShell
# Chạy: .\download_images.ps
# =============================================================
# Yêu cầu: PowerShell 5.0+
# Output:  download/dataset_online/images/
# =============================================================

$ErrorActionPreference = "SilentlyContinue"

# ── Đường dẫn ──────────────────────────────────────────────
$ScriptDir  = $PSScriptRoot
$JsonPath   = "$ScriptDir\products.json"
$OutBase    = "$ScriptDir\images"

# ── Tạo thư mục ──────────────────────────────────────────
@("whey","creatine","protein_bar","protein_cookie","pre_workout") | ForEach-Object {
    New-Item -ItemType Directory -Path "$OutBase\$_" -Force | Out-Null
}

# ── Đọc JSON ─────────────────────────────────────────────
$products = Get-Content $JsonPath -Raw | ConvertFrom-Json

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SUPPLEMENT IMAGE SCRAPER  (PowerShell)"                 -ForegroundColor Cyan
Write-Host "  Total products : $($products.Count)"                    -ForegroundColor Cyan
Write-Host "  Output folder  : $OutBase"                              -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── Hàm tải ảnh ──────────────────────────────────────────
function Get-SafeName {
    param([string]$s)
    $s = $s -replace '[\\/:*?"<>|]', '_'
    $s = $s.Trim()
    if ($s.Length -gt 180) { $s = $s.Substring(0, 180) }
    return $s
}

function Invoke-ImageDownload {
    param([hashtable]$Product)

    $id       = $Product.id
    $brand    = $Product.brand
    $category = $Product.category
    $name     = $Product.name
    $flavor   = $Product.flavor
    $query    = "$brand $name $flavor supplement"

    $safeBrand  = Get-SafeName $brand
    $safeName  = Get-SafeName ($name -replace ' - .*','')
    $safeFlavor= Get-SafeName $flavor
    $fileName  = "{0:D3}_{1}_{2}_{3}" -f $id, $safeBrand, $safeName, $safeFlavor
    $fileName  = $fileName -replace '_+', '_'
    $outPath   = "$OutBase\$category\$fileName.jpg"

    # Skip nếu đã có
    if (Test-Path $outPath) {
        return @{ status="exists"; id=$id; name=$name }
    }

    # Tạo Google Images search URL
    $encodedQ  = [System.Uri]::EscapeDataString($query)
    $searchUrl = "https://www.google.com/search?tbm=isch&q=$encodedQ"

    # User-Agent
    $headers = @{
        "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        "Accept"     = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        "Accept-Language" = "en-US,en;q=0.9"
    }

    try {
        # Lấy HTML search page
        $response = Invoke-WebRequest -Uri $searchUrl -Headers $headers -TimeoutSec 10 -UseBasicParsing
        $html = $response.Content

        # Tìm image URLs trong JSON data của Google
        # Google trả về dạng: "ou":"https://...image...","ow":...
        $imgMatches = [regex]::Matches($html, '"ou":"(https?://[^"]+\.(?:jpg|jpeg|png|webp))"')

        if ($imgMatches.Count -gt 0) {
            # Thử 3 ảnh đầu tiên
            for ($i = 0; $i -lt [Math]::Min(3, $imgMatches.Count); $i++) {
                $imgUrl = $imgMatches[$i].Groups[1].Value
                $imgUrl = $imgUrl -replace '\\u003d', '='
                $imgUrl = $imgUrl -replace '\\u0026', '&'

                try {
                    $imgResp = Invoke-WebRequest -Uri $imgUrl -Headers $headers -TimeoutSec 10 -UseBasicParsing -OutFile $outPath
                    $size = (Get-Item $outPath).Length
                    if ($size -gt 500) {
                        return @{ status="saved"; id=$id; name=$name; path=$outPath; size=$size }
                    } else {
                        Remove-Item $outPath -Force
                    }
                } catch {
                    continue
                }
            }
        }

        # Fallback: thử logo.clearbit.com
        $logoUrl = "https://logo.clearbit.com/$($brand.ToLower().Replace(' ','')).com"
        try {
            Invoke-WebRequest -Uri $logoUrl -Headers $headers -TimeoutSec 8 -UseBasicParsing -OutFile $outPath
            $size = (Get-Item $outPath).Length
            if ($size -gt 200) {
                return @{ status="saved"; id=$id; name=$name; path=$outPath; size=$size }
            }
        } catch {}

        # Fallback 2: Bing Images
        $encodedQ2 = [System.Uri]::EscapeDataString($query)
        $bingUrl   = "https://www.bing.com/images/search?q=$encodedQ2&first=1"
        try {
            $bingResp = Invoke-WebRequest -Uri $bingUrl -Headers $headers -TimeoutSec 10 -UseBasicParsing
            $bingHtml = $bingResp.Content
            $bingImgs = [regex]::Matches($bingHtml, 'src="(https?://[^"]+\.(?:jpg|jpeg|png))"')
            if ($bingImgs.Count -gt 0) {
                $imgUrl = $bingImgs[0].Groups[1].Value
                Invoke-WebRequest -Uri $imgUrl -Headers $headers -TimeoutSec 10 -UseBasicParsing -OutFile $outPath
                $size = (Get-Item $outPath).Length
                if ($size -gt 500) {
                    return @{ status="saved"; id=$id; name=$name; path=$outPath; size=$size }
                }
            }
        } catch {}

    } catch {
        # Silent fail
    }

    return @{ status="failed"; id=$id; name=$name; query=$query }
}

# ── Chạy tải ──────────────────────────────────────────────
$total    = $products.Count
$saved    = 0
$failed   = 0
$skipped  = 0

$startTime = Get-Date

for ($i = 0; $i -lt $products.Count; $i++) {
    $p    = $products[$i]
    $idx  = $i + 1
    $result = Invoke-ImageDownload $p

    $barLen  = 30
    $prog    = [Math]::Round($idx / $total * $barLen)
    $bar     = "=" * $prog + ">" + " " * ($barLen - $prog)

    if ($result.status -eq "saved") {
        $saved++
        $kb = [Math]::Round($result.size / 1KB)
        Write-Host "[$bar] $idx/$total  SAVED  $($result.name) ($kb KB)" -ForegroundColor Green
    } elseif ($result.status -eq "exists") {
        $skipped++
        Write-Host "[$bar] $idx/$total  EXISTS $($result.name)" -ForegroundColor Yellow
    } else {
        $failed++
        Write-Host "[$bar] $idx/$total  FAILED $($result.name)" -ForegroundColor Red
    }

    # Nghỉ 1-2s giữa mỗi request (tránh block Google)
    Start-Sleep -Milliseconds 1500
}

$elapsed = (Get-Date) - $startTime

# ── Tổng kết ─────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  KẾT QUẢ"                                               -ForegroundColor Cyan
Write-Host "  Tổng sản phẩm : $total"                                 -ForegroundColor White
Write-Host "  Đã tải        : $saved"                                -ForegroundColor Green
Write-Host "  Đã tồn tại    : $skipped"                               -ForegroundColor Yellow
Write-Host "  Thất bại      : $failed"                                 -ForegroundColor Red
Write-Host "  Thời gian     : $([Math]::Round($elapsed.TotalMinutes)) phút" -ForegroundColor White
Write-Host "  Output folder : $OutBase"                               -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── Tạo report ─────────────────────────────────────────
$reportPath = "$OutBase\download_report.txt"
$lines = @("id,name,brand,category,flavor,size,status")
foreach ($p in $products) {
    $lines += "$($p.id),$($p.name),$($p.brand),$($p.category),$($p.flavor),$($p.size),"
}
$lines | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "Report: $reportPath" -ForegroundColor Gray
