'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';


export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSticky, setShowSticky] = useState(true);
  const buttonSectionRef = useRef<HTMLDivElement>(null);
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);
  const accordionList = [
    {
      title: '상품 정보 고시',
      content: '여기에 상품 정보 고시 내용을 입력하세요.'
    },
    {
      title: '결제/변경/해지/환불 안내',
      content: '여기에 결제, 변경, 해지, 환불 안내 내용을 입력하세요.'
    },
    {
      title: '상품 이용 안내',
      content: '여기에 상품 이용 안내 내용을 입력하세요.'
    },
    {
      title: '판매자 정보',
      content: '여기에 판매자 정보를 입력하세요.'
    }
  ];
  const [showSheet, setShowSheet] = useState(false);
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreements, setAgreements] = useState([false, false, false]);
  const [showTerms, setShowTerms] = useState(false);
  const [showSubscriptionTerms, setShowSubscriptionTerms] = useState(false);

  useEffect(() => {
    // URL에서 토큰 확인 (OAuth 리다이렉트)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      // Header에 로그인 상태 변경 알림
      window.dispatchEvent(new Event('authChange'));
      // URL 정리
      window.history.replaceState({}, '', '/');
    }
    
    // 로그인 상태 확인 (쿠키 또는 로컬스토리지)
    const token = localStorage.getItem('token');
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
    return () => window.removeEventListener('scroll', handleScroll);
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

  const handleAgreeAll = () => {
    const next = !agreeAll;
    setAgreeAll(next);
    setAgreements([next, next, next]);
  };
  const handleAgreement = (idx: number) => {
    const next = agreements.map((v, i) => (i === idx ? !v : v));
    setAgreements(next);
    setAgreeAll(next.every(Boolean));
  };

  return (
    <main className={styles.main_wrapper}>
      <div className={styles.mobileWrapper}>
        <div className={styles.heroBadge}>
          <span className={styles.heroTitle}>한평생 올케어</span>
        </div>
        <p className={styles.heroSubtitle}>한 번의 구독으로, 시작부터 취업 도움까지</p>
        <div className={styles.mainImage}></div>
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
            출석 100%, 기말고사, 중간고사 응시 기준*
          </div>
        </div>
         </div>
            <div className={styles.pointCardSection}>
        <div className={styles.pointCard}>
          <div className={styles.pointBadge}>POINT 2</div>
          <div className={styles.pointTitle}>학습자 맞춤 관리</div>
          
            <img src="/images/main_img_003.png" alt="맞춤 관리 아이콘" className={styles.pointImage} />
          
          <div className={styles.pointDesc}>
            구독 기간 동안 원하는 직업훈련 과정을<br/>
자유롭게 수강하실 수 있습니다.
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
            미구독자 이용 시 비용 발생*
          </div>
        </div>
        </div>
      <div ref={buttonSectionRef} className={styles.buttonSection}>
        <button className={styles.subscribeButton} onClick={handleSheetOpen}>한평생올케어 구독하기</button>
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
          <div className={styles.subscribeSheet}>
            <button className={styles.modalCloseBtn} onClick={handleSheetClose}>&times;</button>
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
                if (agreeAll) {
                  try {
                    // PayApp API 결제 요청
                    const response = await fetch('/api/payments', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        amount: 20000,
                        productName: '한평생 올케어 월간 이용권',
                        productType: 'subscription',
                        billingCycle: 'monthly'
                      }),
                    });
                    
                    const data = await response.json();
                    
                    if (data.paymentUrl) {
                      // PayApp 결제 페이지로 리다이렉트
                      window.location.href = data.paymentUrl;
                    } else {
                      alert('결제 요청에 실패했습니다.');
                    }
                  } catch (error) {
                    console.error('Payment error:', error);
                    alert('결제 처리 중 오류가 발생했습니다.');
                  }
                }
              }}
              disabled={!agreeAll}
            >
              한평생올케어 시작하기
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
            <div className={openAccordion === idx ? styles.accordionContent + ' ' + styles.accordionContentOpen : styles.accordionContent}>
              {item.content}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
