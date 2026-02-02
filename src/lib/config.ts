/**
 * 환경 변수 설정
 * .env.local 파일에 아래 변수들을 설정하세요
 */

export const config = {
  // 페이앱 설정
  payapp: {
    userId: process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '',
    shopName: process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || 'AllCare Shop',
    // 결제 완료 후 리턴 URL
    returnUrl: process.env.NEXT_PUBLIC_PAYAPP_RETURN_URL || '/payment/result',
    // 결제 결과 웹훅 URL
    feedbackUrl: process.env.NEXT_PUBLIC_PAYAPP_FEEDBACK_URL || '/api/payments/webhook',
  },

  // 결제 앱 설정 (레거시 - 다른 결제 서비스용)
  payment: {
    // TODO: 사용할 결제 서비스 선택 (payapp, toss, kakao, naver 등)
    provider: process.env.PAYMENT_PROVIDER || 'payapp',
    
    // 결제 앱 API 키
    clientKey: process.env.PAYMENT_CLIENT_KEY || '',
    secretKey: process.env.PAYMENT_SECRET_KEY || '',
    
    // 결제 성공/실패 URL
    successUrl: process.env.NEXT_PUBLIC_PAYMENT_SUCCESS_URL || '/payment/success',
    failUrl: process.env.NEXT_PUBLIC_PAYMENT_FAIL_URL || '/payment/fail',
  },

  // 데이터베이스 설정
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // API 설정
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
};
