#!/bin/bash

# 라이브 서버 배포 스크립트
# 사용법: ./scripts/deploy-production.sh

set -e  # 에러 발생 시 중단

echo "🚀 라이브 서버 배포를 시작합니다..."

# 설정 파일에서 정보 읽기 (없으면 직접 입력)
if [ -f "deploy-config.sh" ]; then
    source deploy-config.sh
else
    echo "⚠️  deploy-config.sh 파일이 없습니다. 직접 입력하세요."
    read -p "라이브 서버 호스트 (예: tourstream.kr 또는 IP): " PRODUCTION_HOST
    read -p "라이브 서버 사용자명 (예: ubuntu): " PRODUCTION_USER
    read -p "라이브 서버 경로 (예: /var/www/production): " PRODUCTION_PATH
fi

SSH_OPTS="-o StrictHostKeyChecking=accept-new"
if [ -n "${SSH_KEY_FILE}" ]; then
    SSH_OPTS="${SSH_OPTS} -i ${SSH_KEY_FILE}"
fi

echo ""
echo "📋 배포 정보:"
echo "   호스트: ${PRODUCTION_HOST}"
echo "   사용자: ${PRODUCTION_USER}"
echo "   경로: ${PRODUCTION_PATH}"
echo ""
echo "⚠️  ⚠️  ⚠️  경고: 라이브 서버에 배포합니다! ⚠️  ⚠️  ⚠️"
echo ""

# 확인 (2번 확인)
read -p "정말 라이브 서버에 배포하시겠습니까? (yes/no): " confirm1
if [ "$confirm1" != "yes" ]; then
    echo "❌ 배포 취소됨"
    exit 1
fi

read -p "다시 한번 확인합니다. 계속하시겠습니까? (yes/no): " confirm2
if [ "$confirm2" != "yes" ]; then
    echo "❌ 배포 취소됨"
    exit 1
fi

# 1. 빌드 (운영 환경 강제)
echo ""
echo "📦 1단계: 빌드 중..."
REACT_APP_API_URL=https://api.tourstream.kr/api npm run build --workspace=packages/main
REACT_APP_API_URL=https://api.tourstream.kr/api npm run seo:generate-shells --workspace=packages/main
REACT_APP_API_URL=https://api.tourstream.kr/api npm run build --workspace=packages/admin
npm run build --workspace=packages/shared
npm run build --workspace=packages/server

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

# 1.5. 배포 전 자동 점검
echo ""
echo "🔍 1.5단계: 배포 전 자동 점검..."
if ! bash scripts/pre-deploy-check.sh; then
    echo ""
    echo "❌ 자동 점검에서 오류가 발견되었습니다. 배포를 중단합니다."
    echo "   위의 오류를 수정하고 다시 시도하세요."
    exit 1
fi

# 2. 라이브 서버에 업로드
echo ""
echo "📤 2단계: 라이브 서버에 업로드 중..."

# ── 메인 앱: S3 + CloudFront 배포 ──────────────────────────────────────
MAIN_S3_BUCKET="tourstream-website-1758807132"
MAIN_CF_DIST="E1MZSJK9IGD3MP"

echo "   - 메인 앱: S3 정적 파일 업로드 중 (긴 캐시)..."
aws s3 sync packages/main/build/ s3://${MAIN_S3_BUCKET}/ \
  --delete \
  --cache-control "max-age=31536000,public" \
  --exclude "index.html" \
  --exclude "*/index.html" \
  --exclude "sitemap.xml" \
  --exclude "robots.txt" \
  --exclude "asset-manifest.json"

echo "   - 메인 앱: S3 HTML/설정 파일 업로드 중 (캐시 비활성화)..."
aws s3 sync packages/main/build/ s3://${MAIN_S3_BUCKET}/ \
  --exclude "static/*" \
  --exclude "ads.txt" \
  --cache-control "no-cache,no-store,must-revalidate"

echo "   - 메인 앱: CloudFront 캐시 무효화 중..."
aws cloudfront create-invalidation \
  --distribution-id ${MAIN_CF_DIST} \
  --paths "/*" > /dev/null

# ── 어드민 앱: EC2 서버 배포 ────────────────────────────────────────────
# 원격 배포 디렉토리 보장
ssh ${SSH_OPTS} ${PRODUCTION_USER}@${PRODUCTION_HOST} "sudo mkdir -p ${PRODUCTION_PATH}/admin ${PRODUCTION_PATH}/api && sudo chown -R ${PRODUCTION_USER}:${PRODUCTION_USER} ${PRODUCTION_PATH}/admin ${PRODUCTION_PATH}/api"

echo "   - 어드민 앱 EC2 업로드 중..."
scp ${SSH_OPTS} -r packages/admin/build/* ${PRODUCTION_USER}@${PRODUCTION_HOST}:${PRODUCTION_PATH}/admin/

# API 서버 (데이터 디렉토리 제외)
echo "   - API 서버 업로드 중 (데이터 제외)..."
# rsync 사용 (권장) 또는 수동으로 파일 업로드
if command -v rsync &> /dev/null; then
    rsync -av -e "ssh ${SSH_OPTS}" --exclude='data' --exclude='node_modules' packages/server/ ${PRODUCTION_USER}@${PRODUCTION_HOST}:${PRODUCTION_PATH}/api/
else
    # rsync가 없으면 수동으로 필요한 파일만 업로드
    echo "   - rsync가 없어 수동 업로드 중..."
    scp ${SSH_OPTS} -r packages/server/src ${PRODUCTION_USER}@${PRODUCTION_HOST}:${PRODUCTION_PATH}/api/
    scp ${SSH_OPTS} packages/server/package.json ${PRODUCTION_USER}@${PRODUCTION_HOST}:${PRODUCTION_PATH}/api/
    if [ -f "packages/server/README.md" ]; then
        scp ${SSH_OPTS} packages/server/README.md ${PRODUCTION_USER}@${PRODUCTION_HOST}:${PRODUCTION_PATH}/api/
    fi
fi

# 3. 환경 변수 파일 업로드
echo "   - 환경 변수 파일 업로드 중..."
if [ -f "packages/main/.env.production" ]; then
    scp ${SSH_OPTS} packages/main/.env.production ${PRODUCTION_USER}@${PRODUCTION_HOST}:${PRODUCTION_PATH}/main/.env
fi
if [ -f "packages/admin/.env.production" ]; then
    scp ${SSH_OPTS} packages/admin/.env.production ${PRODUCTION_USER}@${PRODUCTION_HOST}:${PRODUCTION_PATH}/admin/.env
fi
if [ -f "packages/server/.env.production" ]; then
    scp ${SSH_OPTS} packages/server/.env.production ${PRODUCTION_USER}@${PRODUCTION_HOST}:${PRODUCTION_PATH}/api/.env
fi

# 4. 서버에서 설정 및 재시작
echo ""
echo "🔄 3단계: 서버 설정 및 재시작 중..."
ssh ${SSH_OPTS} ${PRODUCTION_USER}@${PRODUCTION_HOST} << EOF
    cd ${PRODUCTION_PATH}/api
    
    # Node.js 의존성 설치
    if [ -f "package.json" ]; then
        echo "   - Node.js 의존성 설치 중..."
        npm install --production
    fi
    
    # 데이터 디렉토리 생성
    mkdir -p data/production
    
    # PM2로 서버 재시작 (PM2가 설치되어 있다면)
    if command -v pm2 &> /dev/null; then
        echo "   - PM2로 서버 재시작 중..."
        # ecosystem 설정(env/DATA_DIR)을 기준으로 단일 프로세스 운용
        if [ -f "ecosystem.config.cjs" ]; then
            pm2 start ecosystem.config.cjs --update-env
            pm2 save
        else
            pm2 restart tourstream-api || pm2 start src/index.js --name tourstream-api
            pm2 save
        fi
    else
        echo "   ⚠️  PM2가 설치되어 있지 않습니다. 수동으로 서버를 시작해주세요."
        echo "   명령어: cd ${PRODUCTION_PATH}/api && node src/index.js"
    fi
EOF

echo ""
echo "✅ 라이브 배포 완료!"
echo ""
echo "📝 다음 단계:"
echo "   1. 라이브 사이트 접속 확인: https://tourstream.kr"
echo "   2. 주요 기능 테스트"
echo "   3. 모니터링 시작"
