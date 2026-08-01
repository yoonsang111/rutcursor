# SSH 접속 가이드

## 📋 확인된 정보

- **퍼블릭 IP**: `43.201.66.181` ✅
- **키 파일 위치**: 바탕화면 ✅

---

## 🔍 키 파일 경로 확인

### macOS에서 바탕화면 경로

**일반적인 경로:**
- `/Users/iyunsang/Desktop/tour-stream-api-key.pem`
- 또는 `~/Desktop/tour-stream-api-key.pem`

### 키 파일 이름 확인

바탕화면에 있는 키 파일의 **정확한 이름**을 알려주세요:
- `tour-stream-api-key.pem`?
- 다른 이름?

---

## 🚀 SSH 접속 준비

### 키 파일 권한 설정

터미널에서 실행:

```bash
# 키 파일 경로로 이동
cd ~/Desktop

# 키 파일 이름 확인
ls *.pem

# 권한 설정 (파일명을 실제 이름으로 변경)
chmod 400 tour-stream-api-key.pem
```

### SSH 접속 테스트

```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181
```

---

## 💡 빠른 확인 방법

**터미널에서 실행:**

```bash
# 바탕화면의 .pem 파일 찾기
ls ~/Desktop/*.pem

# 또는 전체 경로 확인
ls -la ~/Desktop/*.pem
```

**결과 예시:**
```
/Users/iyunsang/Desktop/tour-stream-api-key.pem
```

---

## 📝 다음 단계

1. **키 파일 이름 확인**
   - 바탕화면에서 `.pem` 파일 이름 확인
   - 알려주세요!

2. **전체 경로 알려주기**
   - 예: `/Users/iyunsang/Desktop/tour-stream-api-key.pem`
   - 또는 파일명만 알려주셔도 됩니다

3. **제가 SSH 접속 진행**
   - 키 파일 경로 확인 후
   - SSH 접속 및 API 서버 설정 진행

---

## 🎯 지금 해야 할 일

**바탕화면에서:**
1. `.pem` 파일 찾기
2. 파일 이름 확인
3. 알려주세요!

예: `tour-stream-api-key.pem` 또는 다른 이름
