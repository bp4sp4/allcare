# 페이앱 빠른 시작 가이드

## 1. 페이앱 테스트 계정 만들기

1. [페이앱 홈페이지](https://www.payapp.kr) 접속
2. **가맹점 신청** 또는 **회원가입**
3. 테스트 계정 생성 (실제 사업자 없이도 테스트 가능)

## 2. USER_ID 확인

로그인 후:
1. 관리자 페이지 접속
2. **가맹점 정보** 또는 **API 정보** 메뉴
3. **USER_ID** 복사 (예: `testuser` 또는 `yourshop123`)

## 3. 환경 변수 설정

`.env.local` 파일 생성:

```bash
# 프로젝트 루트에서
cp .env.local.example .env.local
```

`.env.local` 파일 열고 페이앱 설정만 입력:

```env
# 페이앱 설정 (필수)
NEXT_PUBLIC_PAYAPP_USER_ID=여기에_USER_ID_입력
NEXT_PUBLIC_PAYAPP_SHOP_NAME=AllCare Shop

# 나머지는 기본값 사용 (수정 안 해도 됨)
NEXT_PUBLIC_PAYAPP_RETURN_URL=http://localhost:3000/payment/result
NEXT_PUBLIC_PAYAPP_FEEDBACK_URL=http://localhost:3000/api/payments/webhook
```

## 4. 개발 서버 실행

```bash
npm run dev
```

## 5. 결제 테스트

1. 브라우저에서 http://localhost:3000 접속
2. **결제하기** 버튼 클릭
3. 결제 정보 입력:
   - 상품명: 테스트 상품
   - 금액: 1000원
   - 연락처: 01012345678
4. **결제하기** 버튼 클릭
5. 페이앱 결제창에서 테스트 진행

## 6. 테스트 결제 정보

페이앱 테스트 환경에서 사용 가능한 정보:
- 테스트 카드번호: 페이앱에서 제공하는 테스트 카드 사용
- 테스트 계좌: 페이앱에서 제공하는 테스트 계좌 사용

## 주의사항

⚠️ **USER_ID가 없으면?**
- 페이앱에 문의하여 테스트 계정 발급 요청
- 또는 실제 가맹점 신청 (사업자등록증 필요)

⚠️ **결제가 안 되는 경우**
1. 브라우저 콘솔 확인 (F12)
2. USER_ID가 올바른지 확인
3. 페이앱 SDK가 로드되었는지 확인

## 현재 구현 상태

✅ **완료된 기능**:
- 결제 페이지 (/payment)
- 결제 결과 페이지 (/payment/result)
- 페이앱 SDK 연동
- API 웹훅 처리

❌ **아직 안 된 것**:
- 데이터베이스 연결 (결제 내역 저장)
- 네이버 SENS (SMS 발송)
- 실제 USER_ID (테스트 계정 필요)

## 빠른 테스트 (데이터베이스 없이)

현재 상태에서도 테스트 가능:
- 결제 요청은 페이앱으로 전송됨
- 결제 결과는 화면에 표시됨
- 데이터베이스 저장은 나중에 추가 가능

## 문제 해결

### 1. "필수 파라미터가 누락되었습니다" 오류
→ .env.local에 USER_ID 설정 확인

### 2. 페이앱 창이 안 뜨는 경우
→ 브라우저 팝업 차단 해제

### 3. "에러코드 NO-PARAMS" 
→ USER_ID가 비어있거나 잘못됨
