-- ============================================
-- 회원 관련 테이블 스키마
-- ============================================

-- 1. 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'email', -- 'email', 'kakao', 'google', 'naver'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 사용자 프로필 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_provider ON public.users(provider);

-- 3. 전화번호 인증 테이블
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 전화번호 인증 인덱스
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_code ON public.phone_verifications(code);

-- 5. updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. users 테이블에 트리거 적용
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS (Row Level Security) 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- 8. users 테이블 RLS 정책
-- 모든 사용자가 자신의 정보만 조회 가능
CREATE POLICY "Users can view own profile" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- 모든 사용자가 자신의 정보만 수정 가능
CREATE POLICY "Users can update own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- 새 사용자 가입 시 프로필 생성 가능
CREATE POLICY "Users can insert own profile" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 9. phone_verifications 테이블 RLS 정책
-- 인증 중에는 누구나 조회 가능 (인증 코드 확인용)
CREATE POLICY "Anyone can view phone verifications" 
  ON public.phone_verifications 
  FOR SELECT 
  USING (TRUE);

-- 인증 코드 생성 시 누구나 삽입 가능
CREATE POLICY "Anyone can insert phone verifications" 
  ON public.phone_verifications 
  FOR INSERT 
  WITH CHECK (TRUE);

-- 인증 완료 시 업데이트 가능
CREATE POLICY "Anyone can update phone verifications" 
  ON public.phone_verifications 
  FOR UPDATE 
  USING (TRUE);

-- 10. 회원가입 시 자동으로 users 테이블에 프로필 생성하는 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. auth.users에 새 사용자 생성 시 트리거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 12. 만료된 인증 코드 삭제 함수 (선택사항)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.phone_verifications
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 초기 데이터 (테스트용, 필요시 사용)
-- ============================================

-- 테스트 계정 삽입 (선택사항)
-- INSERT INTO auth.users (id, email) VALUES 
--   (gen_random_uuid(), 'test@example.com')
-- ON CONFLICT (email) DO NOTHING;
