# AllCare - 페이앱 결제 연동

Next.js 기반 페이앱(PayApp) 결제 시스템

## 🚀 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Payment**: PayApp Lite API v2
- **Runtime**: Node.js

## 📁 프로젝트 구조

```
allcare/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/              # 헬스체크 API
│   │   │   └── payments/            # 결제 API
│   │   │       ├── route.ts         # 결제 요청/조회
│   │   │       ├── result/          # 결제 결과 저장
│   │   │       └── webhook/         # 페이앱 웹훅
│   │   ├── payment/
│   │   │   ├── page.tsx             # 결제 페이지
│   │   │   └── result/              # 결제 결과 페이지
│   │   └── page.tsx                 # 홈페이지
│   ├── lib/
│   │   └── config.ts                # 환경 설정
│   └── types/
│       └── payment.ts               # 결제 타입 정의
└── .env.local.example               # 환경 변수 예제
```

## 🔧 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local.example` 파일을 `.env.local`로 복사하고 페이앱 정보를 입력하세요:

```bash
cp .env.local.example .env.local
```

`.env.local` 파일 수정:
```env
NEXT_PUBLIC_PAYAPP_USER_ID=your_payapp_userid
NEXT_PUBLIC_PAYAPP_SHOP_NAME=Your Shop Name
```

### 3. 개발 서버 실행

```bash
npm run dev
```

서버가 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

### 4. 빌드

```bash
npm run build
```

### 5. 프로덕션 실행

```bash
npm start
```

## 💳 페이앱 연동 방법

### 결제 페이지
1. 브라우저에서 [http://localhost:3000/payment](http://localhost:3000/payment) 접속
2. 상품명, 결제금액, 연락처 입력
3. "결제하기" 버튼 클릭
4. 페이앱 결제 프로세스 진행

### 페이앱 SDK 사용

```javascript
// PayApp SDK 자동 로드됨
PayApp.setDefault('userid', 'your_userid');
PayApp.setDefault('shopname', 'your_shop');

// 결제 파라미터 설정
PayApp.setParam('goodname', '상품명');
PayApp.setParam('price', '1000');
PayApp.setParam('recvphone', '01012345678');
PayApp.setParam('feedbackurl', '/api/payments/webhook');
PayApp.setParam('returnurl', '/payment/result');

// 결제 요청
PayApp.payrequest();
```

## 📡 API 엔드포인트

### 결제 요청 생성
```http
POST /api/payments
Content-Type: application/json

{
  "amount": 10000,
  "orderName": "테스트 상품",
  "customerName": "홍길동",
  "customerPhone": "01012345678"
}
```

### 결제 조회
```http
GET /api/payments?orderId=ORDER-123456789
```

### 결제 웹훅 (페이앱 → 서버)
```http
POST /api/payments/webhook
Content-Type: application/x-www-form-urlencoded

RETURNCODE=0000&TRADEID=xxx&PRICE=1000&...
```

### 헬스체크
```http
GET /api/health
```

## 🔄 결제 플로우

1. **결제 요청**: 사용자가 `/payment` 페이지에서 결제 정보 입력
2. **페이앱 호출**: PayApp SDK를 통해 결제 프로세스 시작
3. **결제 진행**: 페이앱 결제창에서 결제 진행
4. **웹훅 수신**: 페이앱이 `/api/payments/webhook`로 결제 결과 전송
5. **결과 확인**: 사용자가 `/payment/result`에서 결제 결과 확인

## 📝 페이앱 파라미터

| 파라미터 | 설명 | 필수 |
|---------|------|-----|
| `goodname` | 상품명 | ✅ |
| `price` | 결제금액 | ✅ |
| `recvphone` | 연락처 | ✅ |
| `feedbackurl` | 웹훅 URL | ✅ |
| `returnurl` | 리턴 URL | ✅ |
| `var1` | 주문번호 | ❌ |
| `checkretry` | 재시도 체크 | ❌ |
| `smsuse` | SMS 사용 | ❌ |
| `redirectpay` | 리다이렉트 결제 | ❌ |
| `skip_cstpage` | 고객정보 입력 스킵 | ❌ |

## 🎯 다음 단계

- [ ] 데이터베이스 연동 (PostgreSQL, MongoDB 등)
- [ ] 결제 내역 저장 및 조회 기능
- [ ] 결제 취소/환불 기능
- [ ] 관리자 대시보드
- [ ] 결제 내역 엑셀 다운로드
- [ ] 이메일/SMS 알림
- [ ] 테스트 코드 작성
- [ ] 에러 핸들링 개선
- [ ] 로깅 시스템 구축

## 🔒 보안 권장사항

1. **환경 변수 보호**: `.env.local` 파일을 절대 커밋하지 마세요
2. **웹훅 검증**: 페이앱 웹훅 요청의 진위를 검증하세요
3. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS를 사용하세요
4. **IP 화이트리스트**: 가능하면 페이앱 서버 IP만 허용하세요

## 📚 참고 문서

- [페이앱 공식 문서](https://www.payapp.kr)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [TypeScript 공식 문서](https://www.typescriptlang.org/docs)
