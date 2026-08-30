Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "          STARTING REPOSENSE PUBLIC SERVER & CLOUDFLARE TUNNEL" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Launching Backend & Frontend Services..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/c start.bat"

Write-Host "2. Starting Cloudflare Public Tunnel for Port 8000..." -ForegroundColor Yellow
Write-Host ""
Write-Host "-----------------------------------------------------------------------" -ForegroundColor Green
Write-Host " Look below for your Public URL ending in .trycloudflare.com" -ForegroundColor Green
Write-Host " Use that URL on remote laptops to push/clone repositories!" -ForegroundColor Green
Write-Host "-----------------------------------------------------------------------" -ForegroundColor Green
Write-Host ""

npx --yes cloudflared tunnel --url http://localhost:8000
