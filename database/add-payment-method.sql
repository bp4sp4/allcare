-- subscriptions 테이블에 결제수단 정보 컬럼 추가

-- 결제수단 타입 컬럼 추가 (pay_type)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS payment_type INTEGER;

-- 카드명 컬럼 추가 (신용카드 결제 시)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS card_name VARCHAR(100);

-- 결제수단 이름 (표시용)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS payment_method_name VARCHAR(50);

-- 컬럼 설명 추가
COMMENT ON COLUMN subscriptions.payment_type IS 'PayApp 결제수단 타입 (1=신용카드, 6=계좌이체, 15=카카오페이, 16=네이버페이, 25=토스페이 등)';
COMMENT ON COLUMN subscriptions.card_name IS '신용카드명 (신용카드 결제 시)';
COMMENT ON COLUMN subscriptions.payment_method_name IS '결제수단 표시명 (삼성카드, 카카오페이, 네이버페이 등)';

-- 기존 데이터에 기본값 설정
UPDATE subscriptions 
SET payment_method_name = '자동결제'
WHERE payment_method_name IS NULL;
