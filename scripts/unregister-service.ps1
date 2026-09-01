# Unregisters and stops the Tempo Tunnel Windows Scheduled Task

$taskName = "TempoPersistentTunnel"

Write-Host "Stopping and removing Scheduled Task '$taskName'..." -ForegroundColor Cyan

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Scheduled task removed." -ForegroundColor Green
} else {
    Write-Host "Scheduled task was not found." -ForegroundColor Yellow
}

# Kill any remaining cloudflared processes
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Stopped any running cloudflared processes." -ForegroundColor Green
