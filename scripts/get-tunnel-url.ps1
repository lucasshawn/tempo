# Displays the current live public Tunnel URL for Tempo

$urlFile = Join-Path $PSScriptRoot "..\TUNNEL_URL.txt"

if (Test-Path $urlFile) {
    Get-Content $urlFile
} else {
    Write-Host "TUNNEL_URL.txt not found yet. The tunnel may still be starting up. Check tunnel.log for progress." -ForegroundColor Yellow
}
