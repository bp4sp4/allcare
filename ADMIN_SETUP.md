# 관리자 페이지 설정 가이드

## 1. 데이터베이스 설정

### admin_users 테이블 및 뷰 생성
Supabase Dashboard의 SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- database/admin-schema.sql 파일의 내용을 전체 실행
```

## 2. 관리자 계정 생성

### 2-1. Supabase Dashboard에서 계정 생성
1. Supabase Dashboard → Authentication → Users 메뉴로 이동
2. "Add User" 버튼 클릭
3. 이메일과 비밀번호 입력 (예: admin@allcare.com)
4. "Create User" 클릭

### 2-2. admin_users 테이블에 추가
SQL Editor에서 다음 쿼리 실행:

```sql
INSERT INTO admin_users (email, name, role) 
VALUES ('admin@allcare.com', '관리자', 'super_admin');
```

## 3. 접속 방법

### 로그인 페이지
```
http://localhost:3000/admin/login
```

### 대시보드
로그인 성공 시 자동으로 이동됩니다:
```
http://localhost:3000/admin/dashboard
```

## 4. 관리자 페이지 기능

### 대시보드 통계
- 전체 회원 수
- 활성 구독 수
- 취소된 구독 수
- 총 매출 (활성 구독 기준)

### 회원 관리 기능
1. **검색**: 이메일, 이름, 전화번호로 검색
2. **필터링**:
   - 가입 경로: 전체 / 이메일 / 네이버 / 카카오
   - 구독 상태: 전체 / 활성 / 취소됨 / 구독 없음
3. **회원 정보 조회**:
   - 이메일
   - 이름
   - 전화번호
   - 가입 경로
   - 가입일
   - 구독 상태
   - 구독 플랜
   - 다음 결제일
4. **구독 관리**:
   - 구독 취소 (다음 결제일까지 사용 가능)
   - 구독 활성화 (취소된 구독 재활성화)

### 페이지네이션
- 페이지당 20명씩 표시
- 페이지 번호 클릭으로 이동

## 5. 보안

- JWT 토큰 기반 인증
- admin_users 테이블에 등록된 계정만 접근 가능
- 토큰은 localStorage에 저장 (만료: 7일)
- 모든 API 요청 시 Bearer 토큰 검증

## 6. API 엔드포인트

### 로그인
```
POST /api/admin/login
Body: { email, password }
Response: { token, admin: {...} }
```

### 회원 목록 조회
```
GET /api/admin/users?search=&provider=&subscription=
Headers: Authorization: Bearer {token}
Response: { users: [...] }
```

### 통계 조회
```
GET /api/admin/stats
Headers: Authorization: Bearer {token}
Response: { totalUsers, activeSubscriptions, cancelledSubscriptions, totalRevenue }
```

### 구독 상태 변경
```
POST /api/admin/subscription/update
Headers: Authorization: Bearer {token}
Body: { userId, action: 'activate' | 'cancel' }
Response: { success, message }
```

## 7. 추가 관리자 생성

새로운 관리자를 추가하려면:

1. Supabase Dashboard에서 사용자 생성
2. SQL로 admin_users 테이블에 추가:

```sql
INSERT INTO admin_users (email, name, role) 
VALUES ('newadmin@example.com', '새관리자', 'admin');
```

role 종류:
- `admin`: 일반 관리자
- `super_admin`: 슈퍼 관리자

## 8. 문제 해결

### 로그인 실패
- Supabase Authentication에 계정이 있는지 확인
- admin_users 테이블에 이메일이 등록되어 있는지 확인

### 데이터 조회 안 됨
- admin_user_details 뷰가 생성되었는지 확인
- SUPABASE_SERVICE_ROLE_KEY가 .env.local에 설정되어 있는지 확인

### 토큰 만료
- 7일 후 자동으로 만료되어 재로그인 필요
- localStorage에서 admin_token 확인 가능
