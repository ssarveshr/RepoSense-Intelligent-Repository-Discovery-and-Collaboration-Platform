@echo off
echo =======================================================================
echo          STARTING REPOSENSE PUBLIC SERVER & CLOUDFLARE TUNNEL
echo =======================================================================
echo.

echo 1. Launching Backend & Frontend Services...
start "RepoSense Platform" cmd /c "start.bat"

echo 2. Starting Cloudflare Public Tunnel for Port 8000...
echo.
echo -----------------------------------------------------------------------
echo  Look below for your Public URL ending in .trycloudflare.com
echo  Use that URL on remote laptops to push/clone repositories!
echo -----------------------------------------------------------------------
echo.

npx --yes cloudflared tunnel --url http://localhost:8000

pause
