#!/bin/bash

# API 서버 배포 스크립트
# 서버 터미널에서 실행하세요

set -e  # 오류 발생 시 중단

echo "🚀 API 서버 배포를 시작합니다..."

# 1단계: 시스템 업데이트
echo "📦 1단계: 시스템 업데이트 중..."
sudo apt update

# 2단계: Node.js 설치
echo "📦 2단계: Node.js 설치 중..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js가 이미 설치되어 있습니다: $(node --version)"
fi

# 3단계: PM2 설치
echo "📦 3단계: PM2 설치 중..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo "✅ PM2가 이미 설치되어 있습니다: $(pm2 --version)"
fi

# 4단계: Nginx 설치
echo "📦 4단계: Nginx 설치 중..."
if ! command -v nginx &> /dev/null; then
    sudo apt install nginx -y
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    echo "✅ Nginx가 이미 설치되어 있습니다"
fi

# 5단계: 디렉토리 생성
echo "📦 5단계: 디렉토리 생성 중..."
sudo mkdir -p /var/www/api
sudo mkdir -p /var/www/api/data/production
sudo mkdir -p /var/www/api/logs
sudo chown -R ubuntu:ubuntu /var/www/api

echo "✅ 배포 준비가 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. 코드를 /var/www/api 디렉토리에 업로드하세요"
echo "2. 환경 변수 파일(.env)을 생성하세요"
echo "3. PM2로 서버를 시작하세요"
