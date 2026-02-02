-- AllCare 데이터베이스 스키마
-- Supabase SQL Editor에서 전체 복사 후 실행

-- UUID 확장 활성화 (Supabase에서 필요)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 기존 테이블이 있으면 삭제 (주의: 데이터도 함께 삭제됨)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS phone_verifications CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 1. users 테이블 (사용자 정보)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE users IS '사용자 계정 정보';
COMMENT ON COLUMN users.email IS '로그인 이메일 (고유)';
COMMENT ON COLUMN users.password_hash IS 'bcrypt 해시된 비밀번호';
COMMENT ON COLUMN users.phone IS '전화번호 (010-1234-5678 형식)';
COMMENT ON COLUMN users.phone_verified IS '전화번호 인증 완료 여부';

-- ============================================
-- 2. phone_verifications 테이블 (전화번호 인증)
-- ============================================
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE phone_verifications IS '전화번호 인증 코드 관리';
COMMENT ON COLUMN phone_verifications.code IS '6자리 인증 번호';
COMMENT ON COLUMN phone_verifications.expires_at IS '인증 코드 만료 시간 (5분)';
COMMENT ON COLUMN phone_verifications.verified IS '인증 완료 여부';

-- ============================================
-- 3. password_reset_tokens 테이블 (비밀번호 재설정)
-- ============================================
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE password_reset_tokens IS '비밀번호 재설정 토큰';
COMMENT ON COLUMN password_reset_tokens.token IS '재설정 토큰 (이메일 링크용)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS '토큰 만료 시간 (1시간)';
COMMENT ON COLUMN password_reset_tokens.used IS '토큰 사용 완료 여부';

-- ============================================
-- 4. payments 테이블 (결제 내역)
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id VARCHAR(100) UNIQUE NOT NULL,
  trade_id VARCHAR(100),
  amount INTEGER NOT NULL,
  good_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  approved_at TIMESTAMPTZ,
  error_code VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT payments_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')
  )
);

COMMENT ON TABLE payments IS '결제 내역';
COMMENT ON COLUMN payments.order_id IS '주문 번호 (고유)';
COMMENT ON COLUMN payments.trade_id IS '페이앱 거래 번호';
COMMENT ON COLUMN payments.status IS '결제 상태 (pending/completed/failed 등)';
COMMENT ON COLUMN payments.payment_method IS '결제 수단 (payapp, card 등)';

-- ============================================
-- 인덱스 생성 (검색 성능 향상)
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX idx_phone_verifications_expires ON phone_verifications(expires_at);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ============================================
-- 자동 업데이트 트리거 함수
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 트리거 적용 (updated_at 자동 갱신)
-- ============================================
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security) 설정
-- ============================================
-- 보안을 위해 RLS 활성화 (Supabase 권장)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- 사용자는 자신의 정보만 수정 가능
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- 사용자는 자신의 결제 내역만 조회 가능
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service Role은 모든 테이블에 접근 가능 (API에서 사용)
-- (별도 정책 불필요 - Service Role Key 사용 시 RLS 우회)

-- ============================================
-- 테스트 데이터 삽입 (선택사항)
-- ============================================
-- 테스트용 사용자 (비밀번호: test1234)
-- INSERT INTO users (email, password_hash, name, phone, phone_verified)
-- VALUES (
--   'test@example.com',
--   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
--   '테스트 사용자',
--   '01012345678',
--   true
-- );

-- ============================================
-- 완료!
-- ============================================
-- 테이블 확인: Supabase Dashboard > Table Editor
-- 또는 SQL: SELECT tablename FROM pg_tables WHERE schemaname = 'public';
