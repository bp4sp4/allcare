-- ============================================
-- subscriptions 테이블 (구독 정보)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'premium',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  amount INTEGER NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_billing_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  payapp_bill_key VARCHAR(255),
  payapp_trade_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  
  CONSTRAINT subscriptions_status_check CHECK (
    status IN ('active', 'cancelled', 'expired', 'suspended')
  ),
  CONSTRAINT subscriptions_billing_cycle_check CHECK (
    billing_cycle IN ('monthly', 'yearly')
  )
);

COMMENT ON TABLE subscriptions IS '사용자 구독 정보';
COMMENT ON COLUMN subscriptions.user_id IS 'Supabase Auth 사용자 ID';
COMMENT ON COLUMN subscriptions.plan IS '구독 플랜 (premium, basic 등)';
COMMENT ON COLUMN subscriptions.status IS '구독 상태 (active/cancelled/expired/suspended)';
COMMENT ON COLUMN subscriptions.amount IS '구독료 (원)';
COMMENT ON COLUMN subscriptions.billing_cycle IS '결제 주기 (monthly/yearly)';
COMMENT ON COLUMN subscriptions.next_billing_date IS '다음 결제 예정일';
COMMENT ON COLUMN subscriptions.end_date IS '구독 종료일 (취소 시 설정)';
COMMENT ON COLUMN subscriptions.payapp_bill_key IS 'PayApp 정기결제 키';
COMMENT ON COLUMN subscriptions.payapp_trade_id IS 'PayApp 최초 거래번호';

-- 인덱스 생성
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 설정
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독 정보만 조회 가능
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 구독 정보만 수정 가능 (취소 등)
CREATE POLICY "Users can update own subscriptions" ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);
