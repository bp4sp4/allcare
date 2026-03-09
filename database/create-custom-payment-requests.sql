-- 단과반 결제 요청 테이블
CREATE TABLE IF NOT EXISTS custom_payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,          -- 과목 이름/내용 (예: "요양보호사 이론 3과목")
  subject_count INT NOT NULL DEFAULT 1,  -- 과목 수
  amount INT NOT NULL,             -- 결제 금액 (원)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  memo TEXT,                       -- 관리자 메모
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  order_id TEXT                    -- PayApp 주문번호
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_custom_payment_requests_user_id ON custom_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_payment_requests_status ON custom_payment_requests(status);
