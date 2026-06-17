# Wrapper that hardcodes path inside the script (no path on command line)
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Hardcode - this script file is inside the folder, so use its own location
$DATA_DIR = $PSScriptRoot
$OUT_DIR  = Join-Path $DATA_DIR 'output'
New-Item -ItemType Directory -Force -Path $OUT_DIR | Out-Null

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
$log = New-Object System.Text.StringBuilder
function Out($text) { [void]$log.AppendLine($text) }

Out "# Phân tích du lieu - Output"
Out "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Out "Folder: $DATA_DIR"
Out ""

# Enumerate using .NET (no shell path parsing)
$dirInfo = New-Object System.IO.DirectoryInfo($DATA_DIR)
$jsonFiles = $dirInfo.GetFiles('*.json') | Sort-Object Name

Out "## 1. List JSON files"
Out "Total files: $($jsonFiles.Count)"
foreach ($f in $jsonFiles) {
    $name  = $f.Name
    $sizeK = [math]::Round($f.Length / 1024, 1)
    $line  = ('  - {0,-35s} {1,8:N1} KB' -f $name, $sizeK)
    Out $line
}
Out ""

# Load each file using .NET StreamReader with explicit UTF8
$datasets = [ordered]@{}
foreach ($f in $jsonFiles) {
    $sr = New-Object System.IO.StreamReader($f.FullName, [System.Text.Encoding]::UTF8, $true)
    $text = $sr.ReadToEnd()
    $sr.Close()
    $datasets[$f.BaseName] = $text | ConvertFrom-Json
}

Out "## 2. Dataset sizes"
foreach ($k in $datasets.Keys) {
    Out ('  {0,-30s} -> {1,4} records' -f $k, $datasets[$k].Count)
}
Out ""

# Schema analysis
Out "## 3. Schema analysis"
foreach ($name in $datasets.Keys) {
    $recs = $datasets[$name]
    if ($recs.Count -eq 0) { continue }
    $first = $recs[0]
    Out "### $name"
    Out ('  Top-level keys:   ' + ($first.PSObject.Properties.Name -join ', '))
    if ($first.metadata) {
        Out ('  metadata keys:    ' + ($first.metadata.PSObject.Properties.Name -join ', '))
    }
    if ($first.attributes) {
        Out ('  attributes keys:  ' + ($first.attributes.PSObject.Properties.Name -join ', '))
    }
    Out ""
}

# All unique keys
$allMeta = New-Object System.Collections.Generic.HashSet[string]
$allAttr = New-Object System.Collections.Generic.HashSet[string]
foreach ($data in $datasets.Values) {
    foreach ($r in $data) {
        if ($r.metadata) {
            foreach ($p in $r.metadata.PSObject.Properties) { [void]$allMeta.Add($p.Name) }
        }
        if ($r.attributes) {
            foreach ($p in $r.attributes.PSObject.Properties) { [void]$allAttr.Add($p.Name) }
        }
    }
}
Out "## 4. All metadata keys (across all datasets)"
foreach ($k in ($allMeta | Sort-Object)) { Out ('  - ' + $k) }
Out ""
Out "## 5. All attributes keys (across all datasets)"
foreach ($k in ($allAttr | Sort-Object)) { Out ('  - ' + $k) }
Out ""

# Per-dataset stats
Out "## 6. Per-dataset statistics"
$allRows = New-Object System.Collections.Generic.List[object]
foreach ($name in $datasets.Keys) {
    $data = $datasets[$name]
    if ($data.Count -eq 0) { continue }
    $first = $data[0]
    if (-not $first.metadata) { continue }

    $categories = @($data | ForEach-Object { $_.metadata.category }       | Where-Object { $_ } | Sort-Object -Unique)
    $brands     = @($data | ForEach-Object { $_.metadata.brand }           | Where-Object { $_ } | Sort-Object -Unique)
    $flavors    = @($data | ForEach-Object { $_.metadata.flavor }          | Where-Object { $_ } | Sort-Object -Unique)
    $origins    = @($data | ForEach-Object { $_.metadata.origin_country }  | Where-Object { $_ } | Sort-Object -Unique)
    $prices     = @($data | ForEach-Object { $_.metadata.price }           | Where-Object { $_ -ne $null })

    Out "### $name ($($data.Count) records)"
    Out ('  Categories: ' + ($categories -join ', '))
    Out ('  Brands (' + $brands.Count + '): ' + ($brands -join ', '))
    Out ('  Flavors (' + $flavors.Count + '): ' + ($flavors -join ', '))
    Out ('  Origins: ' + ($origins -join ', '))
    if ($prices.Count -gt 0) {
        $min = ($prices | Measure-Object -Minimum).Minimum
        $max = ($prices | Measure-Object -Maximum).Maximum
        $avg = ($prices | Measure-Object -Average).Average
        Out ('  Price: min=' + $min.ToString('N2') + '  max=' + $max.ToString('N2') + '  mean=' + $avg.ToString('N2'))
    }
    Out ""

    foreach ($r in $data) {
        $row = [pscustomobject]@{
            dataset  = $name
            id       = $r.id
            name     = $r.metadata.name
            brand    = $r.metadata.brand
            category = $r.metadata.category
            flavor   = $r.metadata.flavor
            price    = $r.metadata.price
            origin   = $r.metadata.origin_country
        }
        [void]$allRows.Add($row)
    }
}

# CSV
$csvPath = Join-Path $OUT_DIR 'combined_products.csv'
$allRows | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
Out "## 7. Combined CSV"
Out ('  Path: ' + $csvPath)
Out ('  Rows: ' + $allRows.Count)
Out ""

# Top brands
Out "## 8. Top 15 brands (overall)"
$brandCounts = $allRows | Where-Object { $_.brand } | Group-Object brand | Sort-Object Count -Descending | Select-Object -First 15
foreach ($b in $brandCounts) {
    Out ('  ' + $b.Name.PadRight(30) + ' ' + $b.Count.ToString().PadLeft(3))
}
Out ""

# Save report
$mdPath = Join-Path $OUT_DIR 'analysis_report.md'
[System.IO.File]::WriteAllText($mdPath, $log.ToString(), $utf8Bom)

# Save summary JSON
$summary = [pscustomobject]@{
    generated_at  = Get-Date -Format 'o'
    folder        = $DATA_DIR
    total_files   = $jsonFiles.Count
    total_records = ($datasets.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
    files         = @()
}
foreach ($name in $datasets.Keys) {
    $d = $datasets[$name]
    $summary.files += [pscustomobject]@{
        name     = $name
        records  = $d.Count
        category = (@($d | ForEach-Object { $_.metadata.category }      | Where-Object { $_ } | Sort-Object -Unique) -join ', ')
        brands   = (@($d | ForEach-Object { $_.metadata.brand }          | Where-Object { $_ } | Sort-Object -Unique) -join ', ')
        flavors  = (@($d | ForEach-Object { $_.metadata.flavor }         | Where-Object { $_ } | Sort-Object -Unique) -join ', ')
    }
}
$jsonPath = Join-Path $OUT_DIR 'analysis_summary.json'
[System.IO.File]::WriteAllText($jsonPath, ($summary | ConvertTo-Json -Depth 4), $utf8Bom)

# Console output
Write-Host ""
Write-Host "==========================================="
Write-Host "  ANALYSIS COMPLETE"
Write-Host "==========================================="
Write-Host ('Output folder: ' + $OUT_DIR)
Write-Host ""
Write-Host "Generated files:"
foreach ($f in ([System.IO.DirectoryInfo]::new($OUT_DIR)).GetFiles() | Sort-Object Name) {
    Write-Host ('  ' + $f.Name.PadRight(30) + ' ' + $f.Length.ToString().PadLeft(8) + ' bytes')
}
