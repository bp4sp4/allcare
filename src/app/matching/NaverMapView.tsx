"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./navermap.module.css";
import type { LatLng } from "@/types/map";

interface MapItem {
  id: number;
  name: string;
  address: string;
  contact: string | null;
  distance?: number;
  latitude: number;
  longitude: number;
}

interface NaverMapViewProps {
  userLocation: LatLng;
  items: MapItem[];
}

export default function NaverMapView({
  userLocation,
  items,
}: NaverMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null);
  const isDestroyedRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // naver.maps 사용 가능 여부 확인
  const isNaverReady = () =>
    typeof window !== "undefined" &&
    typeof naver !== "undefined" &&
    naver.maps != null;

  // 네이버 지도 스크립트 로드
  const loadNaverMapScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (isNaverReady()) {
        resolve();
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
      if (!clientId) {
        console.error(
          "[NaverMap] NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다.",
        );
        reject(new Error("Client ID 없음"));
        return;
      }

      const waitForNaver = () => {
        // 스크립트 로드 후 naver.maps가 실제로 준비될 때까지 대기
        const check = () => {
          if (isNaverReady()) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      };

      // 이미 스크립트가 로딩 중인지 확인
      const existingScript = document.querySelector(
        'script[src*="oapi.map.naver.com"]',
      );
      if (existingScript) {
        waitForNaver();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
      script.async = true;
      script.onload = () => waitForNaver();
      script.onerror = () => reject(new Error("스크립트 로드 실패"));
      document.head.appendChild(script);
    });
  }, []);

  // 스크립트 로드 후 초기화
  useEffect(() => {
    let cancelled = false;
    loadNaverMapScript()
      .then(() => {
        if (!cancelled) setIsLoaded(true);
      })
      .catch((err) => {
        console.error("[NaverMap]", err);
      });
    return () => {
      cancelled = true;
    };
  }, [loadNaverMapScript]);

  // 지도 초기화 & 마커 업데이트
  useEffect(() => {
    if (
      !isLoaded ||
      !mapRef.current ||
      isDestroyedRef.current ||
      typeof naver === "undefined" ||
      !naver.maps
    )
      return;

    const center = new naver.maps.LatLng(
      userLocation.latitude,
      userLocation.longitude,
    );

    // 지도 생성 (한 번만)
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new naver.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
        zoomControlOptions: {
          position: naver.maps.Position.TOP_RIGHT,
        },
        mapTypeControl: false,
        scaleControl: false,
      });
    } else {
      mapInstanceRef.current.setCenter(center);
    }

    const map = mapInstanceRef.current;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => {
      try {
        marker.setMap(null);
      } catch {
        // 이미 제거된 마커 무시
      }
    });
    markersRef.current = [];

    // 기존 InfoWindow 닫기
    if (infoWindowRef.current) {
      try {
        infoWindowRef.current.close();
      } catch {
        // 이미 닫힌 경우 무시
      }
    }

    // InfoWindow 생성 (재사용)
    const infoWindow = new naver.maps.InfoWindow({
      maxWidth: 260,
      borderWidth: 0,
      disableAnchor: false,
      backgroundColor: "#fff",
    });
    infoWindowRef.current = infoWindow;

    // 사용자 위치 마커 (파란색)
    const userMarker = new naver.maps.Marker({
      position: center,
      map,
      title: "내 위치",
      icon: {
        content: `<div style="width:16px;height:16px;border-radius:50%;background:#0051FF;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        anchor: new naver.maps.Point(8, 8),
      },
      zIndex: 100,
    });
    markersRef.current.push(userMarker);

    // bounds 계산용
    const bounds = new naver.maps.LatLngBounds(center, center);

    // 기관/교육원 마커들
    items.forEach((item) => {
      const position = new naver.maps.LatLng(item.latitude, item.longitude);
      bounds.extend(position);

      const marker = new naver.maps.Marker({
        position,
        map,
        title: item.name,
      });

      // 마커 클릭 → InfoWindow
      naver.maps.Event.addListener(marker, "click", () => {
        const distText =
          item.distance !== undefined
            ? item.distance < 1
              ? `${Math.round(item.distance * 1000)}m`
              : `${item.distance.toFixed(1)}km`
            : "";

        const contactHtml = item.contact
          ? `<a href="tel:${item.contact}" style="color:#0051FF;text-decoration:none;font-weight:600;">${item.contact}</a>`
          : "";

        infoWindow.setContent(`
          <div style="padding:12px;font-family:Pretendard,sans-serif;min-width:180px;">
            <div style="font-size:15px;font-weight:700;color:#010101;margin-bottom:6px;">${item.name}</div>
            ${distText ? `<div style="display:inline-block;padding:2px 8px;border-radius:999px;background:#0051FF;color:#fff;font-size:12px;font-weight:700;margin-bottom:6px;">${distText}</div>` : ""}
            <div style="font-size:13px;color:#3D3D3D;margin-bottom:4px;">${item.address || ""}</div>
            ${contactHtml ? `<div style="font-size:13px;margin-top:4px;">${contactHtml}</div>` : ""}
          </div>
        `);
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // 마커가 있으면 bounds로 자동 조절
    if (items.length > 0) {
      map.fitBounds(bounds, 60);
    }

    // cleanup: 마커만 제거 (지도는 유지)
    return () => {
      markersRef.current.forEach((marker) => {
        try {
          marker.setMap(null);
        } catch {
          // 무시
        }
      });
      markersRef.current = [];

      if (infoWindowRef.current) {
        try {
          infoWindowRef.current.close();
        } catch {
          // 무시
        }
        infoWindowRef.current = null;
      }
    };
  }, [isLoaded, userLocation, items]);

  // 컴포넌트 언마운트 시 지도 파괴
  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;

      // 마커 정리
      markersRef.current.forEach((marker) => {
        try {
          marker.setMap(null);
        } catch {
          // 무시
        }
      });
      markersRef.current = [];
      infoWindowRef.current = null;

      // 지도 파괴
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch {
          // 이미 파괴된 경우 무시
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (!isLoaded) {
    return <div className={styles.mapLoading}>지도 로딩 중...</div>;
  }

  return <div ref={mapRef} className={styles.mapContainer} />;
}
