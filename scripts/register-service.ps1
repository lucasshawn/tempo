# Registers Tempo Tunnel as a persistent Windows Scheduled Task that starts on boot/logon and restarts on failure

$taskName = "TempoPersistentTunnel"
$scriptPath = Join-Path $PSScriptRoot "tunnel-manager.ps1"

Write-Host "Registering Scheduled Task '$taskName'..." -ForegroundColor Cyan

# Remove existing task if present
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Stopping and removing existing task..." -ForegroundColor Yellow
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger1 = New-ScheduledTaskTrigger -AtStartup
$trigger2 = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit 0 `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

$userPrincipal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger @($trigger2) `
    -Settings $settings `
    -Principal $userPrincipal `
    -Description "Tempo Auto-Starting Background Tunnel Service" -Force | Out-Null

Write-Host "Successfully registered task '$taskName' under user '$env:USERNAME'." -ForegroundColor Green

# Start the task immediately
Start-ScheduledTask -TaskName $taskName
Write-Host "Scheduled task started." -ForegroundColor Green
