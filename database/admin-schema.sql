-- ============================================
-- admin_users 테이블 (관리자 계정)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  
  CONSTRAINT admin_users_role_check CHECK (
    role IN ('admin', 'super_admin')
  )
);

COMMENT ON TABLE admin_users IS '관리자 계정 정보';
COMMENT ON COLUMN admin_users.email IS '관리자 이메일 (Supabase Auth와 동일)';
COMMENT ON COLUMN admin_users.name IS '관리자 이름';
COMMENT ON COLUMN admin_users.role IS '관리자 권한 (admin/super_admin)';

-- 인덱스 생성
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- RLS 설정 (관리자만 접근 가능)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 관리자 본인 정보만 조회 가능
CREATE POLICY "Admin users can view their own info" ON admin_users
  FOR SELECT
  USING (auth.email() = email);

-- ============================================
-- 관리자 계정 생성 방법
-- ============================================
-- 1. Supabase Dashboard에서 Authentication > Users로 이동
-- 2. "Add User" 클릭
-- 3. 이메일과 비밀번호 입력하여 계정 생성
-- 4. 아래 SQL로 admin_users 테이블에 추가:

-- INSERT INTO admin_users (email, name, role) 
-- VALUES ('admin@example.com', '관리자', 'super_admin');

-- ============================================
-- 관리자용 뷰 (회원 전체 정보)
-- ============================================
CREATE OR REPLACE VIEW admin_user_details AS
SELECT 
  au.id as user_id,
  au.email,
  au.created_at as registered_at,
  au.last_sign_in_at,
  au.confirmed_at,
  COALESCE(u.name, '미등록') as name,
  COALESCE(u.phone, '미등록') as phone,
  COALESCE(u.provider, 'email') as provider,
  s.id as subscription_id,
  s.plan,
  s.status as subscription_status,
  s.amount,
  s.start_date as subscription_start,
  s.next_billing_date,
  s.cancelled_at,
  s.end_date as subscription_end
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.subscriptions s ON au.id = s.user_id AND s.status = 'active';

COMMENT ON VIEW admin_user_details IS '관리자용 회원 전체 정보 뷰';

-- 뷰 접근 권한 부여 (service role만)
-- RLS는 뷰에 적용되지 않으므로 API에서 인증 확인 필요
