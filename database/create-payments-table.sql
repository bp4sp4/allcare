-- payments 테이블 생성
-- 결제, 환불, 취소, 플랜변경 이벤트를 기록

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id VARCHAR(255),
  trade_id VARCHAR(255),           -- PayApp 거래번호 (mul_no)
  amount INTEGER NOT NULL DEFAULT 0,
  good_name VARCHAR(255),          -- 상품명
  customer_phone VARCHAR(50),
  status VARCHAR(50) NOT NULL,     -- completed, failed, cancelled, refunded, refund_requested, plan_change
  payment_method VARCHAR(100),     -- payapp, internal
  approved_at TIMESTAMPTZ,         -- 결제/이벤트 발생시각
  error_code VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_approved_at ON payments(approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- RLS 활성화
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 서비스 역할(관리자)은 전체 접근 허용
CREATE POLICY "Service role full access" ON payments
  FOR ALL USING (true);
