'use client';

import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import AlertModal from '@/components/AlertModal';
import Footer from '@/components/Footer';
import { loadPayAppSDK } from '@/lib/payapp';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';
import BottomSheetHandle from '@/components/BottomSheetHandle';

// PayApp SDK 타입 정의
declare global {
  interface Window {
    PayApp: {
      setDefault: (key: string, value: string) => typeof window.PayApp;
      setParam: (key: string, value: string) => typeof window.PayApp;
      call: (params?: Record<string, string>) => void;
      payrequest: () => void;
      rebill: () => void;
    };
  }
}


export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSticky, setShowSticky] = useState(true);
  const buttonSectionRef = useRef<HTMLDivElement>(null);
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);
  const accordionList = [
    {
      title: '상품 정보 고시',
      content: '<b>상품명</b><br/> 한평생 올케어 구독 서비스<br/><br/> <b>상품 유형</b><br/> 디지털 콘텐츠 및 교육·매칭 지원이 결합된 구독형 서비스<br/><br/> <b>구독 요금</b><br/>월 20,000원 (부가세 포함)<br/><br/><b> 구독 기간</b><br/>결제일로부터 1개월 단위 자동 갱신<br/><br/><b> 제공 서비스 내용</b><br/> 1. 미이수 환급 보장 서비스<br/> 2. 한평생 직업훈련원 온라인 과정 무료수강권<br/> 3.실습매칭 프로그램 열람권<br/> <br/><b>서비스 개시 시점</b><br/>결제 즉시 자동 제공'
    },
    {
      title: '결제/변경/해지/환불 안내',
      content: '<strong>1. 청약철회 제한</strong><br/>본 상품은 결제 즉시 제공되는 디지털 콘텐츠 및 교육 서비스가 포함된 상품으로, 전자상거래법 제17조 제2항에 따라 단순 변심에 의한 청약철회가 제한됩니다.<br/><br/><strong>2. 구독 해지</strong><br/>구독 해지는 가능하나, 구독 기간 중 제공된 서비스가 존재할 경우 위약금이 발생합니다.<br/>해지는 다음 결제일 이전에 신청해야 하며, 이미 결제된 이용료는 원칙적으로 환불되지 않습니다.<br/><br/><strong>3. 중도 해지 위약금</strong><br/>구독 기간 중 해지 시, 아래 항목을 기준으로 위약금이 산정됩니다.<br/><strong>[위약금 구성]</strong><br/>- 이미 제공된 디지털 콘텐츠 이용 대가<br/>- 무료수강권 제공에 따른 할인분 환산 금액<br/>- 실습매칭 프로그램 열람권 제공에 따른 이용료<br/>위약금은 잔여 기간 요금의 50~100% 범위 내에서 산정될 수 있으며, 회사 내부 기준에 따라 개별 산정됩니다.<br/>위약금이 결제 금액을 초과할 경우, 환불은 발생하지 않습니다.<br/><br/><strong>4. 환불 불가 항목</strong><br/>무료 제공된 수강권, 열람권, 콘텐츠 이용 내역은 환불 및 현금 환산이 불가합니다.<br/>이용 여부와 관계없이, 제공 사실만으로 이용한 것으로 간주됩니다.'
    },
    {
      title: '상품 이용 안내',
      content: '<strong>1. 미이수 환급 보장 서비스</strong><br/>본 서비스는 회사가 지정한 교육기관 및 과정에 한해 적용됩니다.<br/>환급 보장은 아래 모든 조건을 충족한 경우에만 적용됩니다.<br/><strong>[환급 조건]</strong><br/>- 출석률 100% 달성<br/>- 중간고사 및 기말고사 모두 응시<br/>- 회사가 안내한 학습 가이드 및 절차를 성실히 이행할 것<br/>위 조건 중 단 하나라도 미충족 시 환급 대상에서 제외됩니다.<br/>개인 사정, 단순 미응시, 시스템 미확인, 안내 미숙지 등은 환급 사유로 인정되지 않습니다.<br/><br/><strong>2. 직업훈련원 무료수강권</strong><br/>무료수강권은 수강료에 한해 제공됩니다.<br/>자격증 발급비, 응시료, 재발급 비용 등은 수강생 본인 부담입니다.<br/>무료수강권은 구독 기간 내 1회에 한해 사용 가능하며, 미사용 시 소급 적용 또는 환불되지 않습니다.<br/><br/><strong>3. 실습매칭 프로그램 열람권</strong><br/>본 서비스는 실습기관 자동 매칭 정보 열람 서비스입니다.<br/>회사는 실습기관 섭외, 배정, 실습 성사 여부에 대해 보장하지 않습니다.<br/>실습기관과의 연락, 일정 조율, 실습 진행은 전적으로 이용자 책임입니다.<br/>열람권은 구독 기간 동안만 제공되며, 종료 후 접근이 제한됩니다.'
    },
    {
      title: '판매자 정보',
      content: '상호명: 한평생 올케어<br/>운영사: ㈜한평생그룹<br/>대표자: 양병웅<br/>사업자등록번호: 392-88-03618<br/>주소: 서울특별시 도봉구 도봉로150다길 61, 601호<br/>고객센터 이메일: korhrdpartners@gmail.com'
    }
  ];
  const [showSheet, setShowSheet] = useState(false);
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const [sheetTransitionEnabled, setSheetTransitionEnabled] = useState(true);
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreements, setAgreements] = useState([false, false, false]);
  const [showTerms, setShowTerms] = useState(false);
  const [showSubscriptionTerms, setShowSubscriptionTerms] = useState(false);
  const [isPayAppLoaded, setIsPayAppLoaded] = useState(false);
  const [isPayAppLoading, setIsPayAppLoading] = useState(false);
  const [payappLoadError, setPayappLoadError] = useState<string | null>(null);

  useEffect(() => {
    // URL에서 토큰 확인 (OAuth 리다이렉트)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      console.log('[메인 페이지] 토큰 받음, localStorage에 저장');
      localStorage.setItem('token', urlToken);
      // Header에 로그인 상태 변경 알림
      window.dispatchEvent(new Event('authChange'));
      // URL 정리
      window.history.replaceState({}, '', '/');
    }
    
    // 로그인 상태 확인 (쿠키 또는 로컬스토리지)
    const token = localStorage.getItem('token');
    console.log('[메인 페이지] localStorage 토큰:', token ? '있음' : '없음');
    setIsLoggedIn(!!token);

    // Sticky button observer
    const handleScroll = () => {
      if (!buttonSectionRef.current) return;
      const rect = buttonSectionRef.current.getBoundingClientRect();
      // 버튼 섹션이 화면에 보이면 스티키 버튼 숨김
      setShowSticky(!(rect.top < window.innerHeight && rect.bottom > 0));
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // 결제 결과 수신 (팝업 창으로부터)
    const handlePaymentResult = (event: MessageEvent) => {
      if (event.data.type === 'paymentResult') {
        const { status, orderId, amount, message } = event.data.data;
        
        if (status === 'success') {
          // Navigate main UI to success page so user sees result on main window
          try {
            router.push('/payment/success');
          } catch (e) {
            window.location.href = '/payment/success';
          }
        } else {
          alert(`결제에 실패했습니다.\n${message || '다시 시도해 주세요.'}`);
        }
        
        // 시트 닫기
        setShowSheet(false);
      }
    };
    
    window.addEventListener('message', handlePaymentResult);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('message', handlePaymentResult);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsPayAppLoading(true);
    loadPayAppSDK({ retries: 3, timeout: 8000 })
      .then(() => {
        if (!mounted) return;
        setIsPayAppLoaded(true);
        setIsPayAppLoading(false);
        if ((window as any).PayApp) {
          const userId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
          try {
            window.PayApp.setDefault('userid', userId);
            window.PayApp.setDefault('shopname', process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어');
          } catch (e) {
            console.warn('PayApp setDefault failed', e);
          }
        }
      })
      .catch((err) => {
        console.error('PayApp load failed:', err);
        if (!mounted) return;
        setIsPayAppLoading(false);
        setPayappLoadError(String(err?.message || err));
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Prevent background scroll when subscribeSheet is open
  useEffect(() => {
    if (showSheet) {
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('no-scroll');
    } else {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('no-scroll');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('no-scroll');
    };
  }, [showSheet]);

  const handleLogout = async () => {
    try {
      // Supabase 로그아웃 (카카오)
      await supabase.auth.signOut();
      
      // 서버 로그아웃 API 호출 (네이버 쿠키 삭제)
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      // 로컬 스토리지 토큰 삭제
      localStorage.removeItem('token');
      
      // Header에 로그아웃 상태 변경 알림
      window.dispatchEvent(new Event('authChange'));
      
      // 상태 업데이트
      setIsLoggedIn(false);
      
      alert('로그아웃 되었습니다.');
      router.push('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const handleSheetOpen = () => setShowSheet(true);
  const handleSheetClose = () => setShowSheet(false);

  // Drag handlers for bottom sheet (pull down to close)
  const handleDragStart = (clientY: number) => {
    draggingRef.current = true;
    startYRef.current = clientY;
    setSheetTransitionEnabled(false);
    setDragY(0);
  };

  const handleDrag = (clientY: number) => {
    if (!draggingRef.current) return;
    const dy = Math.max(0, clientY - startYRef.current);
    setDragY(dy);
  };

  const handleDragEnd = (clientY: number) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const dy = Math.max(0, clientY - startYRef.current);
    const THRESHOLD = 120; // px to trigger close
    setSheetTransitionEnabled(true);
    if (dy > THRESHOLD) {
      // close sheet
      setShowSheet(false);
      setDragY(0);
    } else {
      // animate back
      setDragY(0);
    }
  };

  // 동의 체크 로직 개선: 상태 동기화 보장
  const handleAgreeAll = () => {
    setAgreeAll((prev) => {
      const next = !prev;
      setAgreements([next, next, next]);
      return next;
    });
  };
  const handleAgreement = (idx: number) => {
    setAgreements((prev) => {
      const next = prev.map((v, i) => (i === idx ? !v : v));
      setAgreeAll(next.every(Boolean));
      return next;
    });
  };

  return (
    <>
      <Head>
        <link rel="preload" as="image" href="/images/main_banner.png" />
      </Head>
      {showLoginModal && (
        <AlertModal
          message="로그인이 필요합니다."
          onClose={() => {
            setShowLoginModal(false);
            setShowSheet(false);
            router.push('/auth/login');
          }}
        />
      )}
      {/* PayApp SDK is loaded via loadPayAppSDK util */}
      <main className={styles.main_wrapper}>
      <div className={styles.mobileWrapper}>
        <p className={styles.heroSubtitle}>시작부터 끝까지 안전하게</p>
        <div className={styles.heroBadge}>
          
          <span className={styles.heroTitle}>한평생 올케어</span>
        </div>
        
        
      </div>
      <div className={styles.descriptionSection}>
        <span className={styles.descriptionText}>학습은 안전히 학습자 올케어 서비스</span>
        <span className={styles.priceText}>월 2만원</span>
      </div>
      <div className={styles.pointCardSection}>
        <div className={styles.pointCard}>
          <div className={styles.pointBadge}>POINT 1</div>
          <div className={styles.pointTitle}>미이수 전액환급 보장</div>
            <img src="/images/main_img_002.png" alt="환급 아이콘"  className={styles.pointImage}/>
          <div className={styles.pointDesc}>
            수강을 다 했는데도 이수하지 못했다면<br/>해당 과목은 전액환급을 보장합니다.
          </div>
          <div className={styles.pointNote}>
            출석 100%, 기말고사, 중간고사 응시 기준*<br/>
미이수 환급대상이 아니라면 30~60만원 추가발생**
          </div>
        </div>
         </div>
            <div className={styles.pointCardSection}>
        <div className={styles.pointCard}>
          <div className={styles.pointBadge}>POINT 2</div>
          <div className={styles.pointTitle}>직업훈련과정 무료수강권</div>
          
            <img src="/images/main_img_003.png" alt="맞춤 관리 아이콘" className={styles.pointImage} />
          
          <div className={styles.pointDesc}>
            한평생 직업훈련원의 모든과정을<br/>무료로 자유롭게 수강하실수 있습니다.
          </div>
   <div className={styles.pointNote}>
           올케어 미구독시 1과정당 수강료 40만원*<br/>
자격증 발급비 별도**
          </div>
        </div>
        </div>
        <div className={styles.pointCardSection}>
        <div className={styles.pointCard}>
          <div className={styles.pointBadge}>POINT 3</div>
          <div className={styles.pointTitle}>취업 연계 지원</div>
          
            <img src="/images/main_img_004.png" alt="취업 지원 아이콘" className={styles.pointImage} />
          
          <div className={styles.pointDesc}>
          내 거주지 근처 실습처를 쉽게 검색할 수 있는<br/>실습매칭 시스템을 무료로 이용할 수 있습니다.
          </div>
          <div className={styles.pointNote}>
            미구독자 열람 시 150,000원 발생*
          </div>
        </div>
        </div>
      {showSticky && (
        <div className={styles.stickyButton}>
          <div className={styles.stickyButtonInner}>
            <button className={styles.subscribeButton} onClick={handleSheetOpen}>한평생올케어 구독하기</button>
          </div>
        </div>
      )}
      {showSheet && (
        <>
          <div className={styles.modalOverlay} onClick={handleSheetClose} />
          <div
            className={`${styles.subscribeSheet} ${sheetTransitionEnabled ? styles.withTransition : styles.dragging}`}
            style={{ transform: `translateX(-50%) translateY(${dragY}px)` }}
          >
              <div className={styles.sheetHandleContainer}>
                <BottomSheetHandle
                  onClick={handleSheetClose}
                  hint=""
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                />
              </div>
              <div className={styles.sheetTitle}>한평생 올케어 월간 이용권</div>
            <div className={styles.sheetSub}>월 <span className={styles.sheetPrice}>20,000원</span> 결제</div>
            <hr className={styles.sheetDivider} />
            <div className={styles.sheetAgreeRow}>
              <span className={styles.sheetAgreeAll}>모두 동의합니다.</span>
              <span
                className={`${styles.sheetCheckbox} ${agreeAll ? styles.sheetCheckboxChecked : ''}`}
                onClick={handleAgreeAll}
              >
                {agreeAll && (
                  <svg className={styles.sheetCheckIcon} xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z" fill="#fff"/>
                  </svg>
                )}
              </span>
            </div>
            {[
              <span className={styles.sheetAgreeSub}>이용권 정기결제 동의 <span className={styles.sheetAgreeRequired}>(필수)</span></span>,
              <span>
                <span className={styles.sheetAgreeUnderline} onClick={() => setShowTerms(true)}>이용약관</span>
                <span className={styles.sheetAgreeAnd}> 및 </span>
                <span className={styles.sheetAgreeUnderline} onClick={() => setShowSubscriptionTerms(true)}>결제 및 구독 유의사항</span>
                <span className={styles.sheetAgreeRequired}> (필수)</span>
              </span>,
              <span><span className={styles.sheetAgreeUnderline} onClick={() => setShowTerms(true)}>멤버십 제3자 개인정보 제공</span><span className={styles.sheetAgreeRequired}> (필수)</span></span>
            ].map((txt, idx: number) => (
              <div className={styles.sheetAgreeRow} key={idx}>
                {txt}
                <span
                  className={`${styles.sheetCheckbox} ${agreements[idx] ? styles.sheetCheckboxChecked : ''}`}
                  onClick={() => handleAgreement(idx)}
                >
                  {agreements[idx] && (
                    <svg className={styles.sheetCheckIcon} xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z" fill="#fff"/>
                    </svg>
                  )}
                </span>
              </div>
            ))}
            <button 
              className={`${styles.sheetButton} ${!agreeAll ? styles.sheetButtonDisabled : ''}`} 
              onClick={async () => {
                if (!agreeAll) return;
                
                if (!isPayAppLoaded || !window.PayApp) {
                  alert('결제 시스템을 로딩 중입니다. 잠시 후 다시 시도해주세요.');
                  return;
                }

                try {
                  // 로그인 체크
                  const token = localStorage.getItem('token');
                  if (!token) {
                    setShowLoginModal(true);
                    return;
                  }
      {showLoginModal && (
        <AlertModal
          message="로그인이 필요합니다."
          onClose={() => {
            setShowLoginModal(false);
            setShowSheet(false);
            router.push('/auth/login');
          }}
        />
      )}

                  // API를 통해 사용자 정보 가져오기
                  const userResponse = await fetch('/api/user/profile', {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });

                  if (!userResponse.ok) {
                    alert('사용자 정보를 가져올 수 없습니다. 다시 로그인해주세요.');
                    localStorage.removeItem('token');
                    router.push('/auth/login');
                    return;
                  }

                  const { name, phone } = await userResponse.json();

                  if (!name || !phone) {
                    alert('사용자 정보(이름, 연락처)가 없습니다. 회원정보를 먼저 입력해주세요.');
                    return;
                  }

                  // localStorage에서 토큰 가져와서 user_id 추출
                  let userId = '';
                  try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userId = payload.userId || '';
                  } catch (e) {
                    console.error('Token parse error:', e);
                  }

                  // 현재 도메인 가져오기 (배포 환경 대응)
                  const baseUrl = window.location.origin;
                  const shopName = process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어';
                  const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';

                  if (!payappUserId) {
                    alert('결제 시스템 설정 오류입니다. 관리자에게 문의하세요.');
                    console.error('PAYAPP_USER_ID is not set');
                    return;
                  }

                  // PayApp 초기화
                  window.PayApp.setDefault('userid', payappUserId);
                  window.PayApp.setDefault('shopname', shopName);
                  
                  // 현재 날짜 기준으로 설정
                  const now = new Date();
                  
                  // 구독 만료일 계산 (1년 후)
                  const expireDate = new Date(now);
                  expireDate.setFullYear(expireDate.getFullYear() + 1);
                  const rebillExpire = expireDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
                  
                  // 결제일: 오늘 날짜 (1~31)
                  const rebillCycleMonth = now.getDate().toString();
                  
                  // user_id를 var1에 포함
                  const orderData = {
                    orderId: `ORDER-${Date.now()}`,
                    userId: userId,
                    phone: phone,
                    name: name,
                    mode: 'new'
                  };
                  
                  // 정기결제 정보 설정
                  window.PayApp.setParam('goodname', '올케어구독상품');
                  window.PayApp.setParam('goodprice', '20000');
                  window.PayApp.setParam('recvphone', phone);
                  window.PayApp.setParam('buyername', name);
                  window.PayApp.setParam('smsuse', 'n');
                  window.PayApp.setParam('rebillCycleType', 'Month');
                  window.PayApp.setParam('rebillCycleMonth', rebillCycleMonth);
                  window.PayApp.setParam('rebillExpire', rebillExpire);
                  window.PayApp.setParam('feedbackurl', `${baseUrl}/api/payments/webhook`);
                  window.PayApp.setParam('returnurl', `${baseUrl}/payment/success`);
                  window.PayApp.setParam('var1', JSON.stringify(orderData));
                  
                  console.log('Payment request:', {
                    userid: payappUserId,
                    shopname: shopName,
                    goodname: '올케어구독상품',
                    goodprice: '20000',
                    buyername: name,
                    recvphone: phone,
                    rebillCycleType: 'Month',
                    rebillCycleMonth,
                    rebillExpire,
                    baseUrl,
                    orderData
                  });
                  
                  // 정기결제 호출
                  window.PayApp.rebill();
                  
                  // 시트 닫기
                  setShowSheet(false);
                } catch (error) {
                  console.error('Payment error:', error);
                  alert('결제 처리 중 오류가 발생했습니다.');
                }
              }}
              disabled={!agreeAll || !isPayAppLoaded}
            >
              {!isPayAppLoaded ? (isPayAppLoading ? '결제 시스템 로딩중...' : '결제 시스템 로딩 실패') : '한평생올케어 시작하기'}
            </button>
          </div>
        </>
      )}
      {showTerms && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowTerms(false)} />
          <div className={styles.modalContent}>
            <button className={styles.modalCloseBtn} onClick={() => setShowTerms(false)}>&times;</button>
            <div className={styles.modalTitle}>이용약관</div>
            <div className={styles.modalBody}>
제1조 (서비스의 정의)<br/>
본 서비스는 학습자의 원활한 학위 취득 및 자격증 취득을 돕기 위해 다음의 항목을 제공하는 1년 정기 구독형 서비스입니다.<br/>
- 학점은행제 수강료 할인 및 미이수 전액환급 보장<br/>
- 한평생 직업훈련 무료수강 이용권<br/>
- 올케어 실습 매칭 시스템 이용권<br/>
<br/>
제2조 (혜택별 이행 조건 및 면책)<br/>
- 학점은행제 수강료 할인 및 미이수 전액환급 보장: 본 혜택은 한평생교육에서 지정한 학점은행제 교육기관에서 수강하는 경우에만 적용됩니다. 회사가 지정하지 않은 타 교육기관에서 개별적으로 수강한 경우에는 할인 및 환급 보장 대상에서 제외됩니다. 출석률 100% 달성 및 모든 시험(중간·기말) 응시 조건을 충족했음에도 미이수(F학점 등)가 발생한 경우에 한해 보장됩니다.<br/>
- 한평생 직업훈련 무료수강 이용권: 한평생교육은 한평생직업훈련 무료수강 이용권을 제공하며, 학습자는 직접 외부 사이트에 가입 후 이를 등록해야 합니다. 수강료 외 자격증 발급비 등 행정 수수료는 본인 부담입니다.<br/>
- 실습 매칭 시스템 이용권: 한평생교육은 전국의 실습처 정보를 분류하여 제공하는 '정보 제공자'의 역할을 수행합니다.<br/>
학습자는 시스템 내 게시된 실습처별 상세 설명 및 주의사항을 숙지해야 하며, 이를 확인하지 않아 발생한 불이익은 회사가 책임지지 않습니다.<br/>
실습 신청 및 서류(신청서, 증명서 등) 제출은 학습자 본인이 직접 수행해야 하며, 본인 부주의로 인한 누락은 한평생교육의 면책 사유입니다.<br/>
실습 가능 여부 및 수강 신청 결과는 해당 기관의 내부 사정에 따라 변동될 수 있습니다.<br/>
<br/>
제3조 (환불 및 중도 해지)<br/>
- 서비스 개시: 본 서비스는 결제 즉시 '수강료 할인 혜택' 및 '정보 열람 권한'이 부여되므로, 결제 완료 시 서비스 이용이 개시된 것으로 간주합니다.<br/>
- 위약금: 중도 해지 시 총 결제 금액의 **[ ]%**를 행정 서비스 유지 및 해지 위약금으로 차감합니다.<br/>
- 할인 회수: 1년 구독을 조건으로 제공된 혜택이므로, 중도 해지 시 이미 적용받은 수강료 할인 차액(정상가 - 할인가)을 공제한 후 잔여 금액을 환불합니다.<br/>
            </div>
          </div>
        </>
      )}
      {showSubscriptionTerms && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowSubscriptionTerms(false)} />
          <div className={styles.modalContent}>
            <button className={styles.modalCloseBtn} onClick={() => setShowSubscriptionTerms(false)}>&times;</button>
            <div className={styles.modalTitle}>구독 및 결제 안내</div>
            <div className={styles.modalBody}>
<strong>[구독 및 결제 안내]</strong><br/>
본 상품은 1년 정기 구독 상품으로, 최초 가입일 기준 1년마다 정기 결제가 발생합니다.<br/>
결제와 동시에 '수강료 할인' 및 '매칭 시스템 접속 권한'이 부여됩니다.<br/>
<br/>
<strong>[환불 및 해지 유의사항 - 필독]</strong><br/>
청약철회 제한: 결제 후 아래 서비스 중 하나라도 이용한 경우, 디지털 콘텐츠 이용이 개시된 것으로 간주하여 환불 및 청약철회가 불가능합니다.<br/>
<br/>
- 학점은행제 수강신청 시 할인 혜택을 적용받은 경우<br/>
- 실습 매칭 시스템에 접속하여 정보를 열람한 경우<br/>
- 직업훈련 수강권(쿠폰 번호)을 확인하거나 발급받은 경우<br/>
- 중도 해지 시 공제: 환불 가능 대상일지라도 중도 해지 시에는 [위약금( %)]과 [수강료 할인 차액]을 차감한 후 정산됩니다.<br/>
<br/>
<strong>[학습자 주의 의무]</strong><br/>
학습자 귀책에 대한 면책 : 현장실습기관, 실습과목 교육원별 상세 공지 미숙지, 서류(선이수 과목 증명서 등) 제출 누락, 기한 초과 등 학습자 본인의 귀책으로 발생한 실습 미이수 및 신청 거절은 한평생교육이 책임지지 않으며, 이를 이유로 환불을 요구할 수 없습니다.<br/>
<br/>
간접 손해 및 결과적 손해의 부인: 회사는 본 서비스 이용과 관련하여 학습자에게 발생한 자격증 취득 지연, 취업 실패, 임금 손실 등 일체의 간접적·결과적·특별 손해에 대하여 보상하거나 배상할 책임이 없습니다.<br/>
<br/>
제3자 귀책 : 한평생 직업훈련 수강권 이용 시 발생하는 자격증 발급 비용은 서비스 금액에 포함되어 있지 않으며, 본인 별도 부담입니다.<br/>
            </div>
          </div>
        </>
      )}
      <div className={styles.productNoticeSection}>
        <div className={styles.productNoticeTitle}>상품고시</div>
        {accordionList.map((item, idx) => (
          <div className={styles.accordionItem} key={idx}>
            <div
              className={styles.accordionHeader}
              onClick={() => setOpenAccordion(openAccordion === idx ? null : idx)}
            >
              <span>{item.title}</span>
              <span className={openAccordion === idx ? styles.accordionIcon + ' ' + styles.accordionIconOpen : styles.accordionIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M17.9475 5.58042C17.7131 5.34608 17.3952 5.21444 17.0637 5.21444C16.7323 5.21444 16.4144 5.34608 16.18 5.58042L9.99249 11.7679L3.80499 5.58042C3.56924 5.35272 3.25349 5.22673 2.92574 5.22958C2.598 5.23243 2.28448 5.36389 2.05272 5.59565C1.82096 5.82741 1.6895 6.14092 1.68665 6.46867C1.6838 6.79642 1.8098 7.11217 2.0375 7.34792L9.10874 14.4192C9.34315 14.6535 9.66104 14.7852 9.99249 14.7852C10.3239 14.7852 10.6418 14.6535 10.8762 14.4192L17.9475 7.34792C18.1818 7.11351 18.3135 6.79563 18.3135 6.46417C18.3135 6.13272 18.1818 5.81483 17.9475 5.58042Z" fill="#919191"/>
                </svg>
              </span>
            </div>
            <div
              className={openAccordion === idx ? styles.accordionContent + ' ' + styles.accordionContentOpen : styles.accordionContent}
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          </div>
        ))}
      </div>
      <Footer />
    </main>
    
    </>
  );
}
