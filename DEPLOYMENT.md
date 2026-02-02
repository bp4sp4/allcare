# 배포 환경 설정 가이드

## 🚨 중요: 결제 실패하지만 돈이 빠져나가는 문제 해결

### 문제 원인
- 결제는 성공했지만 `returnurl`과 `feedbackurl`이 localhost로 설정되어 있어서 배포 환경에서 제대로 동작하지 않음
- PayApp이 결과를 전달하지 못해 "결제 실패" 화면이 표시됨

### 해결 방법

#### 1. 환경 변수 설정 (Vercel 배포 환경)

Vercel 프로젝트 설정에서 다음 환경 변수를 **삭제**하세요:
```
❌ NEXT_PUBLIC_PAYAPP_RETURN_URL
❌ NEXT_PUBLIC_PAYAPP_FEEDBACK_URL
```

**이 변수들은 더 이상 사용하지 않습니다!**  
코드가 자동으로 현재 도메인을 감지합니다.

#### 2. 필수 환경 변수만 설정

Vercel 프로젝트 > Settings > Environment Variables:

```bash
# 페이앱 설정 (필수)
NEXT_PUBLIC_PAYAPP_USER_ID=korhrdcorp
NEXT_PUBLIC_PAYAPP_SHOP_NAME=AllCare Shop

# Supabase (있는 경우)
NEXT_PUBLIC_SUPABASE_URL=https://ujqaqulgmoonhlwiwezm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

#### 3. 코드 변경 내용

다음과 같이 자동으로 현재 도메인을 사용하도록 변경되었습니다:

```typescript
// ✅ 자동으로 현재 도메인 사용 (localhost, vercel.app 모두 지원)
const baseUrl = window.location.origin;
window.PayApp.setParam('returnurl', `${baseUrl}/payment/result`);
window.PayApp.setParam('feedbackurl', `${baseUrl}/api/payments/webhook`);
```

#### 4. 배포 후 테스트

1. 코드를 git push
2. Vercel 자동 배포 대기
3. 배포된 URL에서 결제 테스트
4. 브라우저 콘솔(F12)에서 다음 로그 확인:
   ```
   Payment request: {
     goodname: "구독 서비스",
     goodprice: "20000",
     baseUrl: "https://allcare-xi.vercel.app",  // ✅ 실제 도메인
     feedbackurl: "https://allcare-xi.vercel.app/api/payments/webhook",
     returnurl: "https://allcare-xi.vercel.app/payment/result"
   }
   ```

## 🔧 로컬 개발 환경

`.env.local` 파일은 그대로 유지하세요:

```bash
NEXT_PUBLIC_PAYAPP_USER_ID=korhrdcorp
NEXT_PUBLIC_PAYAPP_SHOP_NAME=AllCare Shop

# 로컬에서는 자동으로 http://localhost:3000 사용됨
```

## 📝 결제 성공/실패 확인

### 성공 케이스
- RETURNCODE: 0000
- TRADEID: 거래번호 표시
- 결제 금액 및 시간 표시

### 실패 케이스 (돈은 빠져나간 경우)
- 에러코드: - (빈값)
- 에러메시지: - (빈값)
- ⚠️ 경고 메시지: "결제 승인은 완료되었으나 시스템 오류가 발생했을 수 있습니다"

## 🚀 배포 체크리스트

- [ ] 환경 변수에서 NEXT_PUBLIC_PAYAPP_RETURN_URL 삭제
- [ ] 환경 변수에서 NEXT_PUBLIC_PAYAPP_FEEDBACK_URL 삭제
- [ ] NEXT_PUBLIC_PAYAPP_USER_ID 설정 확인
- [ ] git push 후 자동 배포
- [ ] 배포 완료 후 결제 테스트
- [ ] 브라우저 콘솔에서 URL 확인

## ⚠️ 주의사항

1. **돈이 빠져나갔는데 결제 실패라고 뜰 경우**:
   - PayApp 관리자 페이지에서 거래 내역 확인
   - TRADEID로 거래 조회 가능
   - 환불이 필요한 경우 PayApp 고객센터 문의

2. **테스트 결제 시**:
   - 테스트 계정 사용 (korhrdcorp)
   - 소액으로 테스트 (1,000원)
   - 테스트 완료 후 즉시 취소

3. **정식 배포 시**:
   - PayApp 정식 가맹점 신청
   - 실제 USER_ID로 변경
   - 실제 금액으로 설정
