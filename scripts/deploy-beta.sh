#!/bin/bash

# 베타 서버 배포 스크립트
# 사용법: ./scripts/deploy-beta.sh

set -e  # 에러 발생 시 중단

echo "🚀 베타 서버 배포를 시작합니다..."

# 설정 파일에서 정보 읽기 (없으면 직접 입력)
if [ -f "deploy-config.sh" ]; then
    source deploy-config.sh
else
    echo "⚠️  deploy-config.sh 파일이 없습니다. 직접 입력하세요."
    read -p "베타 서버 호스트 (예: beta.tourstream.kr 또는 IP): " BETA_HOST
    read -p "베타 서버 사용자명 (예: ubuntu): " BETA_USER
    read -p "베타 서버 경로 (예: /var/www/beta): " BETA_PATH
fi

echo ""
echo "📋 배포 정보:"
echo "   호스트: ${BETA_HOST}"
echo "   사용자: ${BETA_USER}"
echo "   경로: ${BETA_PATH}"
echo ""

# 확인
read -p "위 정보로 베타 서버에 배포하시겠습니까? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ 배포 취소됨"
    exit 1
fi

# 1. 빌드
echo ""
echo "📦 1단계: 빌드 중..."
npm run build:all

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

# 2. 베타 서버에 업로드
echo ""
echo "📤 2단계: 베타 서버에 업로드 중..."

# 메인 앱
echo "   - 메인 앱 업로드 중..."
scp -r packages/main/build/* ${BETA_USER}@${BETA_HOST}:${BETA_PATH}/main/

# 어드민 앱
echo "   - 어드민 앱 업로드 중..."
scp -r packages/admin/build/* ${BETA_USER}@${BETA_HOST}:${BETA_PATH}/admin/

# API 서버
echo "   - API 서버 업로드 중..."
scp -r packages/server/* ${BETA_USER}@${BETA_HOST}:${BETA_PATH}/api/

# 3. 환경 변수 파일 업로드
echo "   - 환경 변수 파일 업로드 중..."
if [ -f "packages/main/.env.beta" ]; then
    scp packages/main/.env.beta ${BETA_USER}@${BETA_HOST}:${BETA_PATH}/main/.env
fi
if [ -f "packages/admin/.env.beta" ]; then
    scp packages/admin/.env.beta ${BETA_USER}@${BETA_HOST}:${BETA_PATH}/admin/.env
fi
if [ -f "packages/server/.env.beta" ]; then
    scp packages/server/.env.beta ${BETA_USER}@${BETA_HOST}:${BETA_PATH}/api/.env
fi

# 4. 서버에서 설정 및 재시작
echo ""
echo "🔄 3단계: 서버 설정 및 재시작 중..."
ssh ${BETA_USER}@${BETA_HOST} << EOF
    cd ${BETA_PATH}/api
    
    # Node.js 의존성 설치
    if [ -f "package.json" ]; then
        echo "   - Node.js 의존성 설치 중..."
        npm install --production
    fi
    
    # 데이터 디렉토리 생성
    mkdir -p data/beta
    
    # PM2로 서버 재시작 (PM2가 설치되어 있다면)
    if command -v pm2 &> /dev/null; then
        echo "   - PM2로 서버 재시작 중..."
        pm2 restart tourstream-api-beta || pm2 start src/index.js --name tourstream-api-beta
    else
        echo "   ⚠️  PM2가 설치되어 있지 않습니다. 수동으로 서버를 시작해주세요."
        echo "   명령어: cd ${BETA_PATH}/api && node src/index.js"
    fi
EOF

echo ""
echo "✅ 베타 배포 완료!"
echo ""
echo "📝 다음 단계:"
echo "   1. 베타 사이트 접속 확인: https://beta.tourstream.kr"
echo "   2. 기능 테스트"
echo "   3. 문제 없으면 라이브 배포 진행"
