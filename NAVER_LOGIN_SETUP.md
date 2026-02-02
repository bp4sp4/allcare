# 네이버 로그인 API 연동 가이드

## 📱 개요
네이버 로그인 API를 사용하여 소셜 로그인을 구현합니다. Supabase가 네이버를 공식 지원하지 않으므로 직접 OAuth 2.0 플로우를 구현했습니다.

## 🚀 네이버 Developers 설정

### 1. 네이버 애플리케이션 등록
1. https://developers.naver.com/apps/#/register 접속
2. **애플리케이션 등록** 클릭
3. 애플리케이션 정보 입력:
   - **애플리케이션 이름**: 한평생올케어 (또는 원하는 이름)
   - **사용 API**: 네이버 로그인 선택

### 2. 서비스 URL 설정
화면에서 본 것처럼:
- **서비스 URL**: `https://allcare-korhrd.vercel.app` (배포 URL)
- 로컬 개발용: `http://localhost:3000`

### 3. Callback URL 설정 (최대 5개)
**중요!** 정확히 입력:
```
http://localhost:3000/api/auth/naver/callback
https://allcare-korhrd.vercel.app/api/auth/naver/callback
```

### 4. 제공 정보 선택
- ✅ 회원이름
- ✅ 이메일 주소
- ✅ 프로필 사진 (선택사항)

### 5. Client ID & Secret 확인
등록 완료 후:
1. **내 애플리케이션** 메뉴
2. 등록한 앱 클릭
3. **Client ID** 복사
4. **Client Secret** 복사

## ⚙️ 환경 변수 설정

`.env.local` 파일에 추가:

```env
# 네이버 로그인 API
NAVER_CLIENT_ID=your_client_id_here
NAVER_CLIENT_SECRET=your_client_secret_here
```

### 환경 변수 예시
```env
NAVER_CLIENT_ID=AbCdEfGhIjKlMnOp
NAVER_CLIENT_SECRET=XyZaBcDeFg
```

## 🔧 구현 코드

### 구현된 파일들
1. **`/src/app/api/auth/naver/route.ts`**
   - 네이버 OAuth 인증 시작
   - 네이버 로그인 페이지로 리다이렉트

2. **`/src/app/api/auth/naver/callback/route.ts`**
   - 네이버 콜백 처리
   - 액세스 토큰 교환
   - 사용자 정보 가져오기
   - Supabase에 사용자 저장

3. **`/src/app/auth/login/page.tsx`**
   - 네이버 로그인 버튼 클릭 시 `/api/auth/naver`로 이동

## 📝 OAuth 플로우

```
1. 사용자가 "네이버 로그인" 버튼 클릭
   ↓
2. /api/auth/naver 호출
   ↓
3. 네이버 로그인 페이지로 리다이렉트
   https://nid.naver.com/oauth2.0/authorize?...
   ↓
4. 사용자가 네이버에서 로그인 및 동의
   ↓
5. 콜백 URL로 리다이렉트 (code 포함)
   /api/auth/naver/callback?code=xxx&state=yyy
   ↓
6. code로 액세스 토큰 교환
   POST https://nid.naver.com/oauth2.0/token
   ↓
7. 액세스 토큰으로 사용자 정보 조회
   GET https://openapi.naver.com/v1/nid/me
   ↓
8. Supabase에 사용자 저장 또는 로그인
   ↓
9. 메인 페이지로 리다이렉트 (세션 쿠키 포함)
```

## 🧪 테스트

### 1. 로컬 테스트
```bash
# 서버 실행
npm run dev

# 브라우저에서
http://localhost:3000/auth/login

# 네이버 로그인 버튼 클릭
```

### 2. 확인 사항
- [ ] 네이버 로그인 페이지로 이동
- [ ] 로그인 및 동의 후 메인 페이지로 리다이렉트
- [ ] Supabase `users` 테이블에 사용자 생성 확인
- [ ] 브라우저 쿠키에 `auth_token` 생성 확인

## 📚 API 문서

### 네이버 OAuth 2.0
- **인증 요청**: https://nid.naver.com/oauth2.0/authorize
- **토큰 요청**: https://nid.naver.com/oauth2.0/token
- **사용자 정보**: https://openapi.naver.com/v1/nid/me

### 파라미터

#### 인증 요청
```
GET https://nid.naver.com/oauth2.0/authorize
?response_type=code
&client_id={CLIENT_ID}
&redirect_uri={CALLBACK_URL}
&state={RANDOM_STATE}
```

#### 토큰 요청
```
POST https://nid.naver.com/oauth2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&code={AUTHORIZATION_CODE}
&state={STATE}
```

#### 사용자 정보 조회
```
GET https://openapi.naver.com/v1/nid/me
Authorization: Bearer {ACCESS_TOKEN}
```

### 응답 예시

#### 사용자 정보
```json
{
  "resultcode": "00",
  "message": "success",
  "response": {
    "id": "12345678",
    "email": "user@example.com",
    "name": "홍길동",
    "nickname": "길동이",
    "profile_image": "https://...",
    "age": "30-39",
    "gender": "M",
    "birthday": "12-25",
    "mobile": "010-1234-5678"
  }
}
```

## ⚠️ 주의사항

### 1. Callback URL 오류
```
❌ 400 Bad Request: Callback URL mismatch
```
→ **해결**: 네이버 Developers 콘솔에서 정확한 Callback URL 등록
→ 형식: `http://YOUR_DOMAIN/api/auth/naver/callback`

### 2. Client Secret 오류
```
❌ 401 Unauthorized: Invalid client
```
→ **해결**: NAVER_CLIENT_SECRET 환경 변수 확인

### 3. CORS 오류
```
❌ CORS policy error
```
→ **해결**: API 라우트는 서버 사이드에서 실행되므로 CORS 문제 없음
→ 만약 발생하면 네이버 콘솔에서 서비스 URL 확인

### 4. 로컬 개발 시
- 네이버 콘솔에 `http://localhost:3000` 서비스 URL 등록 필요
- Callback URL도 `http://localhost:3000/api/auth/naver/callback` 등록

## 🔐 보안

- ✅ `state` 파라미터로 CSRF 공격 방지
- ✅ Client Secret은 서버 사이드에서만 사용 (절대 클라이언트 노출 금지)
- ✅ 세션 쿠키는 HttpOnly 플래그 설정
- ⚠️ `.env.local` 파일은 Git에 커밋하지 말 것

## ✅ 체크리스트

- [ ] 네이버 Developers에 애플리케이션 등록
- [ ] Client ID, Client Secret 발급
- [ ] Callback URL 설정 (로컬 + 배포 URL)
- [ ] `.env.local`에 환경 변수 추가
- [ ] 로컬 테스트 완료
- [ ] 배포 환경에 환경 변수 설정
- [ ] 실제 네이버 로그인 테스트

모든 체크리스트 완료 후 네이버 로그인이 정상 작동합니다! 🎉

## 📚 참고 링크
- [네이버 로그인 API 가이드](https://developers.naver.com/docs/login/overview/)
- [네이버 Developers 콘솔](https://developers.naver.com/apps/)
- [OAuth 2.0 명세](https://oauth.net/2/)
