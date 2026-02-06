import styles from '../privacy/privacy.module.css';
import Link from 'next/link';


export default function RefundPage() {
  return (
    <div className={styles.privacyContainer}>
      <div className={styles.privacyHeader}>
        <Link href="/" className={styles.backLink}>← 홈으로</Link>
        <h1>환불규정</h1>
      </div>
      
     <div className={styles.privacyContent}>

      <div className={styles.privacyContent}>
<div className={styles.privacyContent}>
  <p>
    한평생올케어(이하 "회사")는 이용자가 결제한 유료 서비스에 대하여 디지털 콘텐츠의 특성을 고려한 아래와 같은 환불 규정을 적용합니다.
  </p>
  <br />

  <section className={styles.privacySection}>
    <h2 className={styles.sectionTitle}>1. 환불 정책 및 이용 간주 기준</h2>
    <p>
      회사가 제공하는 <strong>무료 제공 수강권, 열람권, 콘텐츠 이용 내역</strong>은 원칙적으로 환불 및 현금 환산이 불가합니다. 
      해당 서비스들은 <strong>실제 이용 여부와 관계없이, 제공 사실만으로 서비스를 이용한 것으로 간주</strong>되므로 결제 및 이용 시 각별히 유의하시기 바랍니다.
    </p>
  </section>
  <br />

  <section className={styles.privacySection}>
    <h2 className={styles.sectionTitle}>2. 청약철회 및 환불 가능 조건</h2>
    <p>
      위의 환불 불가 항목에 해당하지 않는 일반 유료 서비스의 경우, 아래 조건을 모두 충족할 때에만 환불이 가능합니다.
    </p>
    <ul className={styles.policyList}>
      <li>1. 결제일로부터 7일 이내에 환불을 요청한 경우</li>
      <li>2. 유료 콘텐츠의 상세 페이지를 열람하거나 서비스를 이용한 기록이 전혀 없는 경우</li>
      <li>3. 단순 변심으로 인한 환불 시 결제 대행 수수료를 제외한 금액이 반환될 수 있습니다.</li>
    </ul>
  </section>
  <br />

  <section className={styles.privacySection}>
    <h2 className={styles.sectionTitle}>3. 환불 불가 상세 사유</h2>
    <p>
      다음 각 호에 해당하는 경우, 디지털 콘텐츠의 가치가 훼손된 것으로 보아 환불이 제한됩니다.
    </p>
    <ul className={styles.policyList}>
      <li>1. 유료 게시물 및 설계 자료의 상세 내용을 클릭하여 조회한 경우</li>
      <li>2. 이미 다운로드하거나 복제 가능한 콘텐츠를 확인한 경우</li>
      <li>3. 회원의 귀책 사유로 인해 서비스 이용이 정지된 경우</li>
      <li>4. 한평생교육이 안내하는 교육원에서 수강료 할인 및 무료 수강 이용 혜택을 받은 경우 </li>
    </ul>
  </section>
</div>


</div>

        <section className={styles.privacySection}>
          <p className={styles.effectiveDate}>
            <strong>공고일자:</strong> 2026년 1월 29일<br />
            <strong>시행일자:</strong> 2026년 1월 29일
          </p>
        </section>
      </div>
    </div>
  );
}       