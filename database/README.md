# 데이터베이스 스키마

## 회원 관련 테이블

### 1. `public.users` - 사용자 프로필
사용자의 추가 정보를 저장하는 테이블입니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 사용자 ID (auth.users 참조) |
| email | TEXT | 이메일 (중복 불가) |
| name | TEXT | 사용자 이름 |
| phone | TEXT | 전화번호 |
| avatar_url | TEXT | 프로필 이미지 URL |
| provider | TEXT | 가입 방법 ('email', 'kakao', 'google', 'naver') |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

### 2. `public.phone_verifications` - 전화번호 인증
전화번호 인증 정보를 저장하는 테이블입니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 인증 ID |
| phone | TEXT | 전화번호 |
| code | TEXT | 인증 코드 |
| verified | BOOLEAN | 인증 완료 여부 |
| expires_at | TIMESTAMP | 만료 시간 |
| created_at | TIMESTAMP | 생성 시간 |

---

## 스키마 적용 방법

### 방법 1: Supabase Dashboard (권장)
1. [Supabase Dashboard](https://supabase.com/dashboard/project/ujqaqulgmoonhlwiwezm) 접속
2. **SQL Editor** 메뉴 선택
3. `database/users-schema.sql` 파일 내용 복사
4. 붙여넣기 후 **Run** 클릭

### 방법 2: Supabase CLI
```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref ujqaqulgmoonhlwiwezm

# 마이그레이션 실행
supabase db push
```

---

## 보안 정책 (RLS)

### users 테이블
- ✅ 사용자는 **자신의 프로필만** 조회/수정 가능
- ✅ 회원가입 시 자동으로 프로필 생성
- ✅ auth.users와 자동 연동

### phone_verifications 테이블
- ✅ 인증 과정에서 누구나 생성/조회 가능
- ✅ 만료된 인증 코드 자동 삭제 함수 제공

---

## 자동화 기능

### 1. 회원가입 시 프로필 자동 생성
`auth.users`에 새 사용자가 생성되면 자동으로 `public.users`에 프로필이 생성됩니다.

### 2. 업데이트 시간 자동 갱신
`users` 테이블이 수정되면 `updated_at`이 자동으로 현재 시간으로 업데이트됩니다.

### 3. 만료된 인증 코드 정리
다음 함수를 주기적으로 실행하여 만료된 인증 코드를 삭제할 수 있습니다:
```sql
SELECT public.cleanup_expired_verifications();
```

---

## 테스트 쿼리

### 사용자 조회
```sql
SELECT * FROM public.users;
```

### 전화번호 인증 조회
```sql
SELECT * FROM public.phone_verifications;
```

### 특정 사용자 프로필 조회
```sql
SELECT * FROM public.users WHERE email = 'example@email.com';
```

### 만료되지 않은 인증 코드 조회
```sql
SELECT * FROM public.phone_verifications 
WHERE expires_at > NOW() AND verified = FALSE;
```
