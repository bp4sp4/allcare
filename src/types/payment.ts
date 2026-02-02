// 결제 관련 타입 정의

export interface PaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentResponse {
  success: boolean;
  message?: string;
  data?: {
    orderId: string;
    amount: number;
    orderName: string;
    status: PaymentStatus;
    paymentKey?: string;
    approvedAt?: string;
    paymentUrl?: string;
  };
  error?: string;
}

export type PaymentStatus = 
  | 'pending'    // 결제 대기
  | 'processing' // 결제 처리중
  | 'completed'  // 결제 완료
  | 'failed'     // 결제 실패
  | 'cancelled'  // 결제 취소
  | 'refunded';  // 환불 완료

export interface PaymentWebhook {
  orderId: string;
  paymentKey: string;
  status: PaymentStatus;
  amount: number;
  approvedAt?: string;
  canceledAt?: string;
  failReason?: string;
}

// 페이앱 웹훅 응답 타입
export interface PayAppWebhookResponse {
  RETURNCODE: string;    // 결과코드 (0000: 성공)
  RETURNMSG: string;     // 결과메시지
  TRADEID?: string;      // 거래번호
  PRICE?: string;        // 결제금액
  GOODNAME?: string;     // 상품명
  RECVPHONE?: string;    // 받는사람 전화번호
  var1?: string;         // 주문번호 (커스텀 변수)
  OKTIME?: string;       // 승인시간
}

// 페이앱 결제 요청 파라미터
export interface PayAppPaymentParams {
  goodname: string;      // 상품명
  price: string;         // 가격
  recvphone: string;     // 받는사람 전화번호
  feedbackurl: string;   // 웹훅 URL
  returnurl: string;     // 리턴 URL
  var1?: string;         // 주문번호
  checkretry?: 'y' | 'n'; // 재시도 체크
  smsuse?: 'y' | 'n';    // SMS 사용
  redirectpay?: '0' | '1'; // 리다이렉트 결제
  skip_cstpage?: 'y' | 'n'; // 고객정보 입력 페이지 스킵
}
