# 네이버 클라우드 SENS + Supabase 설정 가이드

## 1. 네이버 클라우드 SENS 설정

### 1-1. SENS 프로젝트 생성
1. [네이버 클라우드 플랫폼](https://console.ncloud.com) 접속
2. Services → Application Service → Simple & Easy Notification Service
3. **프로젝트 생성**
   - 프로젝트 이름: AllCare-SMS

### 1-2. 발신번호 등록
1. SMS 발신번호 등록
2. 사업자 등록증 또는 통신서비스 이용 증명원 업로드
3. 승인 대기 (보통 1-2일 소요)

### 1-3. API 인증키 생성
1. 콘솔 우측 상단 → 계정 관리 → 인증키 관리
2. **API 인증키 생성**
3. 다음 정보 저장:
   - Access Key ID: `NAVER_CLOUD_ACCESS_KEY`
   - Secret Key: `NAVER_CLOUD_SECRET_KEY`

### 1-4. Service ID 확인
1. SENS 프로젝트 선택
2. **Service ID** 복사 (예: ncp:sms:kr:123456789:project-name)

## 2. 환경 변수 설정

`.env.local` 파일에 추가:

```env
# 네이버 클라우드 SENS (SMS)
NAVER_CLOUD_ACCESS_KEY=your_access_key_here
NAVER_CLOUD_SECRET_KEY=your_secret_key_here
NAVER_CLOUD_SMS_SERVICE_ID=ncp:sms:kr:123456789:project-name
NAVER_CLOUD_SMS_SENDER=01012345678

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 3. 패키지 설치

```bash
npm install @supabase/supabase-js crypto-js
```

## 4. 데이터 흐름

```
사용자 입력 (전화번호)
    ↓
Next.js API (verification/send)
    ↓
1. 인증번호 생성 (6자리)
2. Supabase에 저장 (phone_verifications 테이블)
3. 네이버 SENS로 SMS 발송
    ↓
사용자가 인증번호 입력
    ↓
Next.js API (verification/verify)
    ↓
Supabase에서 인증번호 확인
    ↓
인증 완료
```

## 5. 비용

### 네이버 SENS
- SMS: 건당 9원
- LMS: 건당 30원
- 매월 50건 무료

### Supabase
- Free Tier: 
  - 500MB 데이터베이스
  - 1GB 파일 스토리지
  - 50,000 월간 활성 사용자
- 프로덕션 환경: $25/월부터

## 6. 테스트

```bash
# 개발 서버 실행
npm run dev

# 회원가입 페이지에서 전화번호 인증 테스트
# http://localhost:3000/auth/signup
```

## 참고 링크

- [네이버 SENS 문서](https://api.ncloud-docs.com/docs/ai-application-service-sens-smsv2)
- [Supabase 문서](https://supabase.com/docs)
