"use client";
import styles from "./matching.module.css";
import mapStyles from "./navermap.module.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "../../lib/supabase";
import { haversineDistance } from "../../lib/haversine";
import FilterBarCustom from "./FilterBarCustom";
import LocationSearchBar from "./LocationSearchBar";
import { useUserLocation } from "./useUserLocation";
import AlertModal from "../../components/AlertModal";

// 네이버 지도 컴포넌트 (SSR 비활성화, lazy load)
const NaverMapView = dynamic(() => import("./NaverMapView"), {
  ssr: false,
  loading: () => (
    <div className={mapStyles.mapLoading}>지도 로딩 중...</div>
  ),
});

export default function MatchingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const accordionList = [
    { title: "학습자 사전 이수 조건" },
    { title: "실습 인정 절대 원칙" },
    { title: "이론 및 행정 절차" },
    { title: "실무 및 섭외" },
  ];
  const [mode, setMode] = useState<"교육원" | "현장실습기관">("교육원");

  // 검색 모드: 지역 필터 vs 위치 검색
  const [searchMode, setSearchMode] = useState<"region" | "location">(
    "region",
  );

  // 기존 지역 필터 state
  const [filters, setFilters] = useState({
    region: "",
    subregion: "",
    law: "",
  });
  const [filtersTemp, setFiltersTemp] = useState(filters);
  const [hasSearched, setHasSearched] = useState(false);

  // 데이터 state
  const [centers, setCenters] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 위치 검색 hook
  const { locationState, detectGPS, geocodeAddress, clearLocation } =
    useUserLocation();

  // 로그인 및 구독 상태 체크
  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      const token = localStorage.getItem("token");

      // 로그인 체크
      if (!token) {
        if (mounted) {
          setAlertMessage("로그인이 필요한 서비스입니다");
          setAlertOpen(true);
        }
        return;
      }

      try {
        // 구독 상태 체크
        const response = await fetch("/api/subscription/status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!mounted) return;

        // 401 에러: 토큰이 유효하지 않음 - 로그인 필요
        if (response.status === 401) {
          localStorage.removeItem("token");
          setAlertMessage(
            "로그인이 만료되었습니다. 다시 로그인해주세요.\n확인 버튼을 눌러 로그인 페이지로 이동합니다.",
          );
          setAlertOpen(true);
          return;
        }

        // 기타 에러 발생 시 일단 접근 허용 (서버 오류 등)
        if (!response.ok) {
          console.error("[매칭 시스템] 구독 상태 확인 실패:", response.status);
          setIsChecking(false);
          return;
        }

        const data = await response.json();

        // 비구독자는 차단
        if (!data.isActive) {
          setAlertMessage(
            "구독자만 이용할 수 있는 서비스입니다.\n확인 버튼을 눌러 홈으로 이동합니다.",
          );
          setAlertOpen(true);
          return;
        }

        // 구독자는 접근 허용
        setIsChecking(false);
      } catch (error) {
        console.error("[매칭 시스템] Access check error:", error);
        // 네트워크 에러 등은 일단 접근 허용
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, []);

  // 모드 변경 시 기본 데이터 로드 (지역 검색 모드)
  useEffect(() => {
    setCurrentPage(1);
    // reset temp filters to current filters
    setFiltersTemp(filters);

    // 위치 검색 모드면 이 effect에서 데이터 안 불러옴
    if (searchMode === "location") return;

    // if user has already performed a manual search, don't override results
    if (hasSearched) return;

    // fetch default (unfiltered) results for the active mode
    const fetchDefaults = async () => {
      setLoading(true);
      try {
        if (mode === "교육원") {
          const { data } = await supabase
            .from("training_centers")
            .select("*")
            .limit(20);
          setCenters(data || []);
          setInstitutions([]);
        } else {
          const { data } = await supabase
            .from("training_institution")
            .select("*")
            .limit(20);
          setInstitutions(data || []);
          setCenters([]);
        }
      } catch (err) {
        console.error("[매칭 시스템] 기본 목록 불러오기 실패", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDefaults();
  }, [mode, hasSearched, searchMode]);

  // 지역 필터 검색 (교육원)
  useEffect(() => {
    if (searchMode === "location") return;
    if (!hasSearched) return;
    if (mode !== "교육원") return;
    setLoading(true);
    let query = supabase.from("training_centers").select("*");

    // 지역 필터링: province 또는 available_region이 "전국"인 경우 포함
    if (filters.region) {
      query = query.or(
        `province.eq.${filters.region},available_region.ilike.%전국%`,
      );
    }
    if (filters.subregion) {
      query = query.or(
        `region.eq.${filters.subregion},available_region.ilike.%전국%`,
      );
    }
    if (filters.law) query = query.eq("law_type", filters.law);

    query.then(({ data }) => {
      setCenters(data || []);
      setLoading(false);
    });
  }, [filters, mode, hasSearched, searchMode]);

  // 지역 필터 검색 (현장실습기관)
  useEffect(() => {
    if (searchMode === "location") return;
    if (!hasSearched) return;
    if (mode !== "현장실습기관") return;
    setLoading(true);
    let query = supabase.from("training_institution").select("*");
    if (filters.region)
      query = query.ilike("address1", `%${filters.region}%`);
    if (filters.subregion)
      query = query.ilike("address2", `%${filters.subregion}%`);
    query.then(({ data }) => {
      setInstitutions(data || []);
      setLoading(false);
    });
  }, [filters, mode, hasSearched, searchMode]);

  // 위치 기반 검색: 좌표가 설정되면 전체 데이터 조회 + 거리 계산 + 정렬
  useEffect(() => {
    if (searchMode !== "location" || !locationState.coords) return;

    setLoading(true);
    setCurrentPage(1);

    // Supabase 1000건 제한 우회: 1000건씩 나눠서 전체 가져오기
    const fetchAllPages = async (table: string) => {
      const PAGE_SIZE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .range(from, from + PAGE_SIZE - 1);
        if (error || !data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    };

    const fetchByLocation = async () => {
      try {
        if (mode === "교육원") {
          const data = await fetchAllPages("training_centers");
          if (data.length > 0) {
            const withDistance = data
              .map((item: any) => ({
                ...item,
                distance: haversineDistance(
                  locationState.coords!.latitude,
                  locationState.coords!.longitude,
                  item.latitude,
                  item.longitude,
                ),
              }))
              .sort((a: any, b: any) => a.distance - b.distance);
            setCenters(withDistance);
          } else {
            setCenters([]);
          }
          setInstitutions([]);
        } else {
          const data = await fetchAllPages("training_institution");
          if (data.length > 0) {
            const withDistance = data
              .map((item: any) => ({
                ...item,
                distance: haversineDistance(
                  locationState.coords!.latitude,
                  locationState.coords!.longitude,
                  item.latitude,
                  item.longitude,
                ),
              }))
              .sort((a: any, b: any) => a.distance - b.distance);
            setInstitutions(withDistance);
          } else {
            setInstitutions([]);
          }
          setCenters([]);
        }
      } catch (err) {
        console.error("[매칭 시스템] 위치 기반 검색 실패", err);
      } finally {
        setLoading(false);
      }
    };

    fetchByLocation();
  }, [locationState.coords, mode, searchMode]);

  // 검색 모드 변경 시 데이터 초기화
  const handleSearchModeChange = (newMode: "region" | "location") => {
    setSearchMode(newMode);
    setCurrentPage(1);
    setCenters([]);
    setInstitutions([]);
    setHasSearched(false);
    setFilters({ region: "", subregion: "", law: "" });
    setFiltersTemp({ region: "", subregion: "", law: "" });
    if (newMode === "region") {
      clearLocation();
    }
  };

  // 지도에 전달할 아이템 생성
  const getMapItems = () => {
    const sourceData = mode === "교육원" ? centers : institutions;
    return sourceData
      .filter((item: any) => item.latitude && item.longitude)
      .map((item: any) => ({
        id: item.id,
        name: mode === "교육원" ? item.institute_name : item.name,
        address:
          mode === "교육원" ? item.address || "" : item.full_address || "",
        contact: item.contact,
        distance: item.distance,
        latitude: item.latitude,
        longitude: item.longitude,
      }));
  };

  // 거리 표시 포맷
  const formatDistance = (distance?: number) => {
    if (distance === undefined) return null;
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  // 접근 권한 체크 중일 때
  if (isChecking) {
    // 팝업이 열려있으면 팝업만 보여줌
    if (alertOpen) {
      return (
        <AlertModal
          message={alertMessage}
          onClose={() => {
            setAlertOpen(false);
            if (alertMessage.includes("로그인이 필요한"))
              router.push("/auth/login");
            else if (alertMessage.includes("만료")) router.push("/auth/login");
            else if (alertMessage.includes("구독자만")) router.push("/");
          }}
        />
      );
    }
    // 팝업이 없으면 로딩
    return (
      <main className={styles.main_wrapper}>
        <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>
      </main>
    );
  }

  return (
    <>
      {alertOpen && (
        <AlertModal
          message={alertMessage}
          onClose={() => {
            setAlertOpen(false);
            if (alertMessage.includes("로그인이 필요한"))
              router.push("/auth/login");
            else if (alertMessage.includes("만료")) router.push("/auth/login");
            else if (alertMessage.includes("구독자만")) router.push("/");
          }}
        />
      )}
      <main className={styles.main_wrapper}>
        <div className={styles.topLayout}>
          <div className={styles.title}>실습 매칭 시스템</div>
          <div className={styles.subtitle}>
            내 조건에 맞는 기관을 손쉽게 찾아보세요
          </div>
        </div>

        <div className={styles.checkSection}>
          <div className={styles.checkTitle}>실습 시작 전에 꼭 확인할 내용</div>
          <div className={styles.checkDesc}>
            아래 <span className={styles.checkHighlight}>4가지 조건</span>을
            충족해야만 실습 인정이 가능합니다.
            <br />
            실습 진행 전,{" "}
            <span className={styles.checkHighlight}>
              아래 조건을 모두 만족했는지 꼭 확인
            </span>
            하세요!
          </div>
          <div className={styles.accordionSection}>
            {accordionList.map((item, idx) => (
              <div key={idx} className={styles.accordionItem}>
                <div
                  className={styles.accordionHeader}
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                >
                  <span>{item.title}</span>
                  <span className={styles.accordionIcon}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M12.5631 3.9063C12.3991 3.74226 12.1765 3.65011 11.9445 3.65011C11.7125 3.65011 11.49 3.74226 11.3259 3.9063L6.99465 8.23755L2.6634 3.90629C2.49837 3.74691 2.27734 3.65871 2.04792 3.6607C1.8185 3.6627 1.59904 3.75472 1.43681 3.91695C1.27457 4.07919 1.18255 4.29865 1.18056 4.52807C1.17857 4.75749 1.26676 4.97852 1.42615 5.14354L6.37602 10.0934C6.54011 10.2575 6.76263 10.3496 6.99465 10.3496C7.22667 10.3496 7.44919 10.2575 7.61327 10.0934L12.5631 5.14355C12.7272 4.97946 12.8193 4.75694 12.8193 4.52492C12.8193 4.2929 12.7272 4.07038 12.5631 3.9063Z"
                        fill="#010101"
                      />
                    </svg>
                  </span>
                </div>
                {openIdx === idx && (
                  <div className={styles.accordionContent}>
                    {idx === 0 && (
                      <div className={styles.accordionInner}>
                        <div className={styles.accordionImage} />
                        <div className={styles.accordionTextGroup}>
                          <div className={styles.accordionTextTitle}>
                            실습 하기전 들어야 되는 과목
                          </div>
                          <div className={styles.accordionTextDesc}>
                            정해진 수업을 먼저 다 들었는지 확인해야 하며,
                            <br />
                            필수 4과목 + 선택 2과목, 총 6과목 이상을 먼저 끝낸
                            사람만 실습을 할 수 있습니다.
                          </div>
                        </div>
                      </div>
                    )}
                    {idx === 1 && (
                      <div className={styles.accordionInner}>
                        <div className={styles.accordionImage2} />
                        <div className={styles.accordionTextGroup}>
                          <div className={styles.accordionTextTitle}>
                            교육원 신청과 실습기관은 동시에
                          </div>
                          <div className={styles.accordionTextDesc}>
                            <ul className={styles.accordionList}>
                              <li>
                                교육원 신청과 실습기관 신청은 따로따로 하면 안
                                되고, 반드시 같은 학기 내에 동시에 진행되어야
                                합니다. 또한 수업 신청도 안 했는데 미리 실습부터
                                하거나, 실습을 끝나고 나중에 수업 신청하는
                                경우도 인정되지 않습니다.
                              </li>
                              <li>
                                교육원이 정한 기간 안에서만 실습해야 인정됩니다.
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    {idx === 2 && (
                      <div className={styles.accordionInner}>
                        <div className={styles.accordionImage3} />
                        <div className={styles.accordionTextGroup}>
                          <div className={styles.accordionTextTitle}>
                            실습 교육원에서 수업 과목 신청
                          </div>
                          <div className={styles.accordionTextDesc}>
                            <ul className={styles.accordionList}>
                              <li>
                                실습을 하려면 먼저 교육원에 '사회복지 현장실습'
                                수업을 신청해야 합니다.
                              </li>
                              <li>
                                교육원이 정해준 실습 출석수업은 반드시 참여해야
                                합니다.
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {idx === 3 && (
                      <div className={styles.accordionInner}>
                        <div className={styles.accordionImage4} />
                        <div className={styles.accordionTextGroup}>
                          <div className={styles.accordionTextTitle}>
                            가까운 실습 기관에 직접 연락
                          </div>
                          <div className={styles.accordionTextDesc}>
                            <ul className={styles.accordionList}>
                              <li>
                                집 근처(동네 단위)에 있는 기관을 찾아 본인이
                                직접 전화해 실습이 가능한지 물어봐야 합니다.
                                <br />
                                *예시 : 안녕하세요, 00월 00일부터 평일/주말 실습
                                가능할까요?
                              </li>
                              <li>
                                본인에게 적용되는 구법/신법에 맞춰 실습 시간을
                                채우면 되고 하루에 4시간 ~ 8시간까지 인정됩니다.
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.guideBox}>
          {mode === "현장실습기관"
            ? "잠깐! 교육원에 실습 과목 신청하셨나요?"
            : searchMode === "location"
              ? "내 위치 또는 주소를 입력해 가까운 기관을 찾아보세요!"
              : "앞으로 실습 하실 지역을 기준으로 검색해보세요!"}
        </div>
        <div className={styles.filterSection}>
          {/* 모드 탭: 교육원 / 현장실습기관 */}
          <div className={styles.tabWrapper}>
            <button
              className={mode === "교육원" ? styles.tabActive : styles.tab}
              onClick={() => {
                setMode("교육원");
                setHasSearched(false);
                setFilters({ region: "", subregion: "", law: "" });
                setFiltersTemp({ region: "", subregion: "", law: "" });
                setCurrentPage(1);
              }}
            >
              교육원 찾기
            </button>
            <button
              className={
                mode === "현장실습기관" ? styles.tabActive : styles.tab
              }
              onClick={() => {
                setMode("현장실습기관");
                setHasSearched(false);
                setFilters({ region: "", subregion: "", law: "" });
                setFiltersTemp({ region: "", subregion: "", law: "" });
                setCurrentPage(1);
              }}
            >
              현장실습기관 찾기
            </button>
          </div>

          {/* 검색 모드 토글: 지역 검색 / 위치 검색 */}
          <div className={mapStyles.searchModeToggle}>
            <button
              className={
                searchMode === "region"
                  ? mapStyles.searchModeButtonActive
                  : mapStyles.searchModeButton
              }
              onClick={() => handleSearchModeChange("region")}
            >
              지역 검색
            </button>
            <button
              className={
                searchMode === "location"
                  ? mapStyles.searchModeButtonActive
                  : mapStyles.searchModeButton
              }
              onClick={() => handleSearchModeChange("location")}
            >
              위치 검색
            </button>
          </div>

          {/* 지역 검색 모드: 기존 필터 */}
          {searchMode === "region" && (
            <>
              <FilterBarCustom
                mode={mode}
                region={filtersTemp.region}
                subregion={filtersTemp.subregion}
                law={filtersTemp.law}
                onChange={setFiltersTemp}
              />
              <div className={styles.searchButtonWrapper}>
                <button
                  className={styles.searchButton}
                  onClick={() => {
                    setFilters(filtersTemp);
                    setHasSearched(true);
                    setCurrentPage(1);
                  }}
                >
                  검색
                </button>
              </div>
            </>
          )}

          {/* 위치 검색 모드: 위치 입력 + 지도 */}
          {searchMode === "location" && (
            <>
              <LocationSearchBar
                locationState={locationState}
                onDetectGPS={detectGPS}
                onGeocodeAddress={geocodeAddress}
                onClear={clearLocation}
              />
              {locationState.coords && (
                <NaverMapView
                  userLocation={locationState.coords}
                  items={getMapItems()}
                />
              )}
            </>
          )}
        </div>

        {/* 교육원 리스트 */}
        {mode === "교육원" && (
          <div className={styles.centerListSection}>
            {loading ? (
              <div>불러오는 중...</div>
            ) : centers.length === 0 ? (
              <div>
                {searchMode === "location" && !locationState.coords
                  ? "위치를 설정하면 가까운 교육원을 찾아드립니다."
                  : "검색 결과가 없습니다."}
              </div>
            ) : (
              <>
                <ul className={styles.centerListContainer}>
                  {centers
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage,
                    )
                    .map((center) => (
                      <li key={center.id} className={styles.centerList}>
                        {/* 상단 한 줄: 이름/카테고리/거리 */}
                        <div className={styles.centerNameRow}>
                          <span>{center.institute_name}</span>
                          <span className={styles.centerTypeBadge}>
                            {center.category || "교육원"}
                          </span>
                          {searchMode === "location" &&
                            formatDistance(center.distance) && (
                              <span className={mapStyles.distanceBadge}>
                                {formatDistance(center.distance)}
                              </span>
                            )}
                        </div>
                        {/* 아래 정보: 한 줄씩 */}
                        <div className={styles.centerInfoRow}>
                          <span className={styles.centerLabel}>
                            실습 가능 지역
                          </span>
                          <span className={styles.centerValue}>
                            {center.available_region || "-"}
                          </span>
                        </div>
                        <div className={styles.centerInfoRow}>
                          <span className={styles.centerLabel}>연락처</span>
                          {center.contact ? (
                            <a
                              href={`tel:${center.contact}`}
                              className={styles.centerValue}
                              style={{
                                color: "inherit",
                                textDecoration: "none",
                                cursor: "pointer",
                              }}
                            >
                              {center.contact}
                            </a>
                          ) : (
                            <span className={styles.centerValue}>-</span>
                          )}
                        </div>
                        <div className={styles.centerInfoRow}>
                          <span className={styles.centerLabel}>적용 법령</span>
                          <span className={styles.centerValue}>
                            {center.law_type || "-"}
                          </span>
                        </div>
                        <div className={styles.centerInfoRow}>
                          <span className={styles.centerLabel}>주소</span>
                          <span className={styles.centerValue}>
                            {center.address || "-"}
                          </span>
                        </div>
                        {center.note && (
                          <div className={styles.centerNoteRow}>
                            <span className={styles.centerNote}>
                              비고 : {center.note}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                </ul>
                {/* 페이지네이션 */}
                {centers.length > itemsPerPage && (
                  <div className={styles.pagination}>
                    {currentPage > 1 && (
                      <button
                        className={styles.pageButton}
                        onClick={() => setCurrentPage(currentPage - 1)}
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
                      const totalPages = Math.ceil(
                        centers.length / itemsPerPage,
                      );
                      const maxVisible = 4;
                      let startPage = Math.max(
                        1,
                        currentPage - Math.floor(maxVisible / 2),
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
                            page === currentPage
                              ? styles.pageButtonActive
                              : styles.pageButton
                          }
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                    {currentPage < Math.ceil(centers.length / itemsPerPage) && (
                      <button
                        className={styles.pageButton}
                        onClick={() => setCurrentPage(currentPage + 1)}
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
                    {currentPage < Math.ceil(centers.length / itemsPerPage) && (
                      <button
                        className={styles.pageButton}
                        onClick={() =>
                          setCurrentPage(
                            Math.ceil(centers.length / itemsPerPage),
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
              </>
            )}
          </div>
        )}

        {/* 현장실습기관 리스트 */}
        {mode === "현장실습기관" && (
          <div className={styles.centerListSection}>
            {loading ? (
              <div>불러오는 중...</div>
            ) : institutions.length === 0 ? (
              <div>
                {searchMode === "location" && !locationState.coords
                  ? "위치를 설정하면 가까운 실습기관을 찾아드립니다."
                  : "검색 결과가 없습니다."}
              </div>
            ) : (
              <>
                <ul className={styles.centerListContainer}>
                  {institutions
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage,
                    )
                    .map((inst) => (
                      <li key={inst.id} className={styles.centerList}>
                        {/* 상단 한 줄: 이름/기관유형/거리 */}
                        <div className={styles.centerNameRow}>
                          <span>{inst.name}</span>
                          <span className={styles.centerTypeBadge}>
                            {inst.institution_type || "기관"}
                          </span>
                          {searchMode === "location" &&
                            formatDistance(inst.distance) && (
                              <span className={mapStyles.distanceBadge}>
                                {formatDistance(inst.distance)}
                              </span>
                            )}
                        </div>
                        {/* 아래 정보: 한 줄씩 */}
                        <div className={styles.centerInfoRow}>
                          <span className={styles.centerLabel}>연락처</span>
                          {inst.contact ? (
                            <a
                              href={`tel:${inst.contact}`}
                              className={styles.centerValue}
                              style={{
                                color: "inherit",
                                textDecoration: "none",
                                cursor: "pointer",
                              }}
                            >
                              {inst.contact}
                            </a>
                          ) : (
                            <span className={styles.centerValue}>-</span>
                          )}
                        </div>
                        <div className={styles.centerInfoRow}>
                          <span className={styles.centerLabel}>주소</span>
                          <span className={styles.centerValue}>
                            {inst.full_address || "-"}
                          </span>
                        </div>
                        <div className={styles.centerInfoRow}>
                          <span className={styles.centerLabel}>
                            선정유효기간
                          </span>
                          <span className={styles.centerValue}>
                            {inst.selection_period || "-"}
                          </span>
                        </div>
                        <div className={styles.centerInfoRow}>
                          <span className={styles.centerLabel}>실습비</span>
                          <span className={styles.centerValue}>
                            {inst.cost
                              ? `${inst.cost.toLocaleString()}원`
                              : "-"}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
                {/* 페이지네이션 */}
                {institutions.length > itemsPerPage && (
                  <div className={styles.pagination}>
                    {currentPage > 1 && (
                      <button
                        className={styles.pageButton}
                        onClick={() => setCurrentPage(currentPage - 1)}
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
                      const totalPages = Math.ceil(
                        institutions.length / itemsPerPage,
                      );
                      const maxVisible = 4;
                      let startPage = Math.max(
                        1,
                        currentPage - Math.floor(maxVisible / 2),
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
                            page === currentPage
                              ? styles.pageButtonActive
                              : styles.pageButton
                          }
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                    {currentPage <
                      Math.ceil(institutions.length / itemsPerPage) && (
                      <button
                        className={styles.pageButton}
                        onClick={() => setCurrentPage(currentPage + 1)}
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
                    {currentPage <
                      Math.ceil(institutions.length / itemsPerPage) && (
                      <button
                        className={styles.pageButton}
                        onClick={() =>
                          setCurrentPage(
                            Math.ceil(institutions.length / itemsPerPage),
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
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}
