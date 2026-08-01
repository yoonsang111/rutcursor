# 어드민 배포 가이드 (서브도메인 방식)

## 🎯 선택: 서브도메인 방식 (`admin.tourstream.kr`)

### 이유
- ✅ 어디서든 접근 가능 (집, 사무실, 카페 등)
- ✅ 기본 인증으로 보안 강화
- ✅ 월 $1-2로 저렴
- ✅ 메인과 완전 분리

---

## 📋 배포 단계

### 1단계: DNS 설정

**Route 53 또는 도메인 제공업체에서:**
```
admin.tourstream.kr  →  CNAME  →  [CloudFront 배포 URL]
```

또는
```
admin.tourstream.kr  →  A 레코드  →  [CloudFront IP]
```

---

### 2단계: S3 버킷 생성

```bash
# AWS CLI로 생성
aws s3 mb s3://tourstream-admin --region ap-northeast-2

# 정적 웹사이트 호스팅 활성화
aws s3 website s3://tourstream-admin \
  --index-document index.html \
  --error-document index.html

# 버킷 정책 설정 (공개 읽기)
aws s3api put-bucket-policy --bucket tourstream-admin --policy file://bucket-policy.json
```

**bucket-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tourstream-admin/*"
    }
  ]
}
```

---

### 3단계: 어드민 앱 빌드

```bash
cd packages/admin
npm run build:production
```

빌드된 파일은 `packages/admin/build/` 디렉토리에 생성됩니다.

---

### 4단계: S3에 업로드

```bash
# 빌드된 파일을 S3에 업로드
aws s3 sync packages/admin/build/ s3://tourstream-admin/ --delete

# 또는 수동으로 AWS 콘솔에서 업로드
```

---

### 5단계: CloudFront 배포 생성

#### 5.1 기본 설정
- **Origin Domain**: `tourstream-admin.s3.amazonaws.com`
- **Origin Path**: (비워둠)
- **Origin Access**: Public (S3 버킷 정책 사용)

#### 5.2 동작(Behaviors) 설정
- **Path Pattern**: `*` (Default)
- **Viewer Protocol Policy**: `Redirect HTTP to HTTPS`
- **Allowed HTTP Methods**: `GET, HEAD, OPTIONS`
- **Cache Policy**: `CachingOptimized` 또는 커스텀
- **Origin Request Policy**: `CORS-S3Origin`

#### 5.3 에러 페이지 설정
- **404 에러**: `/index.html` (200 상태 코드)
  - SPA 라우팅을 위해 필요

#### 5.4 도메인 설정
- **Alternate Domain Names (CNAMEs)**: `admin.tourstream.kr`

---

### 6단계: SSL 인증서 발급 (ACM)

#### 6.1 인증서 요청
1. AWS Certificate Manager (ACM) 콘솔 접속
2. **us-east-1** 리전 선택 (CloudFront는 us-east-1 인증서만 사용)
3. "인증서 요청" 클릭
4. 도메인 이름: `admin.tourstream.kr`
5. DNS 검증 선택
6. Route 53에 레코드 자동 생성 (또는 수동 추가)

#### 6.2 CloudFront에 인증서 연결
- CloudFront 배포 편집
- **SSL Certificate**: "Custom SSL Certificate" 선택
- 발급받은 인증서 선택

---

### 7단계: 기본 인증 설정 (보안 강화)

#### 7.1 CloudFront Functions 사용 (간단)

**기본 인증 함수 생성:**
```javascript
function handler(event) {
    var request = event.request;
    var headers = request.headers;
    
    // 기본 인증 정보
    var authUser = 'admin';
    var authPass = 'your-secure-password';
    
    // Authorization 헤더 확인
    var authString = 'Basic ' + btoa(authUser + ':' + authPass);
    
    if (headers.authorization && headers.authorization.value === authString) {
        return request;
    }
    
    // 인증 실패 시 401 응답
    return {
        statusCode: 401,
        statusDescription: 'Unauthorized',
        headers: {
            'www-authenticate': { value: 'Basic realm="Admin Area"' }
        }
    };
}
```

#### 7.2 Lambda@Edge 사용 (고급)

더 강력한 인증이 필요한 경우 Lambda@Edge를 사용할 수 있습니다.

---

### 8단계: 배포 완료 확인

1. **DNS 전파 대기**: 5-30분
2. **접속 테스트**: `https://admin.tourstream.kr`
3. **기본 인증 확인**: 사용자명/비밀번호 입력
4. **API 연결 확인**: 상품 목록이 표시되는지 확인

---

## 🔒 보안 강화 옵션

### 옵션 1: 기본 인증 (간단)
- CloudFront Functions 사용
- 사용자명/비밀번호 입력

### 옵션 2: IP 화이트리스트 (추가)
- CloudFront WAF 규칙 추가
- 특정 IP만 허용
- IP 변경 시 WAF 규칙 업데이트 필요

### 옵션 3: 완전한 인증 시스템 (향후)
- 로그인 페이지 구현
- JWT 토큰 기반 인증
- 세션 관리

---

## 💰 비용 예상

- **S3**: 거의 무료 (용량 적음, 전송량 적음)
- **CloudFront**: 월 $1-2 (트래픽 적을 때)
- **ACM**: 무료
- **총**: 월 $1-2

---

## 🔄 업데이트 프로세스

### 어드민 앱 업데이트 시:

```bash
# 1. 빌드
cd packages/admin
npm run build:production

# 2. S3 업로드
aws s3 sync build/ s3://tourstream-admin/ --delete

# 3. CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id [DISTRIBUTION_ID] \
  --paths "/*"
```

---

## 📝 체크리스트

배포 전:
- [ ] DNS 설정 (admin.tourstream.kr)
- [ ] S3 버킷 생성 및 설정
- [ ] 어드민 앱 빌드 (환경 변수 포함)
- [ ] S3에 업로드
- [ ] CloudFront 배포 생성
- [ ] SSL 인증서 발급 및 연결
- [ ] 기본 인증 설정 (선택)
- [ ] 에러 페이지 설정 (404 → index.html)
- [ ] 접속 테스트

---

## 🆘 문제 해결

### 문제: 403 Forbidden
- S3 버킷 정책 확인
- CloudFront Origin 설정 확인

### 문제: 404 Not Found
- 에러 페이지 설정 확인 (404 → index.html)
- S3 파일 업로드 확인

### 문제: CORS 오류
- API 서버 CORS_ORIGIN에 `https://admin.tourstream.kr` 추가 확인

### 문제: 기본 인증이 작동하지 않음
- CloudFront Functions 코드 확인
- 배포 상태 확인

---

## 🎉 완료!

이제 어디서든 `https://admin.tourstream.kr`로 접속하여 어드민을 사용할 수 있습니다!
