# Run with: powershell -ExecutionPolicy Bypass -File .\start-free-windows.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Install Node.js 20 or newer, then reopen PowerShell."
}
$terminal = (Read-Host "LT100 IMEI / Device ID (4-15 digits)").Trim()
if ($terminal -notmatch '^[0-9]{4,15}$') {
  throw "Enter the LT100 device ID exactly as reported by the tracker (4-15 digits)."
}
$secret = Read-Host "ZEWAY IOT Supabase server secret key (hidden, press Enter to skip database publish)" -AsSecureString
$value = ([pscredential]::new("receiver",$secret)).GetNetworkCredential().Password
if ($value) {
  $env:SUPABASE_URL = "https://wllrbpxmfhbdobexiswl.supabase.co"
  $env:SUPABASE_SECRET_KEY = $value
} else {
  Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_SECRET_KEY -ErrorAction SilentlyContinue
}
$env:TERMINAL_IDS = $terminal
$env:KINGWO_UDP_PORT = "7008"
$env:PORT = "3000"
$bytes = New-Object byte[] 32
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($bytes)
$random.Dispose()
$env:API_TOKEN = -join ($bytes | ForEach-Object { $_.ToString("x2") })
$value = $null
Write-Host "LT100 Kingwo HQ20 receiver starting on UDP port 7008."
Write-Host "Keep this PowerShell window and the Playit agent running."
node server.js
