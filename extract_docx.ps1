$ErrorActionPreference = "Continue"
$xml = [xml](Get-Content "D:\khanhduy\ProFit\temp_docx_extract\word\document.xml" -Encoding UTF8 -Raw)
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
$nodes = $xml.SelectNodes("//w:t", $ns)
$sb = New-Object System.Text.StringBuilder
foreach ($node in $nodes) {
    [void]$sb.Append($node.InnerText)
}
$result = $sb.ToString()
# Replace carriage returns with newlines and collapse multiple spaces
$result = $result -replace "`r`n", "`n"
$result = $result -replace "[ ]+", " "
$result = $result.Trim()
$result | Out-File "D:\khanhduy\ProFit\docx_extracted_text.txt" -Encoding UTF8
Write-Host "Done. Output length: $($result.Length) chars"
