# Stream or inspect live external HTTP access logs for Tempo
param(
    [switch]$Follow = $false,
    [int]$Tail = 50
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Tempo Web & API Access Logs (External Traffic Only)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($Follow) {
    Write-Host "Streaming live access logs (Press Ctrl+C to stop)..." -ForegroundColor Yellow
    kubectl logs -l app=tempo-web -f --tail=$Tail | ForEach-Object {
        if ($_ -notmatch "kube-probe") {
            # Format nicely if matching standard nginx log
            if ($_ -match '(\S+) - \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d{3}) (\d+) "(.*?)" "(.*?)" "(.*?)"') {
                $time = $matches[2]
                $method = $matches[3]
                $url = $matches[4]
                $status = $matches[5]
                $clientIp = if ($matches[9] -ne "-" -and $matches[9] -ne "") { $matches[9] } else { $matches[1] }
                
                $statusColor = if ($status -match "^2") { "Green" } elseif ($status -match "^3") { "Yellow" } else { "Red" }
                
                Write-Host "[$time] " -NoNewline -ForegroundColor Gray
                Write-Host "IP: $($clientIp.PadRight(15)) " -NoNewline -ForegroundColor Magenta
                Write-Host "$status " -NoNewline -ForegroundColor $statusColor
                Write-Host "$method $url" -ForegroundColor White
            } else {
                Write-Output $_
            }
        }
    }
} else {
    Write-Host "Recent $Tail log entries:" -ForegroundColor Yellow
    $logs = kubectl logs -l app=tempo-web --tail=$Tail | Where-Object { $_ -notmatch "kube-probe" }
    
    foreach ($line in $logs) {
        if ($line -match '(\S+) - \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d{3}) (\d+) "(.*?)" "(.*?)" "(.*?)"') {
            $time = $matches[2]
            $method = $matches[3]
            $url = $matches[4]
            $status = $matches[5]
            $clientIp = if ($matches[9] -ne "-" -and $matches[9] -ne "") { $matches[9] } else { $matches[1] }
            
            $statusColor = if ($status -match "^2") { "Green" } elseif ($status -match "^3") { "Yellow" } else { "Red" }
            
            Write-Host "[$time] " -NoNewline -ForegroundColor Gray
            Write-Host "IP: $($clientIp.PadRight(15)) " -NoNewline -ForegroundColor Magenta
            Write-Host "$status " -NoNewline -ForegroundColor $statusColor
            Write-Host "$method $url" -ForegroundColor White
        } else {
            Write-Output $line
        }
    }
}
