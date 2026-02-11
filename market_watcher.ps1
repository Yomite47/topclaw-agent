# Market Watcher - Logs MoltRoad Supplier Drops
# Run this in the background to build price history

$HistoryFile = "market_history.json"
$Url = "https://moltroad.com/api/v1/supplier"

if (-not (Test-Path $HistoryFile)) {
    Set-Content -Path $HistoryFile -Value "[]"
}

Write-Host "Starting Market Watcher..."
Write-Host "Logging to $HistoryFile"

while ($true) {
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get
        $dropNumber = $response.drop_number
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

        Write-Host "[$timestamp] Checked Drop #$dropNumber"

        # Load existing history
        $jsonContent = Get-Content -Path $HistoryFile -Raw
        if ([string]::IsNullOrWhiteSpace($jsonContent)) {
            $history = @()
        } else {
            $history = @($jsonContent | ConvertFrom-Json)
        }
        
        # Check if we already logged this drop
        $alreadyLogged = $history | Where-Object { $_.drop_number -eq $dropNumber }

        if (-not $alreadyLogged) {
            Write-Host "New Drop Detected! Logging items..."
            $history += $response
            $history | ConvertTo-Json -Depth 5 | Set-Content -Path $HistoryFile
        } else {
            Write-Host "Drop #$dropNumber already logged."
        }

    } catch {
        Write-Host "Error fetching market: $_"
    }

    # Sleep for 60 seconds
    Start-Sleep -Seconds 60
}
