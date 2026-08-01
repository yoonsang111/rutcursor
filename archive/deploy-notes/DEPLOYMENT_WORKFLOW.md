# 배포 워크플로우 가이드

## 기본 배포 프로세스

### 1. 개발 → 베타 → 라이브 플로우

```
로컬 개발
    ↓
베타 서버 배포 (자동 또는 수동)
    ↓
베타에서 테스트
    ↓
라이브 서버 배포 (승인 후)
```

---

## 시나리오별 배포 방법

### 시나리오 A: 수동 배포 (초기 단계)

#### 1단계: 로컬에서 개발
```bash
# 로컬에서 개발 및 테스트
npm run admin:start
npm run main:start
npm run server:start
```

#### 2단계: 베타 서버에 배포
```bash
# 1. 코드 빌드
npm run build:all

# 2. 베타 서버에 업로드 (FTP, SCP, Git 등)
# 예: scp -r packages/main/build/* user@beta-server:/var/www/beta/
# 예: scp -r packages/admin/build/* user@beta-server:/var/www/beta-admin/
# 예: scp -r packages/server/* user@beta-server:/var/www/beta-api/
```

#### 3단계: 베타에서 테스트
- 베타 사이트에서 기능 테스트
- 버그 확인 및 수정
- 충분히 안정적일 때까지 반복

#### 4단계: 라이브 서버에 배포
```bash
# 베타와 동일한 빌드 파일을 라이브 서버에 업로드
# 예: scp -r packages/main/build/* user@live-server:/var/www/live/
```

---

### 시나리오 B: Git 기반 배포 (권장)

#### Git 브랜치 구조
```
main (또는 master)
  ├── production (라이브 환경)
  └── beta (베타 환경)
      └── develop (개발 브랜치)
```

#### 배포 프로세스

**1. 개발 단계**
```bash
# develop 브랜치에서 작업
git checkout develop
git pull origin develop

# 기능 개발
# ... 코드 작성 ...

# 커밋 및 푸시
git add .
git commit -m "새 기능 추가"
git push origin develop
```

**2. 베타 배포**
```bash
# beta 브랜치로 체크아웃
git checkout beta

# develop의 변경사항 병합
git merge develop

# 베타 서버에 배포 (자동 또는 수동)
git push origin beta

# 베타 서버에서 자동 배포 스크립트 실행
# 또는 수동으로:
ssh beta-server "cd /var/www && git pull origin beta && npm run build:all"
```

**3. 베타 테스트**
- 베타 사이트에서 테스트
- 문제 발견 시 develop에서 수정 후 다시 2단계 반복

**4. 라이브 배포**
```bash
# production 브랜치로 체크아웃
git checkout production

# beta의 변경사항 병합 (충분히 테스트 완료 후)
git merge beta

# 라이브 서버에 배포
git push origin production

# 라이브 서버에서 자동 배포 스크립트 실행
# 또는 수동으로:
ssh live-server "cd /var/www && git pull origin production && npm run build:all"
```

---

### 시나리오 C: 자동화 배포 (CI/CD)

#### GitHub Actions 예시

`.github/workflows/deploy-beta.yml`:
```yaml
name: Deploy to Beta

on:
  push:
    branches:
      - beta

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build:all
      
      - name: Deploy to Beta Server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.BETA_HOST }}
          username: ${{ secrets.BETA_USER }}
          key: ${{ secrets.BETA_SSH_KEY }}
          source: "packages/*/build,packages/server"
          target: "/var/www/beta"
```

`.github/workflows/deploy-production.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches:
      - production
  workflow_dispatch:  # 수동 실행도 가능

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build:all
      
      - name: Deploy to Production Server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          source: "packages/*/build,packages/server"
          target: "/var/www/production"
```

---

## 배포 스크립트 예시

### 배포 스크립트 생성

`scripts/deploy-beta.sh`:
```bash
#!/bin/bash

echo "🚀 베타 서버 배포 시작..."

# 1. 빌드
echo "📦 빌드 중..."
npm run build:all

# 2. 베타 서버에 업로드
echo "📤 베타 서버에 업로드 중..."
scp -r packages/main/build/* user@beta-server:/var/www/beta/
scp -r packages/admin/build/* user@beta-server:/var/www/beta-admin/
scp -r packages/server/* user@beta-server:/var/www/beta-api/

# 3. 서버 재시작
echo "🔄 서버 재시작 중..."
ssh user@beta-server "cd /var/www/beta-api && pm2 restart all"

echo "✅ 베타 배포 완료!"
```

`scripts/deploy-production.sh`:
```bash
#!/bin/bash

echo "🚀 라이브 서버 배포 시작..."

# 확인
read -p "⚠️  정말 라이브 서버에 배포하시겠습니까? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "❌ 배포 취소됨"
  exit 1
fi

# 1. 빌드
echo "📦 빌드 중..."
npm run build:all

# 2. 라이브 서버에 업로드
echo "📤 라이브 서버에 업로드 중..."
scp -r packages/main/build/* user@live-server:/var/www/live/
scp -r packages/admin/build/* user@live-server:/var/www/live-admin/
scp -r packages/server/* user@live-server:/var/www/live-api/

# 3. 서버 재시작
echo "🔄 서버 재시작 중..."
ssh user@live-server "cd /var/www/live-api && pm2 restart all"

echo "✅ 라이브 배포 완료!"
```

사용법:
```bash
# 실행 권한 부여
chmod +x scripts/deploy-beta.sh
chmod +x scripts/deploy-production.sh

# 베타 배포
./scripts/deploy-beta.sh

# 라이브 배포
./scripts/deploy-production.sh
```

---

## 환경별 설정 파일

### 베타 환경 설정

`packages/main/.env.beta`:
```env
REACT_APP_API_URL=https://beta-api.tourstream.kr/api
REACT_APP_ENV=beta
```

`packages/admin/.env.beta`:
```env
REACT_APP_API_URL=https://beta-api.tourstream.kr/api
REACT_APP_ENV=beta
```

`packages/server/.env.beta`:
```env
NODE_ENV=beta
PORT=3002
DATA_DIR=./data/beta
CORS_ORIGIN=https://beta.tourstream.kr,https://beta-admin.tourstream.kr
```

### 라이브 환경 설정

`packages/main/.env.production`:
```env
REACT_APP_API_URL=https://api.tourstream.kr/api
REACT_APP_ENV=production
```

`packages/admin/.env.production`:
```env
REACT_APP_API_URL=https://api.tourstream.kr/api
REACT_APP_ENV=production
```

`packages/server/.env.production`:
```env
NODE_ENV=production
PORT=3002
DATA_DIR=./data/production
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
```

---

## 배포 체크리스트

### 베타 배포 전
- [ ] 로컬에서 테스트 완료
- [ ] 코드 리뷰 완료 (필요시)
- [ ] 빌드 에러 없음 확인
- [ ] 환경 변수 설정 확인

### 베타 배포 후
- [ ] 베타 사이트 접속 확인
- [ ] 주요 기능 테스트
- [ ] API 연결 확인
- [ ] 에러 로그 확인

### 라이브 배포 전
- [ ] 베타에서 충분히 테스트 완료
- [ ] 버그 없음 확인
- [ ] 성능 테스트 완료
- [ ] 백업 완료
- [ ] 롤백 계획 수립

### 라이브 배포 후
- [ ] 라이브 사이트 접속 확인
- [ ] 주요 기능 테스트
- [ ] 모니터링 설정 확인
- [ ] 에러 로그 모니터링

---

## 롤백 방법

### 문제 발생 시 즉시 롤백

```bash
# 이전 버전으로 되돌리기
git checkout production
git reset --hard HEAD~1  # 또는 특정 커밋 해시
git push origin production --force

# 서버에서 재배포
ssh live-server "cd /var/www && git pull origin production && npm run build:all"
```

---

## 권장 사항

1. **항상 베타에서 먼저 테스트**: 라이브 배포 전 반드시 베타에서 충분히 테스트
2. **백업 필수**: 라이브 배포 전 데이터 백업
3. **점진적 배포**: 큰 변경사항은 작은 단위로 나눠서 배포
4. **모니터링**: 배포 후 즉시 모니터링 시작
5. **롤백 준비**: 문제 발생 시 빠른 롤백을 위한 준비

---

## 질문과 답변

**Q: 베타에서 테스트 후 바로 라이브에 올려도 되나요?**
A: 네, 하지만 충분히 테스트 완료 후에만 올리는 것을 권장합니다. 최소 1-2일 정도 베타에서 테스트하는 것이 안전합니다.

**Q: 베타와 라이브의 데이터는 분리되나요?**
A: 네, 환경 변수 `DATA_DIR`로 분리됩니다. 베타는 `data/beta`, 라이브는 `data/production`에 저장됩니다.

**Q: 자동 배포를 설정해야 하나요?**
A: 초기에는 수동 배포로 시작하고, 프로세스가 안정화되면 자동화를 고려하는 것을 권장합니다.
