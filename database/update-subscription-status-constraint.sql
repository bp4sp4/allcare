-- subscriptions 테이블의 status 제약 조건 수정
-- 기존 제약 조건 삭제
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- 새로운 제약 조건 추가 (cancel_scheduled 포함)
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('active', 'cancel_scheduled', 'cancelled', 'expired'));
