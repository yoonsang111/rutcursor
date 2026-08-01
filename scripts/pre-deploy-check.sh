#!/bin/bash
# 배포 전 자동 점검 스크립트
# 사용법: ./scripts/pre-deploy-check.sh

set -e

echo "🔍 배포 전 자동 점검을 시작합니다..."
echo ""

ERRORS=0
WARNINGS=0
BUILD_DIR_MAIN="packages/main/build"
BUILD_DIR_ADMIN="packages/admin/build"
PROD_API="https://api.tourstream.kr/api"
MIN_PRODUCTS=10  # 운영에서 최소 이 수만큼 상품이 있어야 정상

# --- 1. 빌드 결과물 존재 확인 ---
echo "📁 [1/7] 빌드 결과물 확인..."

if [ ! -d "$BUILD_DIR_MAIN" ]; then
  echo "  ❌ packages/main/build 디렉토리가 없습니다. 빌드를 먼저 실행하세요."
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ packages/main/build 존재"
fi

if [ ! -d "$BUILD_DIR_ADMIN" ]; then
  echo "  ❌ packages/admin/build 디렉토리가 없습니다."
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ packages/admin/build 존재"
fi

# --- 2. 빌드 번들 API URL 검증 (상품 표시 핵심 체크) ---
echo ""
echo "🔗 [2/7] 빌드 번들 API URL 검증 (localhost가 주 URL로 박히면 운영에서 상품 안 나옴)..."

MAIN_JS=$(ls "$BUILD_DIR_MAIN"/static/js/main.*.js 2>/dev/null | grep -v '\.map$' | head -1)
if [ -z "$MAIN_JS" ]; then
  echo "  ❌ main.*.js 번들 파일을 찾을 수 없습니다."
  ERRORS=$((ERRORS + 1))
else
  echo "  📦 번들: $MAIN_JS"

  # 번들에서 REACT_APP_API_URL이 어떤 값으로 구워졌는지 추출
  # resolveApiBaseUrl 함수 안에서 envUrl이 먼저 반환되는 값
  BAKED_URL=$(grep -o 'REACT_APP_API_URL[^"]*"[^"]*"' "$MAIN_JS" 2>/dev/null | grep -o '"[^"]*"' | head -1 | tr -d '"')

  LOCALHOST_COUNT=$(grep -o 'localhost:3102' "$MAIN_JS" 2>/dev/null | wc -l | tr -d ' ')
  PROD_COUNT=$(grep -o 'api\.tourstream\.kr' "$MAIN_JS" 2>/dev/null | wc -l | tr -d ' ')

  echo "  api.tourstream.kr 출현: ${PROD_COUNT}회 / localhost:3102 출현: ${LOCALHOST_COUNT}회"

  # 운영 번들에서 localhost가 prod보다 많으면 잘못된 빌드
  if [ "$LOCALHOST_COUNT" -gt "$PROD_COUNT" ]; then
    echo "  ❌ 번들에 localhost:3102가 운영 URL보다 많습니다!"
    echo "     → 'npm run build:production'으로 빌드하지 않고 일반 'npm run build'로 빌드한 것 같습니다."
    echo "     → 운영에서 상품이 절대 나오지 않습니다. 반드시 재빌드 후 배포하세요."
    ERRORS=$((ERRORS + 1))
  elif [ "$LOCALHOST_COUNT" -gt 0 ]; then
    echo "  ✅ localhost는 폴백 상수로만 존재 (주 URL은 운영 API)"
  else
    echo "  ✅ localhost:3102 없음 (운영 URL만 사용)"
  fi

  if [ "$PROD_COUNT" -ge 1 ]; then
    echo "  ✅ 운영 API URL 확인됨"
  else
    echo "  ❌ 번들에 운영 API URL이 없습니다!"
    ERRORS=$((ERRORS + 1))
  fi
fi

# --- 3. 다운로드 유발 경로 점검 (확장자 없는 파일) ---
echo ""
echo "📄 [3/7] Content-Type 문제 파일 점검 (확장자 없는 파일 → 다운로드 유발)..."

if [ -d "$BUILD_DIR_MAIN" ]; then
  BARE_FILES=$(find "$BUILD_DIR_MAIN" -maxdepth 3 -type f ! -name "*.*" 2>/dev/null | head -20)
  if [ -n "$BARE_FILES" ]; then
    echo "  ⚠️  확장자 없는 파일 발견 (다운로드 유발 가능):"
    echo "$BARE_FILES" | while read -r f; do echo "     $f"; done
    WARNINGS=$((WARNINGS + 1))
  else
    echo "  ✅ 확장자 없는 파일 없음"
  fi
fi

# SEO route shells이 index.html로 생성되었는지 확인
echo "  📋 SEO route 구조 점검..."
ROUTE_DIRS=("products" "popular")
for route in "${ROUTE_DIRS[@]}"; do
  if [ -d "$BUILD_DIR_MAIN/$route" ]; then
    if [ -f "$BUILD_DIR_MAIN/$route/index.html" ]; then
      echo "  ✅ $route/index.html 존재"
    else
      echo "  ❌ $route/index.html 없음 (seo:generate-shells 실행 필요)"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ⚠️  $route 디렉토리 없음 (seo:generate-shells 미실행?)"
    WARNINGS=$((WARNINGS + 1))
  fi
done

# --- 4. 메인 index.html 메타태그 점검 ---
echo ""
echo "🏷️  [4/7] 메타태그 점검..."

MAIN_INDEX="$BUILD_DIR_MAIN/index.html"
if [ -f "$MAIN_INDEX" ]; then
  # title 확인
  TITLE=$(grep -o '<title>[^<]*</title>' "$MAIN_INDEX" | head -1)
  if [ -n "$TITLE" ]; then
    echo "  ✅ title: $TITLE"
  else
    echo "  ❌ <title> 태그 없음"
    ERRORS=$((ERRORS + 1))
  fi

  # description 확인
  if grep -q 'name="description"' "$MAIN_INDEX"; then
    echo "  ✅ meta description 존재"
  else
    echo "  ❌ meta description 없음"
    ERRORS=$((ERRORS + 1))
  fi

  # og:title 확인
  if grep -q 'og:title' "$MAIN_INDEX"; then
    echo "  ✅ og:title 존재"
  else
    echo "  ⚠️  og:title 없음"
    WARNINGS=$((WARNINGS + 1))
  fi

  # canonical 확인
  if grep -q 'rel="canonical"' "$MAIN_INDEX"; then
    echo "  ✅ canonical 존재"
  else
    echo "  ⚠️  canonical 없음"
    WARNINGS=$((WARNINGS + 1))
  fi

  # og:image 깨진 URL 경고
  if grep -q 'og:image' "$MAIN_INDEX"; then
    OG_IMAGE_URL=$(grep -o 'og:image.*content="[^"]*"' "$MAIN_INDEX" | grep -o 'content="[^"]*"' | head -1)
    echo "  ⚠️  og:image 존재: $OG_IMAGE_URL (실제 이미지인지 확인 필요)"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "  ℹ️  og:image 없음 (설정 시 실제 이미지 URL 확인 필요)"
  fi
else
  echo "  ❌ packages/main/build/index.html 없음"
  ERRORS=$((ERRORS + 1))
fi

# --- 5. 운영 API 상품 수 검증 (메인 페이지 상품 표시 핵심 체크) ---
echo ""
echo "🛍️  [5/7] 운영 API 상품 수 검증 (최소 ${MIN_PRODUCTS}개 이상이어야 정상)..."

if command -v python3 &>/dev/null; then
  API_RESULT=$(curl -s --max-time 10 "${PROD_API}/products" 2>/dev/null)
  if [ -z "$API_RESULT" ]; then
    echo "  ❌ 운영 API 응답 없음 (${PROD_API}/products)"
    ERRORS=$((ERRORS + 1))
  else
    PRODUCT_COUNT=$(echo "$API_RESULT" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        print(len(data))
    else:
        print(-1)
except:
    print(-1)
" 2>/dev/null)

    if [ "$PRODUCT_COUNT" = "-1" ]; then
      echo "  ❌ API 응답이 JSON 배열이 아닙니다. 서버 오류 가능성 있음."
      ERRORS=$((ERRORS + 1))
    elif [ "$PRODUCT_COUNT" -lt "$MIN_PRODUCTS" ]; then
      echo "  ❌ 운영 API 상품 수 부족: ${PRODUCT_COUNT}개 (최소 ${MIN_PRODUCTS}개 필요)"
      echo "     → 상품 데이터가 비어 있거나 API 서버가 정상 동작하지 않습니다."
      ERRORS=$((ERRORS + 1))
    else
      echo "  ✅ 운영 API 상품 ${PRODUCT_COUNT}개 확인됨"
    fi

    # 카테고리 / 지역 체크
    CAT_RESULT=$(curl -s --max-time 5 "${PROD_API}/categories" 2>/dev/null)
    CAT_COUNT=$(echo "$CAT_RESULT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(len(d.get('mainCategories', [])))
except:
    print(0)
" 2>/dev/null)
    if [ "${CAT_COUNT:-0}" -gt 0 ]; then
      echo "  ✅ 카테고리 ${CAT_COUNT}개 확인됨"
    else
      echo "  ⚠️  카테고리 API 응답 없음 또는 0개 (메인 필터가 빈 상태로 표시될 수 있음)"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
else
  echo "  ⚠️  python3 없음, 상품 수 검증 건너뜀"
  WARNINGS=$((WARNINGS + 1))
fi

# --- 6. 운영 사이트 meta 점검 (네트워크 있을 때만) ---
echo ""
echo "🌐 [6/7] 운영 사이트 점검 (tourstream.kr)..."

if curl -s --max-time 5 "https://tourstream.kr" > /tmp/ts_check_home.html 2>/dev/null; then
  # title
  LIVE_TITLE=$(grep -o '<title>[^<]*</title>' /tmp/ts_check_home.html | head -1)
  echo "  운영 title: ${LIVE_TITLE:-없음}"

  # og:image 체크
  if grep -q 'og:image' /tmp/ts_check_home.html; then
    LIVE_OG_IMAGE=$(grep -o 'og:image.*content="[^"]*"' /tmp/ts_check_home.html | grep -o 'content="[^"]*"' | head -1)
    echo "  운영 og:image: $LIVE_OG_IMAGE"
    # og:image URL로 실제 이미지인지 확인
    OG_IMG_URL=$(echo "$LIVE_OG_IMAGE" | sed 's/content="//;s/"//')
    if [ -n "$OG_IMG_URL" ]; then
      IMG_CONTENT_TYPE=$(curl -sI --max-time 5 "$OG_IMG_URL" 2>/dev/null | grep -i '^content-type:' | head -1)
      if echo "$IMG_CONTENT_TYPE" | grep -qi 'image/'; then
        echo "  ✅ og:image Content-Type: OK ($IMG_CONTENT_TYPE)"
      else
        echo "  ❌ og:image가 이미지가 아닙니다: $IMG_CONTENT_TYPE"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  else
    echo "  ℹ️  운영 og:image 없음"
  fi

  # 새로고침 다운로드 체크 (/products)
  PRODUCTS_CT=$(curl -sI --max-time 5 "https://tourstream.kr/products" 2>/dev/null | grep -i '^content-type:' | head -1)
  if echo "$PRODUCTS_CT" | grep -qi 'text/html'; then
    echo "  ✅ /products Content-Type: HTML (정상)"
  elif [ -z "$PRODUCTS_CT" ]; then
    echo "  ⚠️  /products 응답 없음 (CloudFront 캐시 또는 네트워크 확인)"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "  ❌ /products Content-Type 이상: $PRODUCTS_CT (다운로드 유발 가능)"
    ERRORS=$((ERRORS + 1))
  fi

  rm -f /tmp/ts_check_home.html
else
  echo "  ⚠️  운영 사이트 접속 불가 (네트워크 확인 또는 오프라인 환경)"
  WARNINGS=$((WARNINGS + 1))
fi

# --- 7. sitemap 중복 URL 점검 ---
echo ""
echo "🗺️  [7/7] Sitemap 중복 점검..."

if curl -s --max-time 10 "https://api.tourstream.kr/sitemap.xml" > /tmp/ts_sitemap.xml 2>/dev/null; then
  TOTAL_LOCS=$(grep -c '<loc>' /tmp/ts_sitemap.xml 2>/dev/null || echo 0)
  UNIQUE_LOCS=$(grep -o '<loc>[^<]*</loc>' /tmp/ts_sitemap.xml 2>/dev/null | sort -u | wc -l | tr -d ' ')
  DUPLICATE_COUNT=$((TOTAL_LOCS - UNIQUE_LOCS))

  echo "  전체 URL: $TOTAL_LOCS개, 중복 제거 후: $UNIQUE_LOCS개"
  if [ "$DUPLICATE_COUNT" -gt 0 ]; then
    echo "  ❌ 중복 URL $DUPLICATE_COUNT개 발견!"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ 중복 URL 없음"
  fi
  rm -f /tmp/ts_sitemap.xml
else
  echo "  ⚠️  Sitemap 접근 불가 (API 서버 확인)"
  WARNINGS=$((WARNINGS + 1))
fi

# --- 최종 결과 ---
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -gt 0 ]; then
  echo "❌ 점검 실패: 오류 ${ERRORS}개, 경고 ${WARNINGS}개"
  echo "   배포 전 오류를 수정하세요."
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "⚠️  점검 완료: 경고 ${WARNINGS}개 (오류 없음)"
  echo "   경고 항목을 확인 후 배포하세요."
  exit 0
else
  echo "✅ 점검 완료: 모든 항목 정상"
  exit 0
fi
