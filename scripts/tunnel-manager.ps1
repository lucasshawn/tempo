# Tempo Persistent Tunnel Manager
# Automatically manages Minikube readiness, Cloudflare Tunnel, and URL persistence across reboots.

param(
    [string]$LogFile = "$PSScriptRoot\..\tunnel.log",
    [string]$UrlFile = "$PSScriptRoot\..\TUNNEL_URL.txt"
)

$ErrorActionPreference = "Continue"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] $Message"
    Write-Output $logLine
    Add-Content -Path $LogFile -Value $logLine -ErrorAction SilentlyContinue
}

$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflaredPath)) {
    $found = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
    if ($found) {
        $cloudflaredPath = $found.Source
    } else {
        Write-Log "ERROR: cloudflared.exe not found! Please ensure it is installed."
        exit 1
    }
}

Write-Log "=========================================="
Write-Log "Starting Tempo Tunnel Manager"
Write-Log "=========================================="

while ($true) {
    try {
        # 1. Check Minikube status
        Write-Log "Checking Minikube status..."
        $statusOutput = & minikube status 2>&1 | Out-String
        if ($statusOutput -notmatch "host: Running" -or $statusOutput -notmatch "kubelet: Running") {
            Write-Log "Minikube is not running. Starting Minikube..."
            & minikube start 2>&1 | Out-Null
        }

        # 2. Get Minikube IP
        $minikubeIp = (& minikube ip 2>$null).Trim()
        if (-not $minikubeIp) {
            Write-Log "Warning: Could not get Minikube IP. Retrying in 10 seconds..."
            Start-Sleep -Seconds 10
            continue
        }

        $targetUrl = "http://${minikubeIp}:30080"
        Write-Log "Target application endpoint: $targetUrl"

        # 3. Verify target port is responding
        $maxRetries = 10
        $ready = $false
        for ($i = 0; $i -lt $maxRetries; $i++) {
            try {
                $test = Invoke-WebRequest -Uri $targetUrl -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
                if ($test.StatusCode -ge 200 -and $test.StatusCode -lt 400) {
                    $ready = $true
                    break
                }
            } catch {
                Write-Log "Waiting for web service to respond ($($i+1)/$maxRetries)..."
                Start-Sleep -Seconds 3
            }
        }

        if (-not $ready) {
            Write-Log "Service not yet ready at $targetUrl, proceeding to launch tunnel anyway..."
        } else {
            Write-Log "Service is healthy and responding at $targetUrl."
        }

        # 4. Launch Cloudflare Tunnel and capture output
        Write-Log "Launching Cloudflare Tunnel targeting $targetUrl..."
        
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = $cloudflaredPath
        $pinfo.Arguments = "tunnel --url $targetUrl"
        $pinfo.RedirectStandardError = $true
        $pinfo.RedirectStandardOutput = $true
        $pinfo.UseShellExecute = $false
        $pinfo.CreateNoWindow = $true

        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $pinfo
        $process.Start() | Out-Null

        $tunnelUrlFound = $false

        # Read output stream asynchronously to capture trycloudflare.com URL
        while (-not $process.HasExited) {
            $line = $process.StandardError.ReadLine()
            if ($line) {
                Write-Log "[cloudflared] $line"
                if ($line -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
                    $url = $matches[1]
                    $banner = @"
============================================================
TEMPO PUBLIC TUNNEL IS LIVE!
============================================================
Public URL : $url
Local Target: $targetUrl
Started At : $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
============================================================
"@
                    Set-Content -Path $UrlFile -Value $banner -Force
                    Write-Log "PUBLIC TUNNEL URL DETECTED: $url (Written to $UrlFile)"
                    $tunnelUrlFound = $true
                }
            }
        }

        Write-Log "Cloudflare process exited with code $($process.ExitCode). Restarting in 5 seconds..."
        Start-Sleep -Seconds 5
    }
    catch {
        Write-Log "Exception in tunnel manager loop: $($_.Exception.Message)"
        Start-Sleep -Seconds 10
    }
}
