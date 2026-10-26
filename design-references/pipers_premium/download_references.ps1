# Downloads reference-only external screenshots to the local references directory.
# Some publishers block automated requests; any failed file is reported and can be saved manually from the HTML gallery instead.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Output = Join-Path $Root 'references'
New-Item -ItemType Directory -Force -Path $Output | Out-Null
$Manifest = Get-Content -Raw -Path (Join-Path $Root 'image_sources.json') | ConvertFrom-Json
$ok=0; $failed=0
foreach ($item in $Manifest.references) {
    $dest = Join-Path $Output $item.file
    if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 1024)) {
        Write-Host "Already present: $($item.id) $($item.file)"; continue
    }
    try {
        Invoke-WebRequest -Uri $item.image -OutFile $dest -Headers @{ 'User-Agent'='Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } -MaximumRedirection 5 -TimeoutSec 40
        if ((Get-Item $dest).Length -lt 1024) { throw 'File unexpectedly small (possibly an error page)' }
        Write-Host "Saved: $($item.id) $($item.file)"
        $ok++
    } catch {
        if (Test-Path $dest) { Remove-Item $dest -Force }
        Write-Warning "Unable to fetch $($item.id): $($_.Exception.Message). Open the image URL from reference_gallery.html and save manually if needed."
        $failed++
    }
}
Write-Host "Finished. Newly saved: $ok. Failed: $failed. Existing files retained."
