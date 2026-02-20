-- 실습매칭 시스템 열람권 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS practice_matching_access BOOLEAN DEFAULT FALSE;
