# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속
2. "Start your project" 클릭
3. 새 프로젝트 생성
   - Name: allcare
   - Database Password: 강력한 비밀번호 입력 (저장해두기!)
   - Region: Northeast Asia (Seoul) 권장

## 2. API 키 찾기

프로젝트가 생성되면:

1. 좌측 사이드바에서 **Settings** (톱니바퀴 아이콘) 클릭
2. **API** 메뉴 클릭
3. 다음 정보를 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbGciOi...` (클라이언트용)
   - **service_role** key: `eyJhbGciOi...` (서버용, 주의!)

## 3. 데이터베이스 연결 URL 찾기

1. 좌측 사이드바에서 **Database** 클릭
2. **Connection string** 탭 클릭
3. **URI** 선택
4. `[YOUR-PASSWORD]` 부분을 프로젝트 생성 시 입력한 비밀번호로 변경
5. 예시: `postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres`

## 4. .env.local 파일 생성

```bash
# 프로젝트 루트에서
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 다음 값들을 입력:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres
```

## 5. 데이터베이스 스키마 적용

Supabase 대시보드에서:

1. 좌측 사이드바에서 **SQL Editor** 클릭
2. **New query** 클릭
3. `database/schema.sql` 파일의 내용을 복사해서 붙여넣기
4. **RUN** 버튼 클릭

또는 로컬에서:

```bash
# Supabase CLI 설치
npm install -g supabase

# Supabase 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 실행
psql $DATABASE_URL -f database/schema.sql
```

## 6. 확인

1. Supabase 대시보드에서 **Table Editor** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - users
   - phone_verifications
   - password_reset_tokens
   - payments

## 실제 예시

```env
# 예시 (실제 값으로 변경하세요!)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxMDAwMDAwMCwiZXhwIjoxOTI1MDAwMDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjEwMDAwMDAwLCJleHAiOjE5MjUwMDAwMDB9.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
DATABASE_URL=postgresql://postgres:MyStr0ngP@ssw0rd!@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## 보안 주의사항

⚠️ **중요**: 
- `.env.local` 파일은 절대 Git에 커밋하지 마세요!
- `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용하고, 클라이언트에 노출하지 마세요!
- `NEXT_PUBLIC_*` 접두사가 붙은 환경 변수만 클라이언트에서 접근 가능합니다.
