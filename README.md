# AllCare - 돌봄 서비스 매칭 플랫폼

돌봄 서비스 제공자와 이용자를 연결하는 위치 기반 매칭 플랫폼입니다.
네이버 지도 기반 검색, 구독 결제, AI 챗봇 상담 기능을 제공합니다.

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + bcrypt, 네이버 OAuth |
| Payment | PayApp SDK |
| Map | Naver Maps API |
| AI Chatbot | Google Gemini API |
| Font | Pretendard, Paperlogy |

## 주요 기능

### 매칭 시스템
- 네이버 지도 기반 돌봄 서비스 검색
- 위치 기반 거리 계산 (Haversine)
- 필터링 및 지역 검색
- 사용자 현재 위치 자동 감지

### 회원 인증
- 이메일 회원가입 / 로그인
- 네이버 소셜 로그인
- 이메일 인증 (SMS 발송)
- 이메일 찾기 / 비밀번호 재설정

### 구독 & 결제
- 3단계 요금제 (Basic / Standard / Premium)
- PayApp SDK 연동 결제
- 구독 갱신, 플랜 변경, 해지, 환불
- 결제 내역 조회
- 결제 결과 웹훅 처리

### AI 챗봇
- Google Gemini 기반 상담 챗봇
- 마크다운 응답 렌더링
- 전화번호 자동 링크 변환

### 관리자 대시보드
- 관리자 로그인
- 사용자 목록 및 접근 권한 관리
- 구독 상태 관리
- 통계 조회

### 마이페이지
- 프로필 조회 및 수정
- 비밀번호 변경
- 구독 정보 확인 및 관리
- 회원 탈퇴

## 프로젝트 구조

```
allcare/
├── database/                    # SQL 마이그레이션
├── public/
│   ├── fonts/                   # Pretendard, Paperlogy 폰트
│   └── images/                  # 배너, 매칭, 챗봇 이미지
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/           # 관리자 API (로그인, 통계, 사용자, 구독)
│   │   │   ├── auth/            # 인증 API (로그인, 회원가입, 네이버, 인증)
│   │   │   ├── chat/            # AI 챗봇 API
│   │   │   ├── geocode/         # 지오코딩 API (단건, 배치)
│   │   │   ├── payments/        # 결제 API (요청, 결과, 웹훅, 내역)
│   │   │   ├── subscription/    # 구독 API (상태, 갱신, 변경, 해지, 환불)
│   │   │   └── user/            # 사용자 API (프로필, 비밀번호, 탈퇴)
│   │   ├── admin/               # 관리자 페이지
│   │   ├── auth/                # 인증 페이지
│   │   ├── matching/            # 매칭 페이지 (지도, 필터, 검색)
│   │   ├── mypage/              # 마이페이지
│   │   ├── payment/             # 결제 페이지
│   │   ├── privacy/             # 개인정보처리방침
│   │   ├── refund/              # 환불 안내
│   │   └── terms/               # 이용약관
│   ├── components/              # 공통 컴포넌트
│   │   ├── AlertModal.tsx
│   │   ├── BottomSheetHandle.tsx
│   │   ├── ChatBot.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   └── Portal.tsx
│   ├── lib/                     # 유틸리티
│   │   ├── config.ts            # 환경 설정
│   │   ├── haversine.ts         # 거리 계산
│   │   ├── naver-geocode.ts     # 네이버 지오코딩
│   │   ├── payapp.ts            # PayApp SDK
│   │   ├── sms.ts               # SMS 발송
│   │   └── supabase.ts          # Supabase 클라이언트
│   ├── types/                   # 타입 정의
│   └── middleware.ts            # 요청 헤더 미들웨어
└── .env.local.example           # 환경 변수 예제
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local.example`을 `.env.local`로 복사 후 값을 입력하세요.

```bash
cp .env.local.example .env.local
```

### 3. 데이터베이스 설정

Supabase 프로젝트 생성 후 `database/` 폴더의 SQL 파일을 순서대로 실행하세요.

- `create-payments-table.sql` - 결제 테이블 생성
- `add-payment-method.sql` - 결제 수단 컬럼 추가
- `add-practice-matching-access.sql` - 매칭 접근 권한 추가
- `update-subscription-status-constraint.sql` - 구독 상태 제약 조건 수정

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 실행됩니다.

### 5. 빌드 및 배포

```bash
npm run build
npm start
```

## API 엔드포인트

### 인증

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/naver` | 네이버 로그인 |
| GET | `/api/auth/naver/callback` | 네이버 콜백 |
| POST | `/api/auth/find-email` | 이메일 찾기 |
| POST | `/api/auth/reset-password` | 비밀번호 재설정 요청 |
| POST | `/api/auth/reset-password/confirm` | 비밀번호 재설정 확인 |
| POST | `/api/auth/verification/send` | 인증 코드 발송 |
| POST | `/api/auth/verification/verify` | 인증 코드 확인 |

### 결제

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/payments` | 결제 요청 |
| GET | `/api/payments` | 결제 조회 |
| POST | `/api/payments/webhook` | 결제 웹훅 (PayApp -> 서버) |
| POST | `/api/payments/result` | 결제 결과 저장 |
| GET | `/api/payments/history` | 결제 내역 조회 |

### 구독

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/subscription/status` | 구독 상태 조회 |
| POST | `/api/subscription/renew` | 구독 갱신 |
| POST | `/api/subscription/change-plan` | 플랜 변경 |
| POST | `/api/subscription/cancel` | 구독 해지 |
| POST | `/api/subscription/refund` | 환불 |

### 사용자

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET/PUT | `/api/user/profile` | 프로필 조회/수정 |
| POST | `/api/user/change-password` | 비밀번호 변경 |
| DELETE | `/api/user/delete` | 회원 탈퇴 |

### 관리자

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/admin/login` | 관리자 로그인 |
| GET | `/api/admin/stats` | 통계 조회 |
| GET | `/api/admin/users` | 사용자 목록 |
| POST | `/api/admin/users/access` | 접근 권한 관리 |
| POST | `/api/admin/subscription/update` | 구독 상태 변경 |

### 기타

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/chat` | AI 챗봇 |
| GET | `/api/geocode` | 지오코딩 |
| POST | `/api/geocode/batch` | 배치 지오코딩 |

## 결제 플로우

1. 사용자가 홈페이지 또는 마이페이지에서 구독 플랜 선택
2. PayApp SDK를 통해 결제 프로세스 시작
3. 페이앱 결제창에서 결제 진행
4. 페이앱이 `/api/payments/webhook`으로 결제 결과 전송
5. 결제 성공 시 구독 활성화 및 매칭 서비스 이용 가능
