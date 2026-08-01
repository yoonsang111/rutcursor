#!/bin/bash
# 서버 터미널에서 실행하세요

echo "=== 서버 상태 확인 ==="
echo ""
echo "1. 기본 정보:"
hostname
whoami
pwd
echo ""

echo "2. 설치된 소프트웨어:"
echo -n "Node.js: "
node --version 2>/dev/null || echo "미설치"
echo -n "PM2: "
pm2 --version 2>/dev/null || echo "미설치"
echo -n "Nginx: "
nginx -v 2>&1 | head -1 || echo "미설치"
echo ""

echo "3. API 디렉토리:"
ls -la /var/www/api 2>/dev/null || echo "API 디렉토리 없음"
echo ""

echo "4. PM2 프로세스:"
pm2 list 2>/dev/null || echo "PM2 프로세스 없음"
echo ""

echo "✅ 확인 완료!"
