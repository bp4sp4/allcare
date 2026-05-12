'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';

const PACKAGES_NORMAL = [
  { id: 'high' as const,    name: '사회복지사 고등학교 졸업자 패키지', price: 1170000 },
  { id: 'college' as const, name: '사회복지사 대학교 졸업자 패키지',   price: 720000  },
];
const PACKAGES_ALLCARE = [
  { id: 'allcare_high' as const,    name: '사회복지사 고등학교 졸업자 올케어 패키지', price: 1300000 },
  { id: 'allcare_college' as const, name: '사회복지사 대학교 졸업자 올케어 패키지',   price: 800000  },
];

const CHECK_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z"
      fill="#fff" />
  </svg>
);

export default function MainPage() {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [packageCategory, setPackageCategory] = useState<'normal' | 'allcare'>('normal');
  const [showSheet, setShowSheet] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<'high' | 'college' | 'allcare_high' | 'allcare_college'>('high');
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreements, setAgreements] = useState([false, false, false]);
  const [showTerms, setShowTerms] = useState(false);
  const [showSubTerms, setShowSubTerms] = useState(false);
  const [showThirdParty, setShowThirdParty] = useState(false);
  const [customPayment, setCustomPayment] = useState<{ id: string; subject: string; subject_count: number; amount: number } | null>(null);
  const [sheetMode, setSheetMode] = useState<'custom' | 'packages'>('packages');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [showMissingFields, setShowMissingFields] = useState(false);
  const [needName, setNeedName] = useState(false);
  const [needPhone, setNeedPhone] = useState(false);

  const PACKAGES = packageCategory === 'allcare' ? PACKAGES_ALLCARE : PACKAGES_NORMAL;
  const selectedPkgData = PACKAGES.find((p) => p.id === selectedPkg) ?? PACKAGES[0];;

  // 헤더에서 ?pkg=high/college 쿼리로 진입 시 시트 자동 열기
  useEffect(() => {
    // 단과반 결제 후 팝업에서 리턴된 경우 → 부모 창 리다이렉트 후 팝업 닫기
    const isPopup = window.opener && window.opener !== window;
    if (isPopup) {
      try { window.opener.location.href = window.location.href; window.close(); } catch {}
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const pkg = params.get('pkg');
    if (pkg === 'high' || pkg === 'college') {
      setSelectedPkg(pkg);
      setPackageCategory('normal');
      setSelectedPkg(pkg);
      setSheetMode('packages');
      setShowSheet(true);
      window.history.replaceState({}, '', '/');
    }

    // 미결제 단과반 요청 확인
    const token = localStorage.getItem('token');
    let userId = '';
    if (token) {
      try { userId = JSON.parse(atob(token.split('.')[1])).userId || ''; } catch {}
    }

    if (!userId) return;

    // 프로필에서 이름/전화번호 미리 불러오기
    fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.phone) setBuyerPhone(d.phone);
        if (d.name) setBuyerName(d.name);
      })
      .catch(() => {});

    // 초기 로드
    fetch('/api/custom-payment/pending', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.hasPending && data.requests?.length > 0) setCustomPayment(data.requests[0]);
      })
      .catch(() => {});

    // Supabase Realtime - 단과반 요청 실시간 감지
    const channel = supabase
      .channel(`custom-payment-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_payment_requests',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && (payload.new as any).status === 'pending') {
            setCustomPayment(payload.new as { id: string; subject: string; subject_count: number; amount: number });
          } else if (payload.eventType === 'UPDATE') {
            if ((payload.new as any).status === 'pending') {
              setCustomPayment(payload.new as { id: string; subject: string; subject_count: number; amount: number });
            } else {
              setCustomPayment(null);
            }
          } else if (payload.eventType === 'DELETE') {
            setCustomPayment(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 헤더 햄버거 메뉴에서 패키지 선택 시 시트 열기
  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent<{ type: 'high' | 'college' }>).detail?.type;
      if (type) { setPackageCategory('normal'); setSelectedPkg(type); }
      setSheetMode('packages');
      setShowSheet(true);
    };
    window.addEventListener('openPaymentSheet', handler);
    return () => window.removeEventListener('openPaymentSheet', handler);
  }, []);

  useEffect(() => {
    if (showSheet || showCategoryModal) {
      document.body.style.overflow = 'hidden';
      // 시트 열릴 때 초기화
      setAgreeAll(false);
      setAgreements([false, false, false]);
      setShowMissingFields(false);
      setNeedName(false);
      setNeedPhone(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showSheet, showCategoryModal]);

  const handleAgreeAll = () => {
    const next = !agreeAll;
    setAgreeAll(next);
    setAgreements([next, next, next]);
  };

  const handleAgreement = (idx: number) => {
    const next = [...agreements];
    next[idx] = !next[idx];
    setAgreements(next);
    setAgreeAll(next.every(Boolean));
  };

  const handlePayment = async () => {
    if (!agreeAll) return;

    if (!buyerName.trim() || !buyerPhone || !buyerPhone.match(/^01[0-9]{8,9}$/)) {
      setNeedName(!buyerName.trim());
      setNeedPhone(!buyerPhone || !buyerPhone.match(/^01[0-9]{8,9}$/));
      setShowMissingFields(true);
      return;
    }

    const token = localStorage.getItem('token');
    let userId = '';
    if (token) {
      try { userId = JSON.parse(atob(token.split('.')[1])).userId || ''; } catch {}
    }

    const res = await fetch('/api/payments/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageType: selectedPkg, recvphone: buyerPhone, buyerName: buyerName.trim(), userId }),
    });

    const data = await res.json();
    if (!res.ok || !data.payurl) {
      alert(data.error || '결제 요청에 실패했습니다.');
      return;
    }

    const w = 480, h = 700;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(data.payurl, 'payapp', `width=${w},height=${h},top=${top},left=${left},scrollbars=yes`);
  };

  const handleCustomPayment = async () => {
    if (!customPayment) return;
    const token = localStorage.getItem('token');
    if (!token) { alert('로그인이 필요합니다.'); return; }

    const res = await fetch('/api/payments/request-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId: customPayment.id, returnUrl: `${window.location.origin}/payment/custom?paid=${customPayment.id}` }),
    });

    const data = await res.json();
    if (!res.ok || !data.payurl) {
      alert(data.error || '결제 요청에 실패했습니다.');
      return;
    }

    const w = 480, h = 700;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(data.payurl, 'payapp', `width=${w},height=${h},top=${top},left=${left},scrollbars=yes`);
  };

  return (
    <main className={styles.mainWrapper}>
      <Image src="/social_01.png" alt="올케어 소개 1" width={500} height={800} className={styles.fullImage} priority />
      <Image src="/social_02.png" alt="올케어 소개 2" width={500} height={800} className={styles.fullImage} />
      <Image src="/social_03.png" alt="올케어 소개 3" width={500} height={800} className={styles.fullImage} />

      {/* 카테고리 선택 모달 */}
      {showCategoryModal && (
        <>
          <div className={styles.overlay} onClick={() => setShowCategoryModal(false)} />
          <div className={styles.sheet} style={{ paddingBottom: 40 }}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetTitle}>패키지를 선택해주세요</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => {
                  setPackageCategory('normal');
                  setSelectedPkg('high');
                  setShowCategoryModal(false);
                  setSheetMode('packages');
                  setShowSheet(true);
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '18px 20px', border: '1.5px solid #e0e0e0', borderRadius: 14,
                  background: '#fff', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111' }}>일반 패키지</span>
              </button>
              <button
                onClick={() => {
                  setPackageCategory('allcare');
                  setSelectedPkg('allcare_high');
                  setShowCategoryModal(false);
                  setSheetMode('packages');
                  setShowSheet(true);
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '18px 20px', border: '1.5px solid #0051FF', borderRadius: 14,
                  background: '#f0f4ff', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0051FF' }}>올케어 패키지</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 오버레이 */}
      {showSheet && <div className={styles.overlay} onClick={() => setShowSheet(false)} />}

      {/* 바텀시트 */}
      {showSheet && (
        <div className={styles.sheet}>
          <div className={styles.sheetHandle} />
          <div className={styles.sheetTitle}>
            {sheetMode === 'custom' ? '단과반 결제' : '수강료 결제하기'}
          </div>

          {sheetMode === 'custom' && customPayment ? (
            <>
              <div className={styles.pkgLabel}>결제 항목</div>
              <div className={styles.pkgCards}>
                <div className={`${styles.pkgCard} ${styles.pkgCardSelected}`}>
                  <span className={styles.pkgCardName}>단과반 - {customPayment.subject}</span>
                  <span className={styles.pkgCardPrice}>₩{customPayment.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className={styles.sheetSub}>
                <span className={styles.sheetPrice}> {customPayment.amount.toLocaleString()}원</span> 결제
              </div>
              <hr className={styles.divider} />

              {/* 모두 동의 */}
              <div className={styles.agreeRow}>
                <span className={styles.agreeAll}>모두 동의합니다.</span>
                <span className={`${styles.checkbox} ${agreeAll ? styles.checkboxChecked : ''}`} onClick={handleAgreeAll}>
                  {agreeAll && CHECK_SVG}
                </span>
              </div>

              {/* 개별 동의 */}
              {[
                <span className={styles.agreeSub}>이용권 결제 동의 <span className={styles.agreeRequired}>(필수)</span></span>,
                <span>
                  <span className={styles.agreeUnderline} onClick={() => setShowTerms(true)}>이용약관</span>
                  <span className={styles.agreeAnd}> 및 </span>
                  <span className={styles.agreeUnderline} onClick={() => setShowSubTerms(true)}>결제 및 구독 유의사항</span>
                  <span className={styles.agreeRequired}> (필수)</span>
                </span>,
                <span>
                  <span className={styles.agreeUnderline} onClick={() => setShowThirdParty(true)}>멤버십 제3자 개인정보 제공</span>
                  <span className={styles.agreeRequired}> (필수)</span>
                </span>,
              ].map((txt, idx) => (
                <div className={styles.agreeRow} key={idx}>
                  {txt}
                  <span className={`${styles.checkbox} ${agreements[idx] ? styles.checkboxChecked : ''}`} onClick={() => handleAgreement(idx)}>
                    {agreements[idx] && CHECK_SVG}
                  </span>
                </div>
              ))}

              <button
                className={`${styles.payBtn} ${!agreeAll ? styles.payBtnDisabled : ''}`}
                onClick={handleCustomPayment}
                disabled={!agreeAll}
              >
                {customPayment.amount.toLocaleString()}원 결제하기
              </button>
            </>
          ) : (
            <>
              {/* 패키지 카드 선택 */}
              <div className={styles.pkgLabel}>선택된 요금제</div>
              <div className={styles.pkgCards}>
                {PACKAGES.map((pkg) => (
                  <button
                    key={pkg.id}
                    className={`${styles.pkgCard} ${selectedPkg === pkg.id ? styles.pkgCardSelected : ''}`}
                    onClick={() => setSelectedPkg(pkg.id)}
                  >
                    <span className={styles.pkgCardName}>{pkg.name}</span>
                    <span className={styles.pkgCardPrice}>₩{pkg.price.toLocaleString()}</span>
                  </button>
                ))}
              </div>

              <div className={styles.sheetSub}>
                <span className={styles.sheetPrice}> {selectedPkgData.price.toLocaleString()}원</span> 결제
              </div>

              <hr className={styles.divider} />

              {/* 누락 정보 입력 - 결제 버튼 눌렀을 때만 표시 */}
              {showMissingFields && (
                <>
                  <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.85rem', color: '#dc2626' }}>
                    결제를 위해 아래 정보를 입력해주세요.
                  </div>
                  {needName && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: '#374151' }}>
                        이름 <span style={{ color: 'red' }}>*</span>
                      </div>
                      <input
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="홍길동"
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.75rem',
                          border: '1.5px solid #f87171',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#0051FF'}
                        onBlur={(e) => e.target.style.borderColor = '#f87171'}
                      />
                    </div>
                  )}
                  {needPhone && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: '#374151' }}>
                        연락처 <span style={{ color: 'red' }}>*</span>
                      </div>
                      <input
                        type="tel"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="01012345678"
                        maxLength={11}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.75rem',
                          border: '1.5px solid #f87171',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#0051FF'}
                        onBlur={(e) => e.target.style.borderColor = '#f87171'}
                      />
                    </div>
                  )}
                </>
              )}

              {/* 모두 동의 */}
              <div className={styles.agreeRow}>
                <span className={styles.agreeAll}>모두 동의합니다.</span>
                <span className={`${styles.checkbox} ${agreeAll ? styles.checkboxChecked : ''}`} onClick={handleAgreeAll}>
                  {agreeAll && CHECK_SVG}
                </span>
              </div>

              {/* 개별 동의 */}
              {[
                <span className={styles.agreeSub}>이용권 결제 동의 <span className={styles.agreeRequired}>(필수)</span></span>,
                <span>
                  <span className={styles.agreeUnderline} onClick={() => setShowTerms(true)}>이용약관</span>
                  <span className={styles.agreeAnd}> 및 </span>
                  <span className={styles.agreeUnderline} onClick={() => setShowSubTerms(true)}>결제 및 구독 유의사항</span>
                  <span className={styles.agreeRequired}> (필수)</span>
                </span>,
                <span>
                  <span className={styles.agreeUnderline} onClick={() => setShowThirdParty(true)}>멤버십 제3자 개인정보 제공</span>
                  <span className={styles.agreeRequired}> (필수)</span>
                </span>,
              ].map((txt, idx) => (
                <div className={styles.agreeRow} key={idx}>
                  {txt}
                  <span className={`${styles.checkbox} ${agreements[idx] ? styles.checkboxChecked : ''}`} onClick={() => handleAgreement(idx)}>
                    {agreements[idx] && CHECK_SVG}
                  </span>
                </div>
              ))}

              <button
                className={`${styles.payBtn} ${!agreeAll ? styles.payBtnDisabled : ''}`}
                onClick={handlePayment}
                disabled={!agreeAll}
              >
                수강료 결제하기
              </button>
            </>
          )}
        </div>
      )}

      {/* 이용약관 모달 */}
      {showTerms && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowTerms(false)} />
          <div className={styles.modalContent}>
            <button className={styles.modalCloseBtn} onClick={() => setShowTerms(false)}>&times;</button>
            <div className={styles.modalTitle}>이용약관</div>
            <div className={styles.modalBody}>
              제1조 (서비스의 정의)<br />
              본 서비스는 학습자의 원활한 학위 취득 및 자격증 취득을 돕기 위해 다음의 항목을 제공하는 서비스입니다.<br />
              - 학점은행제 수강료 할인 및 미이수 전액환급 보장<br />
              - 한평생 직업훈련 무료수강 이용권<br />
              - 올케어 실습 매칭 시스템 이용권<br /><br />
              제2조 (환불 및 중도 해지)<br />
              - 서비스 개시: 결제 완료 시점부터 서비스 이용이 개시된 것으로 간주합니다.<br />
              - 환불: 관련 법령 및 지침에 따라 처리됩니다.
            </div>
          </div>
        </>
      )}

      {/* 결제 및 구독 유의사항 모달 */}
      {showSubTerms && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowSubTerms(false)} />
          <div className={styles.modalContent}>
            <button className={styles.modalCloseBtn} onClick={() => setShowSubTerms(false)}>&times;</button>
            <div className={styles.modalTitle}>결제 및 구독 유의사항</div>
            <div className={styles.modalBody}>
              • 본 상품은 수강료 일시불 결제 상품입니다.<br />
              • 결제 완료 즉시 수강료 할인 혜택과 올케어 매칭 시스템 접속 권한이 활성화됩니다.<br /><br />
              [환불 및 해지 유의사항]<br />
              ※ 본 상품은 디지털 콘텐츠 및 열람권이 포함된 상품으로, 서비스 이용(진입)한 경우 전자상거래법에 따라 청약철회 및 환불이 불가능합니다.
            </div>
          </div>
        </>
      )}

      {/* 제3자 개인정보 모달 */}
      {showThirdParty && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowThirdParty(false)} />
          <div className={styles.modalContent}>
            <button className={styles.modalCloseBtn} onClick={() => setShowThirdParty(false)}>&times;</button>
            <div className={styles.modalTitle}>멤버십 제3자 개인정보 제공 안내</div>
            <div className={styles.modalBody}>
              본인은 올케어 멤버십 서비스 이용에 동의함에 따라, 한평생교육이 멤버십 서비스 제공 및 운영을 목적으로 아래와 같이 개인정보를 제3자에게 제공하는 것에 동의합니다.<br /><br />
              <strong>1. 제공받는 자</strong><br />
              한평생그룹 계열사, 한평생실습 멤버십 운영 및 실습 연계 기관<br /><br />
              <strong>2. 제공 목적</strong><br />
              한평생실습 멤버십 서비스 제공, 실습 과정 운영 및 관리<br /><br />
              <strong>3. 제공하는 개인정보 항목</strong><br />
              이름, 연락처(휴대전화번호), 이메일<br /><br />
              <strong>4. 보유 및 이용 기간</strong><br />
              멤버십 서비스 이용 기간 동안 보유·이용<br /><br />
              <strong>5. 동의 거부 권리 및 불이익 안내</strong><br />
              개인정보 제3자 제공에 대한 동의를 거부할 수 있습니다. 다만, 동의를 거부할 경우 서비스 제공이 제한될 수 있습니다.
            </div>
          </div>
        </>
      )}

      {/* sticky 버튼 - 시트/모달 열리면 숨김 */}
      {!showSheet && !showCategoryModal && (
        <div className={styles.stickyButton}>
          <div className={styles.stickyButtonInner}>
            <button className={styles.subscribeButton} onClick={() => {
              if (customPayment) { setSheetMode('custom'); setShowSheet(true); }
              else { setShowCategoryModal(true); }
            }}>
              수강료 결제하기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
