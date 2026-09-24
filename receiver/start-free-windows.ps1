# Run with: powershell -ExecutionPolicy Bypass -File .\start-free-windows.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Install Node.js 20 or newer, then reopen PowerShell."
}
$terminal = (Read-Host "MT100 JT808 terminal ID (12 or 20 digits)").Trim()
if ($terminal -notmatch '^([0-9]{12}|[0-9]{20})$') {
  throw "JT808 terminal ID must have 12 or 20 digits. IMEI is not the terminal ID."
}
$secret = Read-Host "ZEWAY IOT Supabase server secret key (hidden)" -AsSecureString
$value = ([pscredential]::new("receiver",$secret)).GetNetworkCredential().Password
if (-not $value) { throw "Server secret key is required to save GPS locations." }
$env:SUPABASE_URL = "https://wllrbpxmfhbdobexiswl.supabase.co"
$env:SUPABASE_SECRET_KEY = $value
$env:TERMINAL_IDS = $terminal
$env:UDP_PORT = "7008"
$env:TCP_PORT = "7008"
$env:PORT = "3000"
$bytes = New-Object byte[] 32
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($bytes)
$random.Dispose()
$env:API_TOKEN = -join ($bytes | ForEach-Object { $_.ToString("x2") })
$value = $null
Write-Host "Receiver starting on UDP port 7008. Keep this window and the Playit agent running."
node server.js
