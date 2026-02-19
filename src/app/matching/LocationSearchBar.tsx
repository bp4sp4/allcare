"use client";
import { useState } from "react";
import styles from "./navermap.module.css";
import type { UserLocationState } from "@/types/map";

interface LocationSearchBarProps {
  locationState: UserLocationState;
  onDetectGPS: () => void;
  onGeocodeAddress: (address: string) => void;
  onClear: () => void;
}

export default function LocationSearchBar({
  locationState,
  onDetectGPS,
  onGeocodeAddress,
  onClear,
}: LocationSearchBarProps) {
  const [addressInput, setAddressInput] = useState("");

  const handleSearch = () => {
    if (addressInput.trim()) {
      onGeocodeAddress(addressInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className={styles.locationBar}>
      {/* GPS 버튼 + 주소 입력 */}
      <div className={styles.locationButtons}>
        <button
          type="button"
          className={
            locationState.source === "gps"
              ? styles.gpsButtonActive
              : styles.gpsButton
          }
          onClick={onDetectGPS}
          disabled={locationState.isLoading}
        >
          <svg
            className={styles.gpsIcon}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8ZM20.94 11C20.48 6.83 17.17 3.52 13 3.06V1H11V3.06C6.83 3.52 3.52 6.83 3.06 11H1V13H3.06C3.52 17.17 6.83 20.48 11 20.94V23H13V20.94C17.17 20.48 20.48 17.17 20.94 13H23V11H20.94ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19Z"
              fill="currentColor"
            />
          </svg>
          내 위치
        </button>
        <div className={styles.addressInputWrapper}>
          <input
            type="text"
            className={styles.addressInput}
            placeholder="주소 입력 (예: 서울시 강남구)"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={locationState.isLoading}
          />
          <button
            type="button"
            className={styles.addressSearchButton}
            onClick={handleSearch}
            disabled={locationState.isLoading || !addressInput.trim()}
          >
            검색
          </button>
        </div>
      </div>

      {/* 로딩 상태 */}
      {locationState.isLoading && (
        <div className={styles.locationLoading}>
          <span className={styles.spinner} />
          위치를 찾고 있습니다...
        </div>
      )}

      {/* 에러 표시 */}
      {locationState.error && (
        <div className={styles.locationError}>{locationState.error}</div>
      )}

      {/* 현재 위치 표시 */}
      {locationState.coords && !locationState.isLoading && (
        <div className={styles.locationStatus}>
          <svg
            className={styles.locationStatusIcon}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"
              fill="currentColor"
            />
          </svg>
          <span className={styles.locationStatusText}>
            {locationState.source === "gps"
              ? "현재 위치 사용 중"
              : locationState.addressText}
          </span>
          <button
            type="button"
            className={styles.locationClear}
            onClick={onClear}
            title="위치 초기화"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
