"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPayAppSDK } from "@/lib/payapp";
import styles from "./mypage.module.css";
import BottomSheetHandle from "../../components/BottomSheetHandle";
import Portal from "../../components/Portal";
import AlertModal from "../../components/AlertModal";

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

// 플랜 데이터
interface Plan {
  id: "basic" | "standard" | "premium";
  name: string;
  price: number;
  displayPrice: string;
  image: string;
}

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "베이직",
    price: 9900,
    displayPrice: "월 9,900원",
    image: "/images/plan_basic.png",
  },
  {
    id: "standard",
    name: "스탠다드",
    price: 19900,
    displayPrice: "월 19,900원",
    image: "/images/plan_standard.png",
  },
  {
    id: "premium",
    name: "프리미엄",
    price: 29900,
    displayPrice: "월 29,900원",
    image: "/images/plan_premium.png",
  },
];

// 플랜별 혜택 SVG 아이콘
const BenefitIcon = ({ type, color }: { type: string; color: string }) => {
  const icons: Record<string, string> = {
    "이수보장반":
      "M7.05731 1.40016C7.2933 1.16448 7.60906 1.0258 7.94228 1.01148C8.27549 0.997168 8.60198 1.10826 8.85731 1.32283L8.94265 1.40083L10.2093 2.66683H12C12.3362 2.66689 12.6601 2.79401 12.9066 3.02272C13.1531 3.25143 13.3041 3.56484 13.3293 3.90016L13.3333 4.00016V5.79083L14.6 7.0575C14.8358 7.29352 14.9746 7.60941 14.989 7.94278C15.0033 8.27616 14.8921 8.60278 14.6773 8.85816L14.5993 8.94283L13.3326 10.2095V12.0002C13.3328 12.3365 13.2057 12.6605 12.977 12.9072C12.7483 13.1538 12.4347 13.3049 12.0993 13.3302L12 13.3335H10.21L8.94331 14.6002C8.70729 14.836 8.3914 14.9748 8.05802 14.9891C7.72465 15.0035 7.39803 14.8923 7.14265 14.6775L7.05798 14.6002L5.79131 13.3335H3.99998C3.6636 13.3336 3.3396 13.2066 3.09295 12.9778C2.84629 12.7491 2.69521 12.4356 2.66998 12.1002L2.66665 12.0002V10.2095L1.39998 8.94283C1.16411 8.7068 1.02531 8.39092 1.01099 8.05754C0.996677 7.72417 1.10788 7.39754 1.32265 7.14216L1.39998 7.0575L2.66665 5.79083V4.00016C2.66671 3.66389 2.79383 3.34007 3.02254 3.09355C3.25125 2.84704 3.56466 2.69605 3.89998 2.67083L3.99998 2.66683H5.79065L7.05731 1.40016ZM7.99998 2.34416L6.73331 3.61083C6.51187 3.83193 6.21971 3.9681 5.90798 3.9955L5.79065 4.00016H3.99998V5.79083C4.00006 6.10409 3.88984 6.40738 3.68865 6.6475L3.60931 6.73416L2.34265 8.00083L3.60931 9.26683C3.83066 9.48818 3.96707 9.78035 3.99465 10.0922L3.99998 10.2095V12.0002H5.79065C6.10391 12.0001 6.4072 12.1103 6.64731 12.3115L6.73398 12.3908L7.99998 13.6575L9.26665 12.3908C9.48799 12.1695 9.78016 12.0331 10.092 12.0055L10.2093 12.0002H12V10.2095C11.9999 9.89623 12.1101 9.59295 12.3113 9.35283L12.3906 9.26616L13.6573 8.00016L12.3906 6.7335C12.1693 6.51215 12.0329 6.21998 12.0053 5.90816L12 5.79083V4.00016H10.2093C9.89605 4.00024 9.59276 3.89002 9.35265 3.68883L9.26598 3.6095L7.99931 2.34283L7.99998 2.34416ZM10.0533 5.9895C10.1733 5.86993 10.3343 5.80051 10.5036 5.79534C10.6729 5.79018 10.8378 5.84964 10.9648 5.96166C11.0919 6.07369 11.1715 6.22986 11.1876 6.39848C11.2036 6.56709 11.1549 6.7355 11.0513 6.8695L10.9953 6.93216L7.74198 10.1855C7.61496 10.3127 7.44566 10.3888 7.26622 10.3994C7.08679 10.4099 6.90972 10.3542 6.76865 10.2428L6.70465 10.1862L5.10198 8.5835C4.98114 8.4638 4.91062 8.30245 4.90486 8.13246C4.89909 7.96248 4.95851 7.79672 5.07096 7.66911C5.1834 7.5415 5.34037 7.4617 5.50973 7.44603C5.67909 7.43036 5.84803 7.48002 5.98198 7.58483L6.04465 7.64016L7.22331 8.81883L10.0533 5.9895Z",
    "직업훈련 과정 무료 수강권":
      "M12.6666 2.6665C13.1768 2.66648 13.6677 2.86139 14.0388 3.21136C14.41 3.56133 14.6334 4.03991 14.6633 4.54917L14.6666 4.6665V5.87784C14.6651 6.05789 14.6166 6.23443 14.5259 6.38996C14.4351 6.54548 14.3053 6.6746 14.1493 6.7645L14.078 6.80317C13.8623 6.90904 13.6792 7.07122 13.5481 7.27257C13.417 7.47392 13.3428 7.70695 13.3332 7.94703C13.3236 8.18711 13.3791 8.42531 13.4938 8.63645C13.6085 8.84759 13.7781 9.02382 13.9846 9.1465L14.078 9.1965C14.3666 9.33917 14.6246 9.63384 14.662 10.0232L14.6666 10.1218V11.3332C14.6667 11.8433 14.4718 12.3342 14.1218 12.7053C13.7718 13.0765 13.2932 13.2999 12.784 13.3298L12.6666 13.3332H3.33331C2.82317 13.3332 2.3323 13.1383 1.96114 12.7883C1.58998 12.4383 1.36657 11.9598 1.33665 11.4505L1.33331 11.3332V10.1218C1.33331 9.71784 1.56798 9.40317 1.85065 9.23517L1.92198 9.1965C2.13767 9.09064 2.32074 8.92845 2.45184 8.72711C2.58294 8.52576 2.6572 8.29272 2.66676 8.05264C2.67633 7.81256 2.62084 7.57436 2.50616 7.36322C2.39149 7.15209 2.2219 6.97586 2.01531 6.85317L1.92198 6.80317C1.63331 6.6605 1.37531 6.36584 1.33798 5.9765L1.33331 5.8785V4.6665C1.33328 4.15636 1.5282 3.66549 1.87817 3.29433C2.22814 2.92317 2.70672 2.69977 3.21598 2.66984L3.33331 2.6665H12.6666ZM12.6666 3.99984H3.33331C3.17002 3.99986 3.01242 4.05981 2.8904 4.16831C2.76838 4.27682 2.69042 4.42634 2.67131 4.5885L2.66665 4.6665V5.68984C3.06162 5.9177 3.39156 6.24303 3.62495 6.63476C3.85834 7.02648 3.98739 7.47151 3.99976 7.92733C4.01213 8.38314 3.90742 8.83452 3.69562 9.23833C3.48382 9.64213 3.17201 9.98489 2.78998 10.2338L2.66665 10.3098V11.3332C2.66667 11.4965 2.72662 11.6541 2.83512 11.7761C2.94363 11.8981 3.09315 11.9761 3.25531 11.9952L3.33331 11.9998H12.6666C12.8299 11.9998 12.9875 11.9399 13.1096 11.8314C13.2316 11.7229 13.3095 11.5733 13.3286 11.4112L13.3333 11.3332V10.3098C12.9383 10.082 12.6084 9.75664 12.375 9.36492C12.1416 8.97319 12.0126 8.52816 12.0002 8.07235C11.9878 7.61653 12.0925 7.16516 12.3043 6.76135C12.5161 6.35754 12.828 6.01479 13.21 5.76584L13.3333 5.68984V4.6665C13.3333 4.50322 13.2733 4.34561 13.1648 4.22359C13.0563 4.10157 12.9068 4.02361 12.7446 4.0045L12.6666 3.99984ZM6.66665 5.99984C6.82994 5.99986 6.98754 6.05981 7.10956 6.16831C7.23158 6.27682 7.30954 6.42634 7.32865 6.5885L7.33331 6.6665V9.33317C7.33312 9.50309 7.26806 9.66653 7.15141 9.79008C7.03477 9.91364 6.87534 9.98799 6.70572 9.99795C6.53609 10.0079 6.36906 9.95272 6.23876 9.84366C6.10846 9.7346 6.02472 9.5799 6.00465 9.41117L5.99998 9.33317V6.6665C5.99998 6.48969 6.07022 6.32012 6.19524 6.1951C6.32027 6.07008 6.48984 5.99984 6.66665 5.99984Z",
    "실습매칭 프로그램":
      "M4.19532 11.1951C4.45567 10.9347 4.87768 10.9347 5.13803 11.1951C5.39838 11.4554 5.39838 11.8775 5.13803 12.1378L3.13803 14.1378C2.87768 14.3982 2.45567 14.3982 2.19532 14.1378L1.19532 13.1378C0.934974 12.8775 0.934974 12.4554 1.19532 12.1951C1.45567 11.9347 1.87768 11.9347 2.13803 12.1951L2.66668 12.7237L4.19532 11.1951ZM14.3333 11.9998C14.7015 11.9998 15 12.2983 15 12.6665C15 13.0346 14.7015 13.3331 14.3333 13.3331H7.00001C6.63182 13.3331 6.33334 13.0346 6.33334 12.6665C6.33334 12.2983 6.63182 11.9998 7.00001 11.9998H14.3333ZM4.19532 6.52843C4.45567 6.26808 4.87768 6.26808 5.13803 6.52843C5.39838 6.78878 5.39838 7.21079 5.13803 7.47114L3.13803 9.47114C2.87768 9.73149 2.45567 9.73149 2.19532 9.47114L1.19532 8.47114C0.934974 8.21079 0.934974 7.78878 1.19532 7.52843C1.45567 7.26808 1.87768 7.26808 2.13803 7.52843L2.66668 8.05708L4.19532 6.52843ZM14.3333 7.33312C14.7015 7.33312 15 7.6316 15 7.99979C15 8.36798 14.7015 8.66645 14.3333 8.66645H7.00001C6.63182 8.66645 6.33334 8.36798 6.33334 7.99979C6.33334 7.6316 6.63182 7.33312 7.00001 7.33312H14.3333ZM4.19532 1.86177C4.45567 1.60142 4.87768 1.60142 5.13803 1.86177C5.39838 2.12212 5.39838 2.54412 5.13803 2.80447L3.13803 4.80447C2.87768 5.06482 2.45567 5.06482 2.19532 4.80447L1.19532 3.80447C0.934974 3.54412 0.934974 3.12212 1.19532 2.86177C1.45567 2.60142 1.87768 2.60142 2.13803 2.86177L2.66668 3.39041L4.19532 1.86177ZM14.3333 2.66645C14.7015 2.66645 15 2.96493 15 3.33312C15 3.70131 14.7015 3.99979 14.3333 3.99979H7.00001C6.63182 3.99979 6.33334 3.70131 6.33334 3.33312C6.33334 2.96493 6.63182 2.66645 7.00001 2.66645H14.3333Z",
    "취업연계(취업컨설팅)":
      "M13.76 10.5146C14.1274 10.0953 14.331 9.55743 14.3334 8.99995C14.3334 8.38111 14.0875 7.78762 13.6499 7.35003C13.2124 6.91245 12.6189 6.66661 12 6.66661C11.3812 6.66661 10.7877 6.91245 10.3501 7.35003C9.91252 7.78762 9.66669 8.38111 9.66669 8.99995C9.66905 9.55743 9.87265 10.0953 10.24 10.5146C9.76008 10.8123 9.36382 11.2272 9.08856 11.7203C8.81331 12.2135 8.66812 12.7685 8.66669 13.3333C8.66669 13.5101 8.73693 13.6797 8.86195 13.8047C8.98698 13.9297 9.15654 13.9999 9.33336 13.9999C9.51017 13.9999 9.67974 13.9297 9.80476 13.8047C9.92978 13.6797 10 13.5101 10 13.3333C10 12.8028 10.2107 12.2941 10.5858 11.9191C10.9609 11.544 11.4696 11.3333 12 11.3333C12.5305 11.3333 13.0392 11.544 13.4142 11.9191C13.7893 12.2941 14 12.8028 14 13.3333C14 13.5101 14.0703 13.6797 14.1953 13.8047C14.3203 13.9297 14.4899 13.9999 14.6667 13.9999C14.8435 13.9999 15.0131 13.9297 15.1381 13.8047C15.2631 13.6797 15.3334 13.5101 15.3334 13.3333C15.3319 12.7685 15.1867 12.2135 14.9115 11.7203C14.6362 11.2272 14.24 10.8123 13.76 10.5146ZM12 9.99995C11.8022 9.99995 11.6089 9.9413 11.4445 9.83142C11.28 9.72153 11.1518 9.56536 11.0761 9.38263C11.0005 9.1999 10.9807 8.99884 11.0192 8.80486C11.0578 8.61087 11.1531 8.43269 11.2929 8.29284C11.4328 8.15299 11.611 8.05775 11.8049 8.01916C11.9989 7.98058 12.2 8.00038 12.3827 8.07607C12.5654 8.15175 12.7216 8.27993 12.8315 8.44438C12.9414 8.60883 13 8.80217 13 8.99995C13 9.26516 12.8947 9.51952 12.7071 9.70705C12.5196 9.89459 12.2652 9.99995 12 9.99995ZM4.52869 5.13795L5.86202 6.47128C5.98776 6.59272 6.15616 6.65991 6.33096 6.6584C6.50575 6.65688 6.67296 6.58676 6.79657 6.46316C6.92017 6.33955 6.99029 6.17234 6.9918 5.99755C6.99332 5.82275 6.92613 5.65435 6.80469 5.52861L6.60935 5.33328H9.39069L9.19536 5.52861C9.13168 5.59011 9.08089 5.66367 9.04595 5.74501C9.01101 5.82635 8.99262 5.91383 8.99185 6.00235C8.99109 6.09087 9.00795 6.17865 9.04147 6.26058C9.075 6.34251 9.1245 6.41695 9.18709 6.47954C9.24969 6.54214 9.32412 6.59164 9.40605 6.62516C9.48798 6.65868 9.57577 6.67555 9.66429 6.67478C9.75281 6.67401 9.84029 6.65562 9.92163 6.62068C10.003 6.58574 10.0765 6.53495 10.138 6.47128L11.4714 5.13795C11.5957 5.01258 11.6655 4.84317 11.6655 4.66661C11.6655 4.49005 11.5957 4.32064 11.4714 4.19528L10.138 2.86195C10.0123 2.74051 9.84389 2.67331 9.66909 2.67483C9.49429 2.67635 9.32708 2.74646 9.20348 2.87007C9.07987 2.99367 9.00976 3.16088 9.00824 3.33568C9.00672 3.51048 9.07392 3.67888 9.19536 3.80461L9.39069 3.99995H6.60935L6.80469 3.80461C6.92613 3.67888 6.99332 3.51048 6.9918 3.33568C6.99029 3.16088 6.92017 2.99367 6.79657 2.87007C6.67296 2.74646 6.50575 2.67635 6.33096 2.67483C6.15616 2.67331 5.98776 2.74051 5.86202 2.86195L4.52869 4.19528C4.40436 4.32064 4.33459 4.49005 4.33459 4.66661C4.33459 4.84317 4.40436 5.01258 4.52869 5.13795ZM5.76002 10.5146C6.1274 10.0953 6.33099 9.55743 6.33335 8.99995C6.33335 8.38111 6.08752 7.78762 5.64994 7.35003C5.21235 6.91245 4.61886 6.66661 4.00002 6.66661C3.38118 6.66661 2.78769 6.91245 2.3501 7.35003C1.91252 7.78762 1.66669 8.38111 1.66669 8.99995C1.66905 9.55743 1.87264 10.0953 2.24002 10.5146C1.76008 10.8123 1.36381 11.2272 1.08856 11.7203C0.813305 12.2135 0.668121 12.7685 0.666687 13.3333C0.666687 13.5101 0.736925 13.6797 0.861949 13.8047C0.986973 13.9297 1.15654 13.9999 1.33335 13.9999C1.51016 13.9999 1.67973 13.9297 1.80476 13.8047C1.92978 13.6797 2.00002 13.5101 2.00002 13.3333C2.00002 12.8028 2.21073 12.2941 2.58581 11.9191C2.96088 11.544 3.46959 11.3333 4.00002 11.3333C4.53045 11.3333 5.03916 11.544 5.41424 11.9191C5.78931 12.2941 6.00002 12.8028 6.00002 13.3333C6.00002 13.5101 6.07026 13.6797 6.19528 13.8047C6.32031 13.9297 6.48988 13.9999 6.66669 13.9999C6.8435 13.9999 7.01307 13.9297 7.13809 13.8047C7.26312 13.6797 7.33335 13.5101 7.33335 13.3333C7.33192 12.7685 7.18674 12.2135 6.91148 11.7203C6.63623 11.2272 6.23996 10.8123 5.76002 10.5146ZM4.00002 9.99995C3.80224 9.99995 3.6089 9.9413 3.44445 9.83142C3.28 9.72153 3.15183 9.56536 3.07614 9.38263C3.00045 9.1999 2.98065 8.99884 3.01924 8.80486C3.05782 8.61087 3.15306 8.43269 3.29291 8.29284C3.43277 8.15299 3.61095 8.05775 3.80493 8.01916C3.99891 7.98058 4.19998 8.00038 4.3827 8.07607C4.56543 8.15175 4.72161 8.27993 4.83149 8.44438C4.94137 8.60883 5.00002 8.80217 5.00002 8.99995C5.00002 9.26516 4.89466 9.51952 4.70713 9.70705C4.51959 9.89459 4.26524 9.99995 4.00002 9.99995Z",
  };
  const d = icons[type];
  if (!d) return null;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d={d} fill={color} />
    </svg>
  );
};

// 플랜별 혜택 정의
const PLAN_BENEFITS = [
  { key: "이수보장반", plans: ["베이직", "스탠다드", "프리미엄"] },
  { key: "직업훈련 과정 무료 수강권", plans: ["베이직", "스탠다드", "프리미엄"], link: "https://korhrd.co.kr/", linkText: "사이트 바로가기" },
  { key: "실습매칭 프로그램", plans: ["스탠다드", "프리미엄"], link: "/matching", linkText: "바로가기" },
  { key: "취업연계(취업컨설팅)", plans: ["프리미엄"] },
];

const isBenefitActive = (benefitKey: string, planName?: string): boolean => {
  if (!planName) return false;
  const benefit = PLAN_BENEFITS.find((b) => b.key === benefitKey);
  return benefit ? benefit.plans.includes(planName) : false;
};

interface UserInfo {
  email: string;
  name: string;
  phone: string;
  provider: string;
}

interface SubscriptionInfo {
  isActive: boolean;
  id?: string;
  plan?: string;
  amount?: number;
  startDate?: string;
  nextBillingDate?: string;
  endDate?: string;
  cancelled_at?: string;
  status?: string;
  scheduledPlan?: string | null;
  scheduledAmount?: number | null;
  nextAmount?: number | null;
}

interface PaymentHistory {
  id: string;
  date: string;
  plan: string;
  amount: number;
  status: string;
  billingCycle: string;
  paymentMethod: string;
}

export default function MyPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    isActive: false,
  });
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPasswordInline, setShowPasswordInline] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showSubscriptionSheet, setShowSubscriptionSheet] = useState(false);
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreements, setAgreements] = useState([false, false, false]);
  const [isPayAppLoaded, setIsPayAppLoaded] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showSubscriptionTerms, setShowSubscriptionTerms] = useState(false);
  const [showThirdPartyProvision, setShowThirdPartyProvision] = useState(false);
  const [isPayAppLoading, setIsPayAppLoading] = useState(false);
  const [payappLoadError, setPayappLoadError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<
    "basic" | "standard" | "premium"
  >("standard");
  const [showPlanChangeSheet, setShowPlanChangeSheet] = useState(false);
  const [planChangeAgreeAll, setPlanChangeAgreeAll] = useState(false);
  const [planChangeAgreements, setPlanChangeAgreements] = useState([
    false,
    false,
    false,
  ]);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [downgradeWarning, setDowngradeWarning] = useState("");
  const [pendingPlanChange, setPendingPlanChange] = useState<(() => void) | null>(null);

  // Prevent background scroll when any modal or sheet is open
  useEffect(() => {
    // load PayApp SDK with retries
    let mounted = true;
    setIsPayAppLoading(true);
    loadPayAppSDK({ retries: 3, timeout: 8000 })
      .then(() => {
        if (!mounted) return;
        setIsPayAppLoaded(true);
        setIsPayAppLoading(false);
        if ((window as any).PayApp) {
          const userId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || "";
          const shopName =
            process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || "한평생올케어";
          try {
            window.PayApp.setDefault("userid", userId);
            window.PayApp.setDefault("shopname", shopName);
          } catch (e) {
            console.warn("PayApp default set failed", e);
          }
        }
      })
      .catch((err) => {
        console.error("PayApp load failed:", err);
        if (!mounted) return;
        setIsPayAppLoaded(false);
        setIsPayAppLoading(false);
        setPayappLoadError(String(err?.message || err));
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const modalOpen =
      showPasswordInline ||
      showRefundModal ||
      showSubscriptionSheet ||
      showTerms ||
      showSubscriptionTerms ||
      showThirdPartyProvision ||
      showPlanChangeSheet;
    if (modalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.classList.add("no-scroll");
    } else {
      document.body.style.overflow = "";
      document.documentElement.classList.remove("no-scroll");
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.classList.remove("no-scroll");
    };
  }, [
    showPasswordInline,
    showRefundModal,
    showSubscriptionSheet,
    showTerms,
    showSubscriptionTerms,
    showPlanChangeSheet,
  ]);

  // Bottom sheet drag state (to match main page behavior)
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const [sheetTransitionEnabled, setSheetTransitionEnabled] = useState(true);

  const handleSheetOpen = () => setShowSubscriptionSheet(true);

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
    const THRESHOLD = 120;
    setSheetTransitionEnabled(true);
    if (dy > THRESHOLD) {
      setShowSubscriptionSheet(false);
      setShowPlanChangeSheet(false);
      setDragY(0);
    } else {
      setDragY(0);
    }
  };

  const handlePlanChangeSheetOpen = () => setShowPlanChangeSheet(true);
  const handlePlanChangeSheetClose = () => setShowPlanChangeSheet(false);

  const handlePlanChangeAgreeAll = () => {
    setPlanChangeAgreeAll((prev) => {
      const next = !prev;
      setPlanChangeAgreements([next, next, next]);
      return next;
    });
  };

  const handlePlanChangeAgreement = (idx: number) => {
    setPlanChangeAgreements((prev) => {
      const next = prev.map((v, i) => (i === idx ? !v : v));
      setPlanChangeAgreeAll(next.every(Boolean));
      return next;
    });
  };

  const executePlanChange = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("로그인이 필요합니다.");
        return;
      }

      const response = await fetch("/api/subscription/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "요금제 변경에 실패했습니다.");
        return;
      }

      if (result.needsPayment) {
        if (!isPayAppLoaded || !window.PayApp) {
          alert("결제 시스템을 로딩 중입니다. 잠시 후 다시 시도해주세요.");
          return;
        }

        const userResponse = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userResponse.ok) {
          alert("사용자 정보를 가져올 수 없습니다.");
          return;
        }
        const { name, phone } = await userResponse.json();

        let userId = "";
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId = payload.userId || "";
        } catch (e) {
          console.error("Token parse error:", e);
        }

        const baseUrl = window.location.origin;
        const shopName = process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || "한평생올케어";
        const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || "";

        window.PayApp.setDefault("userid", payappUserId);
        window.PayApp.setDefault("shopname", shopName);

        const now = new Date();
        const expireDate = new Date(now);
        expireDate.setMonth(expireDate.getMonth() + 18);
        const rebillExpire = expireDate.toISOString().split("T")[0];
        const rebillCycleMonth = now.getDate().toString();

        const newPlanPrice = result.newPlanPrice;
        const newPlanName = result.newPlanName;

        const orderData = {
          orderId: `ORDER-${Date.now()}`,
          userId,
          mode: "upgrade",
          plan: selectedPlan,
          price: newPlanPrice,
          refundTradeId: result.refundTradeId || null,
          refundAmount: result.refundAmount || 0,
          prevPrice: result.prevPrice || 0,
        };

        window.PayApp.setParam("goodname", `올케어구독상품-${newPlanName}`);
        window.PayApp.setParam("goodprice", newPlanPrice.toString());
        window.PayApp.setParam("recvphone", phone);
        window.PayApp.setParam("buyername", name);
        window.PayApp.setParam("smsuse", "n");
        window.PayApp.setParam("rebillCycleType", "Month");
        window.PayApp.setParam("rebillCycleMonth", rebillCycleMonth);
        window.PayApp.setParam("rebillExpire", rebillExpire);
        window.PayApp.setParam("feedbackurl", `${baseUrl}/api/payments/webhook`);
        window.PayApp.setParam("returnurl", `${baseUrl}/payment/success`);
        window.PayApp.setParam("var1", JSON.stringify(orderData));

        window.PayApp.rebill();
      } else {
        alert(result.message);
      }

      handlePlanChangeSheetClose();
      fetchSubscriptionInfo();
    } catch (error) {
      console.error("Plan change error:", error);
      alert("요금제 변경 처리 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    // 결제 결과 수신 (팝업 창으로부터)
    const handlePaymentResult = (event: MessageEvent) => {
      if (event.data.type === "paymentResult") {
        const { status, orderId, amount, message } = event.data.data;

        if (status === "success") {
          // Redirect main window to success page so user sees result on the main UI
          try {
            router.push("/payment/success");
          } catch (e) {
            // fallback
            window.location.href = "/payment/success";
          }
          // Refresh subscription info and close sheet
          fetchSubscriptionInfo();
          handleSheetClose();
        } else {
          // navigate to failure page or show alert
          try {
            router.push(
              "/payment/result?status=fail&orderId=" +
                encodeURIComponent(orderId || ""),
            );
          } catch (e) {
            alert(`결제에 실패했습니다.\n${message || "다시 시도해 주세요."}`);
          }
        }
      }
    };

    window.addEventListener("message", handlePaymentResult);

    // 사용자 정보 불러오기 (API 호출 시뮬레이션)
    fetchUserInfo();
    fetchSubscriptionInfo();
    fetchPaymentHistory();

    return () => {
      window.removeEventListener("message", handlePaymentResult);
    };
  }, [router]);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("토큰이 없습니다.");
        router.push("/auth/login");
        return;
      }

      const response = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("User profile error:", errorData);
        throw new Error(errorData.error || "Failed to fetch user info");
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (err: any) {
      console.error("사용자 정보 로드 실패:", err.message);
      setError("사용자 정보를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionInfo = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      const response = await fetch("/api/subscription/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Subscription status error:", errorData);
        throw new Error(errorData.error || "Failed to fetch subscription info");
      }

      const data = await response.json();
      setSubscription(data);

      // 현재 구독 플랜 설정
      if (data.plan) {
        const currentPlan = PLANS.find((p) => p.name === data.plan)?.id;
        if (currentPlan) {
          setSelectedPlan(currentPlan);
        }
      }
    } catch (err: any) {
      console.error("구독 정보 로드 실패:", err.message);
      // 구독 정보는 없을 수 있으므로 기본값 유지
      setSubscription({ isActive: false });
    }
  };
  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      const response = await fetch("/api/payments/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Payment history error:", errorData);
        return;
      }

      const data = await response.json();
      setPaymentHistory(data.payments || []);
    } catch (err: any) {
      console.error("결제 내역 로드 실패:", err.message);
    }
  };
  // Pagination for payment history
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 5;
  const historyTotalPages = Math.max(
    1,
    Math.ceil(paymentHistory.length / historyPageSize),
  );
  const pagedPaymentHistory = paymentHistory.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize,
  );
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "비밀번호 변경에 실패했습니다.");
        return;
      }

      alert("비밀번호가 변경되었습니다.");
      setShowPasswordInline(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError("비밀번호 변경 중 오류가 발생했습니다.");
    }
  };

  const handleRefundRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/subscription/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: "사용자 요청",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "환불 요청에 실패했습니다.");
        return;
      }

      alert(data.message || "환불 요청이 접수되었습니다.");
      setShowRefundModal(false);
      fetchSubscriptionInfo();
    } catch (err) {
      alert("환불 요청 처리 중 오류가 발생했습니다.");
    }
  };

  const handleAgreeAll = () => {
    const newValue = !agreeAll;
    setAgreeAll(newValue);
    setAgreements([newValue, newValue, newValue]);
  };

  const handleAgreement = (index: number) => {
    const newAgreements = [...agreements];
    newAgreements[index] = !newAgreements[index];
    setAgreements(newAgreements);
    setAgreeAll(newAgreements.every((a) => a));
  };

  const handleSheetClose = () => {
    setShowSubscriptionSheet(false);
    setAgreeAll(false);
    setAgreements([false, false, false]);
    setDragY(0);
    setSheetTransitionEnabled(true);
  };

  const handleSubscriptionAction = async (
    action: "start" | "cancel" | "refund" | "renew",
  ) => {
    try {
      const token = localStorage.getItem("token");

      if (action === "start") {
        setSelectedPlan("standard"); // 구독 시작 시 스탠다드로 초기화
        setShowSubscriptionSheet(true);
      } else if (action === "renew") {
        if (
          confirm(
            "구독을 재갱신하시겠습니까? 다음 결제일부터 자동 결제가 재개됩니다.",
          )
        ) {
          const response = await fetch("/api/subscription/renew", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (!response.ok) {
            alert(data.error || "구독 재갱신에 실패했습니다.");
            return;
          }

          alert("구독이 재갱신되었습니다!");
          // 구독 정보 새로고침
          fetchSubscriptionInfo();
        }
      } else if (action === "cancel") {
        if (confirm("구독을 취소하시겠습니까?")) {
          if (!subscription.id) {
            alert(
              "구독 정보가 올바르지 않습니다. 새로고침 후 다시 시도해 주세요.",
            );
            return;
          }
          const response = await fetch("/api/subscription/cancel", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ subscriptionId: subscription.id }),
          });

          const data = await response.json();

          if (!response.ok) {
            alert(data.error || "구독 취소에 실패했습니다.");
            return;
          }

          alert("구독이 취소되었습니다.");
          // 구독 정보 새로고침
          fetchSubscriptionInfo();
        }
      } else if (action === "refund") {
        setShowRefundModal(true);
      }
    } catch (err) {
      alert("작업 처리 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "#dc2626", marginBottom: "20px" }}>{error}</p>
            <button
              onClick={() => router.push("/auth/login")}
              style={{
                padding: "12px 24px",
                backgroundColor: "#0051FF",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              로그인 페이지로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>내정보 관리</h1>
        </div>

        {/* 개인정보 섹션 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>개인정보</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>이메일</span>
              <span className={styles.infoValue}>{userInfo?.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>이름</span>
              <span className={styles.infoValue}>{userInfo?.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>전화번호</span>
              <span className={styles.infoValue}>
                {userInfo?.phone
                  ? userInfo.phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")
                  : "등록된 전화번호가 없습니다"}
              </span>
            </div>
            {userInfo?.provider === "email" && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>비밀번호</span>
                <button
                  className={styles.changePasswordBtn}
                  onClick={() => setShowPasswordInline((s) => !s)}
                >
                  비밀번호 변경
                </button>
              </div>
            )}

            {showPasswordInline && (
              <div className={styles.inlinePasswordSection}>
                <form
                  onSubmit={handlePasswordChange}
                  className={styles.inlineForm}
                >
                  {error && <div className={styles.errorBox}>{error}</div>}

                  <div className={styles.formGroup}>
                    <label className={styles.label}>현재 비밀번호</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>새 비밀번호</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        });
                        setError("");
                      }}
                      className={styles.input}
                      placeholder="8자 이상 입력하세요"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        });
                        setError("");
                      }}
                      className={styles.input}
                      placeholder="비밀번호를 다시 입력하세요"
                      required
                    />
                    {passwordData.confirmPassword &&
                      passwordData.newPassword !==
                        passwordData.confirmPassword && (
                        <div
                          style={{
                            color: "#ef4444",
                            fontSize: "13px",
                            marginTop: "6px",
                          }}
                        >
                          새 비밀번호가 일치하지 않습니다.
                        </div>
                      )}
                    {passwordData.newPassword &&
                      passwordData.newPassword.length > 0 &&
                      passwordData.newPassword.length < 8 && (
                        <div
                          style={{
                            color: "#ef4444",
                            fontSize: "13px",
                            marginTop: "6px",
                          }}
                        >
                          비밀번호는 8자 이상이어야 합니다.
                        </div>
                      )}
                  </div>

                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      className={styles.cancelInlineBtn}
                      onClick={() => {
                        setShowPasswordInline(false);
                        setPasswordData({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                        setError("");
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={
                        passwordData.newPassword.length < 8 ||
                        passwordData.newPassword !==
                          passwordData.confirmPassword
                      }
                    >
                      변경하기
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>계정</span>
              <button
                className={styles.deleteAccountBtn}
                onClick={() => setShowDeleteModal(true)}
                style={{ color: "#000000", fontSize: "15px" }}
              >
                회원 탈퇴
              </button>
            </div>
          </div>
        </section>

        {/* 구독 정보 섹션 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>구독 정보</h2>
          <div className={styles.subscriptionCard}>
            {/* 구독중인 플랜 없음 */}
            {subscription.isActive && !subscription.plan ? (
              <>
                <div className={styles.subscriptionStatus}>
                  <span className={styles.statusBadgeInactive}>
                    구독중인 플랜이 없습니다.
                  </span>
                  <button
                    className={styles.startBtn}
                    onClick={() => handleSubscriptionAction("start")}
                  >
                    구독 시작
                  </button>
                </div>
                <div className={styles.benefitList}>
                  {PLAN_BENEFITS.map((benefit) => (
                    <div key={benefit.key} className={styles.benefitItemInactive}>
                      <BenefitIcon type={benefit.key} color="#d0d0d0" />
                      {benefit.key}
                    </div>
                  ))}
                </div>
              </>
            ) : subscription.isActive ? (
              subscription.cancelled_at ? (
                <>
                  <div className={styles.subscriptionStatus}>
                    <span className={styles.statusBadge}>한평생 올케어</span>
                    <span className={styles.statusBadgeActive}>
                      구독 종료 예정
                    </span>
                  </div>
                  <div className={styles.subscriptionDetailsBox}>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>이용기간</span>
                      <span className={styles.detailValueCustom}>
                        {subscription.startDate} ~{" "}
                        {subscription.nextBillingDate}
                      </span>
                    </div>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>
                        다음 결제일
                      </span>
                      <span
                        className={styles.detailValueCustom}
                        style={{ color: "#ef4444", fontWeight: 700 }}
                      >
                        구독 종료 예정
                      </span>
                    </div>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>
                        결제 예정금액
                      </span>
                      <span className={styles.detailValueCustom}>-</span>
                    </div>
                  </div>
                  <div className={styles.benefitTitle}>이용중인 혜택</div>
                  {PLAN_BENEFITS.map((benefit) => {
                    const active = isBenefitActive(benefit.key, subscription.plan);
                    return (
                      <div key={benefit.key} className={styles.detailRowCustom}>
                        <span
                          className={styles.detailLabelCustom}
                          style={{ color: active ? "#010101" : "#d0d0d0", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <BenefitIcon type={benefit.key} color={active ? "#0051FF" : "#d0d0d0"} />
                          {benefit.key}
                        </span>
                        {active && benefit.link && (
                          <a
                            className={styles.detailValueCustomBtn}
                            href={benefit.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {benefit.linkText}
                          </a>
                        )}
                      </div>
                    );
                  })}
                  <div className={styles.subWrapper}>
                    <div className={styles.subscriptionActionRow}>
                      <button
                        className={styles.renewBtn}
                        onClick={() => handleSubscriptionAction("renew")}
                      >
                        재갱신
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.subscriptionStatus}>
                    <span className={styles.statusBadge}>한평생 올케어</span>
                    <span className={styles.statusBadgeActive}>구독중</span>
                  </div>
                  <div className={styles.subscriptionDetailsBox}>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>요금제</span>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            className={styles.detailValueCustom}
                            style={{ fontWeight: 700, color: "#0051ff" }}
                          >
                            {subscription.plan || "플랜 정보 없음"}
                          </span>
                          {subscription.plan && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#999",
                                fontWeight: 500,
                              }}
                            >
                              (
                              {
                                PLANS.find((p) => p.name === subscription.plan)
                                  ?.displayPrice
                              }
                              )
                            </span>
                          )}
                        </div>
                        <button
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            backgroundColor: "#0051ff",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                          onClick={handlePlanChangeSheetOpen}
                        >
                          플랜 변경
                        </button>
                      </div>
                    </div>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>이용기간</span>
                      <span className={styles.detailValueCustom}>
                        {subscription.startDate} ~{" "}
                        {subscription.nextBillingDate}
                      </span>
                    </div>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>
                        다음 결제일
                      </span>
                      <span className={styles.detailValueCustom}>
                        {subscription.nextBillingDate}
                      </span>
                    </div>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>
                        결제 예정금액
                      </span>
                      <span className={styles.detailValueCustom}>
                        {(subscription.nextAmount ?? subscription.amount)?.toLocaleString()}원
                      </span>
                    </div>
                    {subscription.scheduledPlan && (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "#f0f6ff",
                          borderRadius: "8px",
                          fontSize: "13px",
                          color: "#0051ff",
                          marginTop: "4px",
                          marginBottom: "4px",
                          lineHeight: "1.5",
                        }}
                      >
                        📌 다음 결제일부터{" "}
                        <strong>{subscription.scheduledPlan}</strong>(월{" "}
                        {subscription.scheduledAmount?.toLocaleString()}원)으로
                        변경 예정
                      </div>
                    )}
                  </div>
                  <div className={styles.benefitTitle}>이용중인 혜택</div>
                  {PLAN_BENEFITS.map((benefit) => {
                    const active = isBenefitActive(benefit.key, subscription.plan);
                    return (
                      <div key={benefit.key} className={styles.detailRowCustom}>
                        <span
                          className={styles.detailLabelCustom}
                          style={{ color: active ? "#010101" : "#d0d0d0", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <BenefitIcon type={benefit.key} color={active ? "#0051FF" : "#d0d0d0"} />
                          {benefit.key}
                        </span>
                        {active && benefit.link && (
                          <a
                            className={styles.detailValueCustomBtn}
                            href={benefit.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {benefit.linkText}
                          </a>
                        )}
                      </div>
                    );
                  })}
                  <div className={styles.subWrapper}>
                    <div className={styles.subscriptionActionRow}>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => handleSubscriptionAction("cancel")}
                      >
                        구독 해지
                      </button>
                    </div>
                  </div>
                </>
              )
            ) : (
              <>
                <div
                  className={styles.benefitTitles}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  구독중인 플랜이 없습니다.
                  <button
                    className={styles.startBtnSmall}
                    onClick={() => handleSubscriptionAction("start")}
                  >
                    구독 시작
                  </button>
                </div>
                <div className={styles.subscriptionMessages}>
                  올케어 구독으로 더 많은 혜택을 받아보세요!
                </div>
                <div className={styles.benefitList}>
                  {PLAN_BENEFITS.map((benefit) => (
                    <div key={benefit.key} className={styles.benefitItemInactive}>
                      <BenefitIcon type={benefit.key} color="#d0d0d0" />
                      {benefit.key}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* 결제 내역 섹션 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>결제 내역</h2>

          <div className={styles.paymentHistoryCard}>
            <div className={styles.paymentHistoryHeader}>
              <button
                className={styles.moreBtn}
                onClick={() => router.push("/payment/history")}
              >
                더보기
              </button>
            </div>
            {paymentHistory.length > 0 ? (
              <div className={styles.paymentTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>결제일</th>
                      <th>플랜</th>
                      <th>금액</th>
                      <th>결제방법</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPaymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          {new Date(payment.date).toLocaleDateString("ko-KR")}
                        </td>
                        <td>
                          {payment.plan === "premium" ? "올케어" : payment.plan}
                        </td>
                        <td>{payment.amount.toLocaleString()}원</td>
                        <td>{payment.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Matching-style Pagination controls */}
                {paymentHistory.length > historyPageSize && (
                  <div className={styles.pagination}>
                    {historyPage > 1 && (
                      <button
                        className={styles.pageButton}
                        onClick={() => setHistoryPage(historyPage - 1)}
                      >
                        <svg
                          className={styles.pageArrow}
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          style={{ transform: "rotate(180deg)" }}
                        >
                          <path
                            d="M5.45848 1.79279C5.27101 1.98031 5.16569 2.23462 5.16569 2.49979C5.16569 2.76495 5.27101 3.01926 5.45848 3.20679L10.4085 8.15679L5.45848 13.1068C5.27632 13.2954 5.17552 13.548 5.1778 13.8102C5.18008 14.0724 5.28525 14.3232 5.47066 14.5086C5.65607 14.694 5.90688 14.7992 6.16908 14.8015C6.43127 14.8037 6.68387 14.7029 6.87248 14.5208L12.5295 8.86379C12.7169 8.67626 12.8223 8.42195 12.8223 8.15679C12.8223 7.89162 12.717 7.63731 12.5295 7.44979L6.87248 1.79279C6.68495 1.60532 6.43064 1.5 6.16548 1.5C5.90031 1.5 5.64601 1.60532 5.45848 1.79279Z"
                            fill="#919191"
                          />
                        </svg>
                      </button>
                    )}

                    {(() => {
                      const totalPages = Math.max(
                        1,
                        Math.ceil(paymentHistory.length / historyPageSize),
                      );
                      const maxVisible = 4;
                      let startPage = Math.max(
                        1,
                        historyPage - Math.floor(maxVisible / 2),
                      );
                      let endPage = Math.min(
                        totalPages,
                        startPage + maxVisible - 1,
                      );
                      if (endPage - startPage + 1 < maxVisible) {
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }
                      return Array.from(
                        { length: endPage - startPage + 1 },
                        (_, i) => startPage + i,
                      ).map((page) => (
                        <button
                          key={page}
                          className={
                            page === historyPage
                              ? styles.pageButtonActive
                              : styles.pageButton
                          }
                          onClick={() => setHistoryPage(page)}
                        >
                          {page}
                        </button>
                      ));
                    })()}

                    {historyPage <
                      Math.ceil(paymentHistory.length / historyPageSize) && (
                      <button
                        className={styles.pageButton}
                        onClick={() => setHistoryPage(historyPage + 1)}
                      >
                        <svg
                          className={styles.pageArrow}
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M5.45848 1.79279C5.27101 1.98031 5.16569 2.23462 5.16569 2.49979C5.16569 2.76495 5.27101 3.01926 5.45848 3.20679L10.4085 8.15679L5.45848 13.1068C5.27632 13.2954 5.17552 13.548 5.1778 13.8102C5.18008 14.0724 5.28525 14.3232 5.47066 14.5086C5.65607 14.694 5.90688 14.7992 6.16908 14.8015C6.43127 14.8037 6.68387 14.7029 6.87248 14.5208L12.5295 8.86379C12.7169 8.67626 12.8223 8.42195 12.8223 8.15679C12.8223 7.89162 12.717 7.63731 12.5295 7.44979L6.87248 1.79279C6.68495 1.60532 6.43064 1.5 6.16548 1.5C5.90031 1.5 5.64601 1.60532 5.45848 1.79279Z"
                            fill="#919191"
                          />
                        </svg>
                      </button>
                    )}

                    {historyPage <
                      Math.ceil(paymentHistory.length / historyPageSize) && (
                      <button
                        className={styles.pageButton}
                        onClick={() =>
                          setHistoryPage(
                            Math.ceil(paymentHistory.length / historyPageSize),
                          )
                        }
                      >
                        <svg
                          className={styles.pageArrow}
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M2.99902 1.5C3.26413 1.5 3.51854 1.60557 3.70605 1.79297L9.36328 7.4502C9.55068 7.63771 9.65625 7.89212 9.65625 8.15723C9.65613 8.42223 9.55065 8.67683 9.36328 8.86426L3.70605 14.5205C3.51746 14.7026 3.26509 14.804 3.00293 14.8018C2.74083 14.7994 2.49005 14.6941 2.30469 14.5088C2.11936 14.3235 2.01409 14.0726 2.01172 13.8105C2.00944 13.5484 2.10987 13.295 2.29199 13.1064L7.24219 8.15723L2.29199 3.20703C2.10464 3.01956 2.00006 2.76503 2 2.5C2 2.23499 2.10472 1.98047 2.29199 1.79297C2.47942 1.6056 2.73402 1.50012 2.99902 1.5ZM7.99902 1.5C8.26413 1.5 8.51854 1.60557 8.70605 1.79297L14.3633 7.4502C14.5507 7.63771 14.6562 7.89212 14.6562 8.15723C14.6561 8.42223 14.5506 8.67683 14.3633 8.86426L8.70605 14.5205C8.51746 14.7026 8.26509 14.804 8.00293 14.8018C7.74083 14.7994 7.49005 14.6941 7.30469 14.5088C7.11936 14.3235 7.01409 14.0726 7.01172 13.8105C7.00944 13.5484 7.10987 13.295 7.29199 13.1064L12.2422 8.15723L7.29199 3.20703C7.10464 3.01956 7.00006 2.76503 7 2.5C7 2.23499 7.10472 1.98047 7.29199 1.79297C7.47942 1.6056 7.73402 1.50012 7.99902 1.5Z"
                            fill="#919191"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.emptyMessage}>결제 내역이 없습니다.</p>
            )}
          </div>
        </section>
      </div>

      {/* 회원 탈퇴 모달 */}
      {showDeleteModal && (
        <Portal>
          <div
            className={styles.modalOverlay}
            onClick={() => setShowDeleteModal(false)}
          />
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalCloseBtn}
              onClick={() => setShowDeleteModal(false)}
            >
              ×
            </button>
            <div className={styles.modalTitle}>회원 탈퇴</div>
            <div className={styles.modalBody}>
              <p>
                계정을 삭제하면 복구할 수 없습니다. 관련 구독/결제 정보가
                제거되며, 제공된 혜택은 소급 환불되지 않습니다.
              </p>
              {userInfo?.provider === "email" ? (
                <div className={styles.formGroup}>
                  <label className={styles.label}>현재 비밀번호</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className={styles.input}
                    placeholder="비밀번호를 입력하세요"
                  />
                </div>
              ) : (
                <p>
                  소셜 로그인 계정은 소셜 제공자에서 연결을 해제한 후 삭제가
                  가능합니다.
                </p>
              )}
              {deleteError && (
                <div className={styles.errorBox}>{deleteError}</div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setShowDeleteModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.deleteConfirmBtn}
                onClick={async () => {
                  setDeleteError("");
                  try {
                    const token = localStorage.getItem("token");
                    if (!token) {
                      setDeleteError(
                        "인증 정보가 없습니다. 다시 로그인해주세요.",
                      );
                      return;
                    }

                    const payload: any = (() => {
                      try {
                        return JSON.parse(atob(token.split(".")[1]));
                      } catch {
                        return {};
                      }
                    })();

                    if (payload.provider === "email" && !deletePassword) {
                      setDeleteError("비밀번호를 입력하세요.");
                      return;
                    }

                    const response = await fetch("/api/user/delete", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ password: deletePassword }),
                    });

                    const data = await response.json();
                    if (!response.ok) {
                      setDeleteError(data.error || "계정 삭제에 실패했습니다.");
                      return;
                    }

                    // 성공하면 로컬 세션 정리하고 홈으로 이동
                    localStorage.removeItem("token");
                    window.dispatchEvent(new Event("authChange"));
                    alert(
                      data.message ||
                        "계정이 삭제되었습니다. 이용해 주셔서 감사합니다.",
                    );
                    router.push("/");
                  } catch (err) {
                    console.error("Delete account error:", err);
                    setDeleteError("계정 삭제 중 오류가 발생했습니다.");
                  }
                }}
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* 환불 정책 안내 모달 */}
      {showRefundModal && (
        <Portal>
          <div
            className={styles.modalOverlay}
            onClick={() => setShowRefundModal(false)}
          />
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalCloseBtn}
              onClick={() => setShowRefundModal(false)}
            >
              ×
            </button>
            <div className={styles.modalTitle}>환불 정책 안내</div>
            <div className={styles.refundPolicyContent}>
              <div className={styles.policySection}>
                <h4>청약철회 제한 (필독)</h4>
                <p className={styles.policyNotice}>
                  본 상품은 결제 즉시 혜택이 부여되는 디지털 콘텐츠로, 아래{" "}
                  <strong>[이용 간주 기준]</strong> 중 하나라도 해당하는 경우
                  전자상거래법에 의거하여{" "}
                  <strong>환불 및 청약철회가 절대 불가능</strong>합니다.
                </p>
                <ul className={styles.policyList}>
                  <li>
                    • <strong>혜택 적용:</strong> 학점은행제 수강신청 시 구독
                    회원 할인을 적용받은 경우
                  </li>
                  <li>
                    • <strong>정보 열람:</strong> 실습 매칭 시스템에 접속하여
                    상세 정보를 1회 이상 확인한 경우
                  </li>
                  <li>
                    • <strong>권한 사용:</strong> 직업훈련 수강권(쿠폰 번호
                    등)을 조회하거나 발급받은 경우
                  </li>
                </ul>
              </div>

              <div className={styles.policySection}>
                <h4>환불 및 중도 해지 규정</h4>
                <ul className={styles.policyList}>
                  <li>
                    <strong>서비스 개시 기준:</strong> 본 서비스는 결제 완료와
                    동시에 '할인 권한' 및 '정보 접근권'이 즉시 부여되므로,
                    시스템상 <strong>서비스 제공이 완료된 것으로 간주</strong>
                    합니다.
                  </li>
                  <li>
                    <strong>중도 해지 시 정산:</strong> 환불 가능
                    대상(미이용자)이라 하더라도 중도 해지 시에는{" "}
                    <strong>[제공된 서비스의 정가 차액]</strong> 및 대행
                    수수료를 공제한 후 정산됩니다.
                  </li>
                  <li>
                    <strong>할인 혜택 회수:</strong> 1년 6개월 구독을 전제로 제공된
                    혜택이므로, 중도 해지 시에는 이미 적용받은 수강료
                    할인분(정상가 - 할인가)을 전액 환불 금액에서 차감하며,
                    차감액이 결제 금액을 초과할 경우 환불되지 않습니다.
                  </li>
                </ul>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setShowRefundModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.refundConfirmBtn}
                onClick={handleRefundRequest}
              >
                환불 요청하기
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* 구독 시트 모달 */}
      {showSubscriptionSheet && (
        <>
          <div className={styles.modalOverlay} onClick={handleSheetClose} />
          <div
            className={`${styles.subscribeSheet} ${sheetTransitionEnabled ? styles.withTransition : styles.dragging}`}
            style={{ transform: `translateX(-50%) translateY(${dragY}px)` }}
          >
            <div className={styles.sheetHandleContainer}>
              <BottomSheetHandle
                ariaLabel="구독 시트 핸들"
                hint=""
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              />
            </div>
            <div className={styles.sheetTitle}>한평생 올케어 월간 이용권</div>
            <div
              style={{
                width: "100%",
                marginTop: "12px",
                marginBottom: "12px",
                paddingLeft: "16px",
                paddingRight: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#656565",
                  marginBottom: "8px",
                }}
              >
                요금제를 선택하세요
              </div>
              <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      borderRadius: "8px",
                      border:
                        selectedPlan === plan.id
                          ? "2px solid #0051ff"
                          : "1px solid #d9d9d9",
                      background: selectedPlan === plan.id ? "#f0f6ff" : "#fff",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: selectedPlan === plan.id ? "700" : "500",
                      color: selectedPlan === plan.id ? "#0051ff" : "#656565",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: "10px", marginBottom: "2px" }}>
                      {plan.name}
                    </div>
                    <div style={{ fontSize: "11px" }}>
                      ₩{plan.price.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.sheetSub}>
              월{" "}
              <span className={styles.sheetPrice}>
                {PLANS.find(
                  (p) => p.id === selectedPlan,
                )?.price.toLocaleString()}
                원
              </span>{" "}
              결제
            </div>
            <hr className={styles.sheetDivider} />
            <div className={styles.sheetAgreeRow}>
              <span className={styles.sheetAgreeAll}>모두 동의합니다.</span>
              <span
                className={`${styles.sheetCheckbox} ${agreeAll ? styles.sheetCheckboxChecked : ""}`}
                onClick={handleAgreeAll}
              >
                {agreeAll && (
                  <svg
                    className={styles.sheetCheckIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    width="9"
                    height="9"
                    viewBox="0 0 9 9"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z"
                      fill="#fff"
                    />
                  </svg>
                )}
              </span>
            </div>
            <div className={styles.sheetAgreeRow}>
              <span className={styles.sheetAgreeSub}>
                이용권 정기결제 동의{" "}
                <span className={styles.sheetAgreeRequired}>(필수)</span>
              </span>
              <span
                className={`${styles.sheetCheckbox} ${agreements[0] ? styles.sheetCheckboxChecked : ""}`}
                onClick={() => handleAgreement(0)}
              >
                {agreements[0] && (
                  <svg
                    className={styles.sheetCheckIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    width="9"
                    height="9"
                    viewBox="0 0 9 9"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z"
                      fill="#fff"
                    />
                  </svg>
                )}
              </span>
            </div>

            <div className={styles.sheetAgreeRow}>
              <span>
                <span
                  className={styles.sheetAgreeUnderline}
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowTerms(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setShowTerms(true);
                  }}
                >
                  이용약관
                </span>
                <span className={styles.sheetAgreeAnd}> 및 </span>
                <span
                  className={styles.sheetAgreeUnderline}
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowSubscriptionTerms(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setShowSubscriptionTerms(true);
                  }}
                >
                  결제 및 구독 유의사항
                </span>
                <span className={styles.sheetAgreeRequired}> (필수)</span>
              </span>
              <span
                className={`${styles.sheetCheckbox} ${agreements[1] ? styles.sheetCheckboxChecked : ""}`}
                onClick={() => handleAgreement(1)}
              >
                {agreements[1] && (
                  <svg
                    className={styles.sheetCheckIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    width="9"
                    height="9"
                    viewBox="0 0 9 9"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z"
                      fill="#fff"
                    />
                  </svg>
                )}
              </span>
            </div>

            <div className={styles.sheetAgreeRow}>
              <span>
                <span
                  className={styles.sheetAgreeUnderline}
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowThirdPartyProvision(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setShowThirdPartyProvision(true);
                  }}
                >
                  멤버십 제3자 개인정보 제공
                </span>
                <span className={styles.sheetAgreeRequired}> (필수)</span>
              </span>
              <span
                className={`${styles.sheetCheckbox} ${agreements[2] ? styles.sheetCheckboxChecked : ""}`}
                onClick={() => handleAgreement(2)}
              >
                {agreements[2] && (
                  <svg
                    className={styles.sheetCheckIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    width="9"
                    height="9"
                    viewBox="0 0 9 9"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z"
                      fill="#fff"
                    />
                  </svg>
                )}
              </span>
            </div>

            <button
              className={`${styles.sheetButton} ${!agreeAll || !isPayAppLoaded ? styles.sheetButtonDisabled : ""}`}
              disabled={!agreeAll || !isPayAppLoaded}
              title={
                !isPayAppLoaded
                  ? isPayAppLoading
                    ? "결제 시스템을 로딩중입니다"
                    : "결제 시스템 로딩 실패"
                  : ""
              }
              onClick={async () => {
                if (!agreeAll) return;
                if (!isPayAppLoaded) {
                  alert(
                    isPayAppLoading
                      ? "결제 시스템을 로딩중입니다. 잠시 후 다시 시도해주세요."
                      : "결제 시스템 로딩에 실패했습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.",
                  );
                  return;
                }

                try {
                  const token = localStorage.getItem("token");
                  if (!token || !userInfo) {
                    alert("사용자 정보를 불러올 수 없습니다.");
                    return;
                  }

                  const { name, phone } = userInfo;

                  if (!name || !phone) {
                    alert(
                      "사용자 정보(이름, 연락처)가 없습니다. 회원정보를 먼저 입력해주세요.",
                    );
                    return;
                  }

                  // localStorage에서 토큰 가져와서 user_id 추출
                  let userId = "";
                  try {
                    const payload = JSON.parse(atob(token.split(".")[1]));
                    userId = payload.userId || "";
                  } catch (e) {
                    console.error("Token parse error:", e);
                  }

                  const baseUrl = window.location.origin;
                  const shopName =
                    process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || "한평생올케어";
                  const payappUserId =
                    process.env.NEXT_PUBLIC_PAYAPP_USER_ID || "";

                  if (!payappUserId) {
                    alert(
                      "결제 시스템 설정 오류입니다. 관리자에게 문의하세요.",
                    );
                    return;
                  }

                  // PayApp 초기화
                  window.PayApp.setDefault("userid", payappUserId);
                  window.PayApp.setDefault("shopname", shopName);

                  const now = new Date();
                  const expireDate = new Date(now);
                  expireDate.setMonth(expireDate.getMonth() + 18);
                  const rebillExpire = expireDate.toISOString().split("T")[0];
                  const rebillCycleMonth = now.getDate().toString();
                  const orderId = `SUBS-${userId}-${Date.now()}`;

                  // PayApp 파라미터 설정
                  window.PayApp.setParam("goodname", "한평생 올케어 월 구독")
                    .setParam("price", "20000")
                    .setParam("recvphone", phone.replace(/-/g, ""))
                    .setParam("recvname", name)
                    .setParam("orderid", orderId)
                    .setParam(
                      "timestamp",
                      Math.floor(Date.now() / 1000).toString(),
                    )
                    .setParam("rebillamount", "20000")
                    .setParam("rebillexpire", rebillExpire)
                    .setParam("rebill_cycle_month", rebillCycleMonth)
                    .setParam("var1", userId)
                    .setParam("returnurl", `${baseUrl}/api/payments/result`)
                    .setParam("startpaytype", "card")
                    .setParam("servicetype", "BR");

                  // 선택된 플랜 정보 가져오기
                  const selectedPlanInfo = PLANS.find(
                    (p) => p.id === selectedPlan,
                  );
                  if (!selectedPlanInfo) {
                    alert("선택된 요금제가 없습니다.");
                    return;
                  }

                  // 정기결제용 파라미터를 메인 페이지와 동일하게 설정하고 rebill() 호출
                  const planDisplayName = `올케어구독상품-${selectedPlanInfo.name}`;
                  window.PayApp.setParam("goodname", planDisplayName);
                  window.PayApp.setParam(
                    "goodprice",
                    selectedPlanInfo.price.toString(),
                  );
                  window.PayApp.setParam("recvphone", phone.replace(/-/g, ""));
                  window.PayApp.setParam("buyername", name);
                  window.PayApp.setParam("smsuse", "n");
                  window.PayApp.setParam("rebillCycleType", "Month");
                  window.PayApp.setParam("rebillCycleMonth", rebillCycleMonth);
                  window.PayApp.setParam("rebillExpire", rebillExpire);
                  window.PayApp.setParam(
                    "feedbackurl",
                    `${baseUrl}/api/payments/webhook`,
                  );
                  window.PayApp.setParam(
                    "returnurl",
                    `${baseUrl}/payment/success`,
                  );
                  window.PayApp.setParam(
                    "var1",
                    JSON.stringify({
                      orderId: `SUBS-${userId}-${Date.now()}`,
                      userId,
                      phone,
                      name,
                      plan: selectedPlan,
                      price: selectedPlanInfo.price,
                    }),
                  );

                  try {
                    window.PayApp.rebill();
                    // 시트 닫기
                    handleSheetClose();
                  } catch (e) {
                    console.error("PayApp rebill failed:", e);
                    alert(
                      "결제창을 열 수 없습니다. 팝업 차단을 해제하고 다시 시도해주세요.",
                    );
                  }
                } catch (error) {
                  console.error("Payment error:", error);
                  alert("결제 처리 중 오류가 발생했습니다.");
                }
              }}
            >
              {!isPayAppLoaded
                ? isPayAppLoading
                  ? "결제 시스템 로딩중..."
                  : "결제 시스템 로딩 실패"
                : "한평생 올케어 구독하기"}
            </button>
          </div>
        </>
      )}

      {showTerms && (
        <>
          <div
            className={styles.modalOverlay}
            onClick={() => setShowTerms(false)}
          />
          <div className={styles.modalContent}>
            <button
              className={styles.modalCloseBtn}
              onClick={() => setShowTerms(false)}
            >
              &times;
            </button>
            <div className={styles.modalTitle}>이용약관</div>
            <div className={styles.modalBody}>
              제1조 (서비스의 정의)
              <br />
              본 서비스는 학습자의 원활한 학위 취득 및 자격증 취득을 돕기 위해
              다음의 항목을 제공하는 1년 6개월 정기 구독형 서비스입니다.
              <br />
              - 학점은행제 수강료 할인 및 미이수 전액환급 보장
              <br />
              - 한평생 직업훈련 무료수강 이용권
              <br />
              - 올케어 실습 매칭 시스템 이용권
              <br />
              <br />
              제2조 (혜택별 이행 조건 및 면책)
              <br />
              - 학점은행제 수강료 할인 및 미이수 전액환급 보장: 본 혜택은
              한평생교육에서 지정한 학점은행제 교육기관에서 수강하는 경우에만
              적용됩니다. 회사가 지정하지 않은 타 교육기관에서 개별적으로 수강한
              경우에는 할인 및 환급 보장 대상에서 제외됩니다. 출석률 100% 달성
              및 모든 시험(중간·기말) 응시 조건을 충족했음에도 미이수(F학점
              등)가 발생한 경우에 한해 보장됩니다.
              <br />
              - 한평생 직업훈련 무료수강 이용권: 한평생교육은 한평생직업훈련
              무료수강 이용권을 제공하며, 학습자는 직접 외부 사이트에 가입 후
              이를 등록해야 합니다. 수강료 외 자격증 발급비 등 행정 수수료는
              본인 부담입니다.
              <br />
              - 실습 매칭 시스템 이용권: 한평생교육은 전국의 실습처 정보를
              분류하여 제공하는 '정보 제공자'의 역할을 수행합니다.
              <br />
            </div>
          </div>
        </>
      )}

      {showSubscriptionTerms && (
        <>
          <div
            className={styles.modalOverlay}
            onClick={() => setShowSubscriptionTerms(false)}
          />
          <div className={styles.modalContent}>
            <button
              className={styles.modalCloseBtn}
              onClick={() => setShowSubscriptionTerms(false)}
            >
              &times;
            </button>
            <div className={styles.modalTitle}>구독 및 결제 안내</div>
            <div className={styles.modalBody}>
              <strong>[구독 및 결제 안내]</strong>
              <br />• 본 상품은 <strong>1년 6개월 정기 구독 상품</strong>으로, 최초
              가입일 기준 1년 6개월마다 자동 정기 결제가 발생합니다.
              <br />
              • 결제 완료 즉시 '수강료 할인 혜택'과 '올케어 매칭 시스템 접속
              권한'이 활성화됩니다.
              <br />
              <br />
              <strong>[환불 및 해지 유의사항 - 필독]</strong>
              <br />
              <strong>
                ※ 본 상품은 디지털 콘텐츠 및 열람권이 포함된 상품으로, 아래
                서비스 중 하나라도 이용(진입)한 경우 전자상거래법에 따라
                청약철회 및 환불이 불가능합니다.
              </strong>
              <br />
              <br />• <strong>환불 불가 기준 (서비스 이용 간주):</strong>
              <br />
              &nbsp;&nbsp;- 학점은행제 수강신청 시 본 구독 할인 혜택을 적용받은
              경우
              <br />
              &nbsp;&nbsp;-{" "}
              <strong>
                실습 매칭 시스템에 접속하여 정보를 열람(클릭)한 경우
              </strong>
              <br />
              &nbsp;&nbsp;- 직업훈련 수강권(쿠폰 번호 등)을 확인하거나 발급받은
              경우
              <br />
              <br />• <strong>중도 해지 시 정산:</strong>
              <br />
              &nbsp;&nbsp;- 환불 가능 대상(미이용자)이라 하더라도, 중도 해지
              시에는 [제공된 서비스의 정가 환산 금액] 및 결제 수수료를 차감한 후
              정산됩니다. 차감액이 결제 대금을 초과할 경우 환불액은 발생하지
              않습니다.
              <br />
              <br />
              <strong>[학습자 주의 의무 및 면책]</strong>
              <br />• <strong>학습자 귀책:</strong> 실습기관 및 교육원별 공지
              미숙지, 서류(선이수 증명서 등) 제출 누락, 기한 초과 등 학습자
              본인의 과실로 발생한 실습 미이수 및 신청 거절에 대해 회사는
              책임지지 않으며, 이를 이유로 환불을 요구할 수 없습니다.
              <br />
              <br />• <strong>손해배상 제한:</strong> 회사는 서비스 이용
              과정에서 발생한 자격증 취득 지연, 취업 결과, 임금 손실 등 일체의
              간접적·결과적 손해에 대해 배상 책임을 지지 않습니다.
              <br />
              <br />• <strong>별도 비용 안내:</strong> 직업훈련 수강권 이용 시
              발생하는 자격증 발급 비용 등 행정 비용은 서비스 금액에 포함되어
              있지 않으며, 본인 별도 부담입니다.
              <br />
            </div>
          </div>
        </>
      )}

      {showPlanChangeSheet && (
        <>
          <div
            className={styles.modalOverlay}
            onClick={handlePlanChangeSheetClose}
          />
          <div
            className={`${styles.subscribeSheet} ${sheetTransitionEnabled ? styles.withTransition : styles.dragging}`}
            style={{ transform: `translateX(-50%) translateY(${dragY}px)` }}
          >
            <div className={styles.sheetHandleContainer}>
              <BottomSheetHandle
                onClick={handlePlanChangeSheetClose}
                hint=""
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              />
            </div>
            <div className={styles.sheetTitle}>요금제 변경</div>
            <div
              style={{ width: "100%", marginTop: "12px", marginBottom: "8px" }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#656565",
                  marginBottom: "8px",
                }}
              >
                현재 플랜:{" "}
                <strong>{subscription.plan || "플랜 정보 없음"}</strong>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#656565",
                  marginBottom: "8px",
                }}
              >
                변경할 요금제를 선택하세요
              </div>
              <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      borderRadius: "8px",
                      border:
                        selectedPlan === plan.id
                          ? "2px solid #0051ff"
                          : "1px solid #d9d9d9",
                      background: selectedPlan === plan.id ? "#f0f6ff" : "#fff",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: selectedPlan === plan.id ? "700" : "500",
                      color: selectedPlan === plan.id ? "#0051ff" : "#656565",
                      transition: "all 0.2s",
                      position: "relative",
                    }}
                  >
                    {subscription.plan === plan.name && (
                      <div
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          width: "16px",
                          height: "16px",
                          backgroundColor: "#0051ff",
                          color: "#fff",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </div>
                    )}
                    <div style={{ fontSize: "10px", marginBottom: "2px" }}>
                      {plan.name}
                    </div>
                    <div style={{ fontSize: "11px" }}>
                      ₩{plan.price.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              const selectedPlanInfo = PLANS.find(
                (p) => p.id === selectedPlan,
              );
              const currentPlanInfo = PLANS.find(
                (p) => p.name === subscription.plan,
              );
              const isUpgrade =
                selectedPlanInfo &&
                currentPlanInfo &&
                selectedPlanInfo.price > currentPlanInfo.price;
              const isDowngrade =
                selectedPlanInfo &&
                currentPlanInfo &&
                selectedPlanInfo.price < currentPlanInfo.price;
              const isSame = subscription.plan === selectedPlanInfo?.name;

              return (
                <>
                  <div className={styles.sheetSub}>
                    월{" "}
                    <span className={styles.sheetPrice}>
                      {selectedPlanInfo?.price.toLocaleString()}원
                    </span>{" "}
                    결제
                  </div>
                  {isUpgrade && !isSame && (
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#f0f6ff",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#0051ff",
                        lineHeight: "1.6",
                        marginTop: "8px",
                      }}
                    >
                      📌 <strong>업그레이드</strong> — 결제 후 즉시 적용
                      <br />
                      • 월 {selectedPlanInfo?.price.toLocaleString()}원으로
                      새 정기결제가 등록됩니다
                      <br />• 기능은 결제 완료 즉시 적용됩니다
                    </div>
                  )}
                  {isDowngrade && !isSame && (
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#fff8f0",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#e67e22",
                        lineHeight: "1.6",
                        marginTop: "8px",
                      }}
                    >
                      📌 <strong>다운그레이드</strong> — 다음 결제일부터 적용
                      <br />• 현재 결제 기간 종료 후 월{" "}
                      {selectedPlanInfo?.price.toLocaleString()}원으로 변경
                    </div>
                  )}
                </>
              );
            })()}
            <hr className={styles.sheetDivider} />
            <div className={styles.sheetAgreeRow}>
              <span className={styles.sheetAgreeAll}>모두 동의합니다.</span>
              <span
                className={`${styles.sheetCheckbox} ${planChangeAgreeAll ? styles.sheetCheckboxChecked : ""}`}
                onClick={handlePlanChangeAgreeAll}
              >
                {planChangeAgreeAll && (
                  <svg
                    className={styles.sheetCheckIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    width="9"
                    height="9"
                    viewBox="0 0 9 9"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z"
                      fill="#fff"
                    />
                  </svg>
                )}
              </span>
            </div>
            {[
              <span className={styles.sheetAgreeSub}>
                요금제 변경에 동의합니다{" "}
                <span className={styles.sheetAgreeRequired}>(필수)</span>
              </span>,
              <span>
                <span
                  className={styles.sheetAgreeUnderline}
                  onClick={() => setShowTerms(true)}
                >
                  이용약관
                </span>
                <span className={styles.sheetAgreeAnd}> 및 </span>
                <span
                  className={styles.sheetAgreeUnderline}
                  onClick={() => setShowSubscriptionTerms(true)}
                >
                  결제 및 구독 유의사항
                </span>
                <span className={styles.sheetAgreeRequired}> (필수)</span>
              </span>,
              <span>
                <span
                  className={styles.sheetAgreeUnderline}
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowThirdPartyProvision(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setShowThirdPartyProvision(true);
                  }}
                >
                  제3자 개인정보 제공
                </span>
                <span className={styles.sheetAgreeRequired}> (필수)</span>
              </span>,
            ].map((txt, idx: number) => (
              <div className={styles.sheetAgreeRow} key={idx}>
                {txt}
                <span
                  className={`${styles.sheetCheckbox} ${planChangeAgreements[idx] ? styles.sheetCheckboxChecked : ""}`}
                  onClick={() => handlePlanChangeAgreement(idx)}
                >
                  {planChangeAgreements[idx] && (
                    <svg
                      className={styles.sheetCheckIcon}
                      xmlns="http://www.w3.org/2000/svg"
                      width="9"
                      height="9"
                      viewBox="0 0 9 9"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z"
                        fill="#fff"
                      />
                    </svg>
                  )}
                </span>
              </div>
            ))}
            <button
              className={`${styles.sheetButton} ${!planChangeAgreeAll ? styles.sheetButtonDisabled : ""}`}
              onClick={() => {
                if (!planChangeAgreeAll) return;

                const selectedPlanInfo = PLANS.find((p) => p.id === selectedPlan);
                const currentPlanInfo = PLANS.find((p) => p.name === subscription.plan);
                const isDowngrade =
                  selectedPlanInfo &&
                  currentPlanInfo &&
                  selectedPlanInfo.price < currentPlanInfo.price;

                if (isDowngrade) {
                  const lostFeatures = PLAN_BENEFITS
                    .filter(
                      (b) =>
                        b.plans.includes(currentPlanInfo!.name) &&
                        !b.plans.includes(selectedPlanInfo!.name),
                    )
                    .map((b) => b.key);

                  if (lostFeatures.length > 0) {
                    setDowngradeWarning(
                      `${selectedPlanInfo!.name}으로 변경하면\n${lostFeatures.join(", ")}을(를)\n이용할 수 없게 됩니다.\n\n그래도 변경하시겠습니까?`,
                    );
                    setPendingPlanChange(() => executePlanChange);
                    setShowDowngradeConfirm(true);
                    return;
                  }
                }

                executePlanChange();
              }}
              disabled={!planChangeAgreeAll}
            >
              요금제 변경하기
            </button>
          </div>
        </>
      )}

      {showThirdPartyProvision && (
        <Portal>
          <div
            className={styles.modalOverlay}
            onClick={() => setShowThirdPartyProvision(false)}
          />
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalCloseBtn}
              onClick={() => setShowThirdPartyProvision(false)}
            >
              &times;
            </button>
            <div className={styles.modalTitle}>
              멤버십 제3자 개인정보 제공 안내
            </div>
            <div className={styles.modalBody}>
              <div>
                <strong>개인정보 제3자 제공 동의 안내</strong>
              </div>
              <div style={{ height: 8 }} />
              <div>
                한평생그룹은 한평생실습 멤버십 서비스 제공을 위하여 아래와 같이
                개인정보를 제3자에게 제공할 수 있습니다.
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>1. 제공받는 자</strong>
                <br />
                한평생그룹 계열사
                <br />
                한평생실습 멤버십 운영 및 실습 연계 기관
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>2. 제공 목적</strong>
                <br />
                한평생실습 멤버십 서비스 제공
                <br />
                실습 과정 운영 및 관리
                <br />
                실습 연계, 출결 관리, 안내 및 공지 사항 전달
                <br />
                관련 행정 처리 및 고객 지원
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>3. 제공하는 개인정보 항목</strong>
                <br />
                이름, 연락처(휴대전화번호), 이메일
                <br />
                소속 정보, 멤버십 이용 내역
                <br />
                실습 참여 및 이력 관련 정보
                <br />※ 서비스 제공에 필요한 최소한의 정보만 제공됩니다.
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>4. 보유 및 이용 기간</strong>
                <br />
                멤버십 서비스 이용 기간 동안 보유·이용
                <br />
                관련 법령에 따라 보존이 필요한 경우 해당 기간까지 보관
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>5. 동의 거부 권리 및 불이익 안내</strong>
                <br />
                개인정보 제3자 제공에 대한 동의를 거부할 수 있습니다.
                <br />
                다만, 동의를 거부할 경우 한평생실습 멤버십 서비스 및 실습 연계
                제공이 제한될 수 있습니다.
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* 다운그레이드 기능 손실 확인 모달 */}
      {showDowngradeConfirm && (
        <AlertModal
          message={downgradeWarning}
          onClose={() => {
            setShowDowngradeConfirm(false);
            setPendingPlanChange(null);
          }}
          onConfirm={() => {
            setShowDowngradeConfirm(false);
            if (pendingPlanChange) pendingPlanChange();
            setPendingPlanChange(null);
          }}
          confirmLabel="변경하기"
          cancelLabel="취소"
        />
      )}

      {/* PayApp SDK loading handled via loadPayAppSDK util */}
    </div>
  );
}
