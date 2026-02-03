// PayApp API 유틸리티 함수

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';

interface PayAppCancelParams {
  userId: string;
  linkKey: string;
  mulNo: string; // 결제요청번호 (trade_id)
  cancelMemo: string;
  cancelMode?: 'ready'; // ready인 경우 결제요청 상태만 취소
  partCancel?: 0 | 1; // 0:전체취소, 1:부분취소
  cancelPrice?: number; // 부분취소 금액
  cancelTaxable?: number; // 과세 공급가액
  cancelTaxfree?: number; // 면세 공급가액
  cancelVat?: number; // 부가세
}

interface PayAppCancelRequestParams {
  userId: string;
  linkKey: string;
  mulNo: string;
  cancelMemo: string;
  dpName?: string; // 입금자명
  partCancel?: 0 | 1;
  cancelPrice?: number;
  cancelTaxable?: number;
  cancelTaxfree?: number;
  cancelVat?: number;
}

/**
 * PayApp 결제(요청,승인) 취소
 * D+5일 이전, 정산 전 취소
 */
export async function cancelPayment(params: PayAppCancelParams) {
  const formData = new URLSearchParams();
  formData.append('cmd', 'paycancel');
  formData.append('userid', params.userId);
  formData.append('linkkey', params.linkKey);
  formData.append('mul_no', params.mulNo);
  formData.append('cancelmemo', params.cancelMemo);

  if (params.cancelMode) {
    formData.append('cancelmode', params.cancelMode);
  }
  if (params.partCancel !== undefined) {
    formData.append('partcancel', params.partCancel.toString());
  }
  if (params.cancelPrice) {
    formData.append('cancelprice', params.cancelPrice.toString());
  }
  if (params.cancelTaxable) {
    formData.append('cancel_taxable', params.cancelTaxable.toString());
  }
  if (params.cancelTaxfree) {
    formData.append('cancel_taxfree', params.cancelTaxfree.toString());
  }
  if (params.cancelVat) {
    formData.append('cancel_vat', params.cancelVat.toString());
  }

  try {
    const response = await fetch(PAYAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const text = await response.text();
    const result = new URLSearchParams(text);

    const state = result.get('state');
    const errorMessage = result.get('errorMessage');

    if (state === '1') {
      return {
        success: true,
        message: '결제가 취소되었습니다.',
      };
    } else {
      return {
        success: false,
        error: errorMessage || '결제 취소에 실패했습니다.',
      };
    }
  } catch (error) {
    console.error('PayApp cancel error:', error);
    return {
      success: false,
      error: 'PayApp API 호출 중 오류가 발생했습니다.',
    };
  }
}

/**
 * PayApp 결제 취소 요청
 * D+5일 이후 또는 정산 완료된 경우
 */
export async function requestPaymentCancellation(params: PayAppCancelRequestParams) {
  const formData = new URLSearchParams();
  formData.append('cmd', 'paycancelreq');
  formData.append('userid', params.userId);
  formData.append('linkkey', params.linkKey);
  formData.append('mul_no', params.mulNo);
  formData.append('cancelmemo', params.cancelMemo);

  if (params.dpName) {
    formData.append('dpname', params.dpName);
  }
  if (params.partCancel !== undefined) {
    formData.append('partcancel', params.partCancel.toString());
  }
  if (params.cancelPrice) {
    formData.append('cancelprice', params.cancelPrice.toString());
  }
  if (params.cancelTaxable) {
    formData.append('cancel_taxable', params.cancelTaxable.toString());
  }
  if (params.cancelTaxfree) {
    formData.append('cancel_taxfree', params.cancelTaxfree.toString());
  }
  if (params.cancelVat) {
    formData.append('cancel_vat', params.cancelVat.toString());
  }

  try {
    const response = await fetch(PAYAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const text = await response.text();
    const result = new URLSearchParams(text);

    const state = result.get('state');
    const errorMessage = result.get('errorMessage');

    if (state === '1') {
      return {
        success: true,
        message: '취소 요청이 접수되었습니다.',
        data: {
          dpName: result.get('cr_dpname'),
          partCancel: result.get('partcancel'),
          paybackPrice: result.get('paybackprice'),
          partPrice: result.get('partprice'),
          cancelTaxable: result.get('cancel_taxable'),
          cancelVat: result.get('cancel_vat'),
          cancelTaxfree: result.get('cancel_taxfree'),
          paybackBank: result.get('paybackbank'),
        },
      };
    } else {
      return {
        success: false,
        error: errorMessage || '취소 요청에 실패했습니다.',
      };
    }
  } catch (error) {
    console.error('PayApp cancel request error:', error);
    return {
      success: false,
      error: 'PayApp API 호출 중 오류가 발생했습니다.',
    };
  }
}
