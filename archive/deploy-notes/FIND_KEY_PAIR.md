# 키 페어 파일 찾기

## ✅ 확인된 정보

- **키 페어 이름**: `tour-pem-key`
- **파일명 예상**: `tour-pem-key.pem`

---

## 🔍 키 파일 찾기

### 터미널에서 실행할 명령어

```bash
# 1. 홈 디렉토리에서 찾기
find ~ -name "tour-pem-key.pem" 2>/dev/null

# 2. Downloads 폴더 확인
ls -la ~/Downloads/tour-pem-key.pem

# 3. .ssh 폴더 확인
ls -la ~/.ssh/tour-pem-key.pem

# 4. 전체에서 .pem 파일 찾기
find ~ -name "*.pem" 2>/dev/null
```

---

## 📋 찾은 후 할 일

### 키 파일을 찾았으면:

1. **파일 위치 확인**
   - 예: `~/Downloads/tour-pem-key.pem`
   - 또는: `~/.ssh/tour-pem-key.pem`

2. **권한 설정** (중요!)
   ```bash
   chmod 400 ~/Downloads/tour-pem-key.pem
   # 또는
   chmod 400 ~/.ssh/tour-pem-key.pem
   ```

3. **SSH 접속 테스트**
   ```bash
   ssh -i ~/Downloads/tour-pem-key.pem ubuntu@13.209.15.252
   ```

### 키 파일을 찾지 못했으면:

**옵션 1: EC2 콘솔에서 다시 다운로드**
- EC2 → 키 페어
- `tour-pem-key` 선택
- "작업" → "다운로드" (가능한 경우)

**옵션 2: 새 키 페어 생성**
- 새 키 페어 생성
- 인스턴스 재생성 필요 (기존 인스턴스에는 키 추가 불가)

**옵션 3: Session Manager 사용**
- 키 파일 없이 접속 가능
- AWS CLI 필요

---

## 🚀 다음 단계

키 파일을 찾았는지 알려주세요:
- [ ] 찾았음 → 파일 위치: `_________________`
- [ ] 못 찾았음 → 다른 방법 사용
