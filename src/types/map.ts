// 좌표 쌍
export interface LatLng {
  latitude: number;
  longitude: number;
}

// 교육원 (좌표 포함)
export interface TrainingCenterWithCoords {
  id: number;
  institute_name: string;
  category: string | null;
  province: string | null;
  region: string | null;
  available_region: string | null;
  contact: string | null;
  law_type: string | null;
  address: string | null;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number; // 클라이언트에서 계산, km 단위
}

// 현장실습기관 (좌표 포함)
export interface TrainingInstitutionWithCoords {
  id: number;
  name: string;
  institution_type: string | null;
  full_address: string | null;
  contact: string | null;
  selection_period: string | null;
  cost: number | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number; // 클라이언트에서 계산, km 단위
}

// Geocoding API 응답
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  roadAddress?: string;
  jibunAddress?: string;
}

// 사용자 위치 상태
export interface UserLocationState {
  coords: LatLng | null;
  addressText: string;
  isLoading: boolean;
  error: string | null;
  source: "gps" | "manual" | null;
}
