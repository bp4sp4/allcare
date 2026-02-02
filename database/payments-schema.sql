-- AllCare 결제 관련 데이터베이스 스키마
-- Supabase SQL Editor에서 실행

-- UUID 확장 활성화 (Supabase에서 필요)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 기존 테이블이 있으면 삭제 (주의: 데이터도 함께 삭제됨)
DROP TABLE IF EXISTS payments CASCADE;

-- ============================================
-- payments 테이블 (결제 내역)
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,  -- 사용자 연동이 필요하면 REFERENCES users(id) 추가
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
COMMENT ON COLUMN payments.amount IS '결제 금액 (원)';
COMMENT ON COLUMN payments.good_name IS '상품명';
COMMENT ON COLUMN payments.customer_phone IS '고객 전화번호';
COMMENT ON COLUMN payments.status IS '결제 상태 (pending/completed/failed 등)';
COMMENT ON COLUMN payments.payment_method IS '결제 수단 (payapp, card 등)';
COMMENT ON COLUMN payments.approved_at IS '결제 승인 시간';

-- ============================================
-- 인덱스 생성 (검색 성능 향상)
-- ============================================
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_trade_id ON payments(trade_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ============================================
-- 자동 업데이트 트리거 함수
-- ============================================
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 트리거 적용 (updated_at 자동 갱신)
-- ============================================
CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments
  FOR EACH ROW 
  EXECUTE FUNCTION update_payments_updated_at();

-- ============================================
-- RLS (Row Level Security) 설정
-- ============================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Service Role은 모든 접근 가능 (API에서 사용)
-- 사용자 인증이 필요하면 아래 정책 추가:
-- CREATE POLICY "Users can view own payments" ON payments
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- ============================================
-- 완료!
-- ============================================
-- 테이블 확인: SELECT * FROM payments;
