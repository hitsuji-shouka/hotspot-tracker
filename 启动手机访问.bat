@echo off
chcp 65001 >nul
title GitHub 热点仓库追踪站 - 公网访问服务
cd /d "%~dp0"

echo 正在启动网站服务 (端口 8080)...
start "" /min node server.mjs 8080
timeout /t 3 /nobreak >nul

echo.
echo 正在启动公网隧道，请稍等...
echo 启动后在下方找到 https://xxxx.trycloudflare.com 就是你的公网地址
echo （手机和电脑都能访问，每次重启地址会变化）
echo.
cloudflared.exe tunnel --url http://localhost:8080 --no-autoupdate
pause
