# AllCare 페이앱(PayApp) 결제 정리

## 개요
- 결제 제공: 페이앱(PayApp)
- 주요 구현 위치:
  - 문서: [PAYAPP_QUICKSTART.md](PAYAPP_QUICKSTART.md)
  - SDK/유틸: [src/lib/payapp.ts](src/lib/payapp.ts)
  - 결제 API: [src/app/api/payments/route.ts](src/app/api/payments/route.ts)

## 빠른 설치 및 환경 변수
- `.env.local`에 아래 항목 설정 (필수)
  - `NEXT_PUBLIC_PAYAPP_USER_ID` — 페이앱에서 발급받은 USER_ID
  - `NEXT_PUBLIC_PAYAPP_SHOP_NAME` — 쇼핑몰명 (예: AllCare Shop)
  - `NEXT_PUBLIC_PAYAPP_RETURN_URL` — 결제후 리다이렉트 URL (기본: `/payment/result`)
  - `NEXT_PUBLIC_PAYAPP_FEEDBACK_URL` — 웹훅 수신 URL (기본: `/api/payments/webhook`)

개발 서버 실행:

```bash
npm run dev
```

## 프론트엔드 / 결제 플로우 (요약)
1. 사용자가 결제 페이지에서 결제 요청을 보냄
2. 서버 API(`POST /api/payments`)가 결제 요청을 수신하고 `orderId`를 생성(또는 전달받음)
3. 서버에서 페이앱으로 전달할 파라미터(`userid`, `linkkey`, `shopname`, `goodname`, `price`, `var1`(주문번호), `returnurl`, `feedbackurl`)를 조합하여 결제 URL 생성
4. 생성된 결제 URL로 사용자를 리다이렉트하거나 팝업 호출
5. 결제 완료 후 `returnurl`로 리다이렉트되고, 페이앱이 `feedbackurl`(웹훅)로 결과를 전송

구현 참고: [src/app/api/payments/route.ts](src/app/api/payments/route.ts)

## 서버 API 엔드포인트 (현재 구현)
- `POST /api/payments` — 결제 요청 생성
  - 필수: `amount`, `orderName` 또는 `productName`
  - 반환: `paymentUrl` (페이앱 주문페이지 URL), 로컬 `orderId` 등
- `GET /api/payments?orderId=...` — 결제 내역 조회 (플레이스홀더, DB 미연동)

참고 구현 파일: [src/app/api/payments/route.ts](src/app/api/payments/route.ts)

## SDK 및 유틸
- `loadPayAppSDK()` — 클라이언트에서 페이앱 라이트 SDK를 안전하게 로드(재시도/백오프 포함).
- 결제 취소 관련 함수들:
  - `cancelPayment()` — 즉시 취소 (D+5일 이전, 정산 전)
  - `requestPaymentCancellation()` — 취소 요청 (D+5일 이후 또는 정산완료된 경우)
  - `cancelRebill()` — 정기결제(리빌) 해지

구현 참고: [src/lib/payapp.ts](src/lib/payapp.ts)

## 테스트 가이드
- 테스트 계정으로 페이앱 가입 및 `USER_ID` 발급
- `.env.local`에 `NEXT_PUBLIC_PAYAPP_USER_ID` 설정
- 로컬에서 결제 시나리오:
  1. `/payment` 페이지에서 금액/연락처 입력
  2. 결제 버튼 클릭 → 서버의 `POST /api/payments` 호출
  3. 리턴된 `paymentUrl`로 페이앱 결제창 열기
  4. 결제 완료 후 `/payment/result` 확인

테스트 유의사항:
- 팝업 차단 확인
- `USER_ID`가 없거나 잘못된 경우 에러 발생

## 미구현/차후 작업
- 결제 내역 DB 저장 및 상태 업데이트 (현재 TODO 주석 존재)
- 웹훅 처리 강화: 인증/재시도/로그 보강
- 결제 실패/부분취소 시 사용자 알림 및 환불 흐름 정교화
- 테스트 계정의 실제 `USER_ID` 교체 및 운영 환경 값 검증

## 빠른 문제 해결 팁
- 에러: "필수 파라미터가 누락되었습니다" → `amount` 또는 `goodname` 확인
- 팝업이 안 뜨면 브라우저 팝업 차단 확인
- SDK 로드 실패 시 콘솔에서 스크립트 로드 에러 확인

---
파일을 더 보강하거나 DB 연동 코드, 웹훅 검증 샘플을 추가해드릴까요?
