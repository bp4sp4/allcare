# 소셜 로그인 설정 가이드

## 1. 카카오 로그인 설정

### 1-1. 카카오 개발자 콘솔 설정
1. [Kakao Developers](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 이름: `한평생올케어` (원하는 이름)
4. 사업자명: 본인 이름 또는 사업자명

### 1-2. 앱 키 확인
1. **내 애플리케이션** → 생성한 앱 선택
2. **앱 키** 탭에서 **REST API 키** 복사
   - 예: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 1-3. 플랫폼 설정
1. **플랫폼** 탭 → **Web 플랫폼 등록**
2. 사이트 도메인: `https://allcare-xi.vercel.app`

### 1-4. 카카오 로그인 활성화
1. **카카오 로그인** 탭 → **활성화 설정** ON
2. **Redirect URI** 등록:
   ```
   https://ujqaqulgmoonhlwiwezm.supabase.co/auth/v1/callback
   ```
3. **동의 항목** 설정:
   - 닉네임: 필수
   - 프로필 사진: 선택
   - 카카오계정(이메일): 필수

### 1-5. Supabase 설정
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택: `ujqaqulgmoonhlwiwezm`
3. **Authentication** → **Providers** → **Kakao**
4. 카카오 설정 활성화:
   - **Kakao enabled**: ON
   - **Client ID**: 위에서 복사한 REST API 키 입력
   - **Client Secret**: (카카오는 필요 없음, 비워둠)
5. **Save** 클릭

---

## 2. 네이버 로그인 설정

### 2-1. 네이버 개발자 센터 설정
1. [Naver Developers](https://developers.naver.com/apps/) 접속
2. **애플리케이션 등록**
3. 애플리케이션 정보 입력:
   - 애플리케이션 이름: `한평생올케어`
   - 사용 API: **네아로(네이버 아이디로 로그인)** 선택

### 2-2. API 설정
1. **제공 정보 선택**:
   - 회원이름: 필수
   - 이메일 주소: 필수
   - 프로필 사진: 선택
2. **환경 추가**:
   - **서비스 URL**: `https://allcare-xi.vercel.app`
   - **Callback URL**: 
     ```
     https://ujqaqulgmoonhlwiwezm.supabase.co/auth/v1/callback
     ```

### 2-3. Client ID/Secret 확인
1. **내 애플리케이션** → 생성한 앱 선택
2. **Client ID** 복사
   - 예: `AbCdEfGhIjKlMnOpQrSt`
3. **Client Secret** 복사
   - 예: `1234567890`

### 2-4. Supabase 설정 (네이버는 현재 미지원)
**주의**: Supabase는 현재 네이버 로그인을 기본 제공하지 않습니다.
대안:
1. **커스텀 OAuth 제공자**로 구현 필요
2. 또는 **직접 네이버 API** 호출하여 구현

---

## 3. 구글 로그인 설정 (추가 옵션)

### 3-1. Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **프로젝트 생성** 또는 기존 프로젝트 선택
3. **API 및 서비스** → **OAuth 동의 화면**
4. **외부** 선택 후 앱 정보 입력

### 3-2. OAuth 클라이언트 ID 생성
1. **사용자 인증 정보** → **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
2. 애플리케이션 유형: **웹 애플리케이션**
3. **승인된 리디렉션 URI**:
   ```
   https://ujqaqulgmoonhlwiwezm.supabase.co/auth/v1/callback
   ```
4. **클라이언트 ID**, **클라이언트 보안 비밀** 복사

### 3-3. Supabase 설정
1. **Authentication** → **Providers** → **Google**
2. 구글 설정 활성화:
   - **Google enabled**: ON
   - **Client ID**: 위에서 복사한 클라이언트 ID
   - **Client Secret**: 위에서 복사한 클라이언트 보안 비밀
3. **Save** 클릭

---

## 4. 환경변수 설정 (선택사항)

`.env.local` 파일에 추가 (필요시):
```env
# 소셜 로그인
NEXT_PUBLIC_KAKAO_CLIENT_ID=your_kakao_rest_api_key
NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 5. 테스트

### 카카오/구글 로그인 테스트
1. 로그인 페이지 접속: `https://allcare-xi.vercel.app/auth/login`
2. **카카오 로그인** 또는 **구글 로그인** 버튼 클릭
3. 각 서비스 로그인 화면에서 계정 입력
4. 동의 화면에서 **동의하고 계속하기**
5. 홈 화면으로 리다이렉트 확인

### 문제 해결
- **"리디렉션 URI 불일치" 오류**: 각 서비스에서 Callback URL이 정확히 입력되었는지 확인
- **"앱이 확인되지 않음" 경고**: 개발 단계에서는 정상, 배포 시 앱 검수 필요

---

## 참고 자료
- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Kakao Login 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [Naver Login API](https://developers.naver.com/docs/login/api/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
