"use client";
import { useState } from "react";
import styles from "./matching.module.css";
import REGIONS from "./region";

const LAWS = [
  { label: "구법/신법", value: "" },
  { label: "신법", value: "신법" },
  { label: "구법+신법", value: "구법+신법" },
];

export default function FilterBar({
  mode,
  onChange,
  region,
  subregion,
  law,
}: {
  mode: "교육원" | "현장실습기관";
  onChange: (filters: { region: string; subregion: string; law: string }) => void;
  region: string;
  subregion: string;
  law: string;
}) {
  const [selectedRegion, setSelectedRegion] = useState(region || "");
  const [selectedSubregion, setSelectedSubregion] = useState(subregion || "");
  const [selectedLaw, setSelectedLaw] = useState(law || "");

  const regionList = Object.keys(REGIONS);
  const subregionList = selectedRegion ? REGIONS[selectedRegion] : [];

  const handleRegion = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value);
    setSelectedSubregion("");
    onChange({ region: e.target.value, subregion: "", law: selectedLaw });
  };
  const handleSubregion = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubregion(e.target.value);
    onChange({ region: selectedRegion, subregion: e.target.value, law: selectedLaw });
  };
  const handleLaw = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLaw(e.target.value);
    onChange({ region: selectedRegion, subregion: selectedSubregion, law: e.target.value });
  };

  return (
    <div className={styles.filterBarWrapper}>
      <select className={styles.filterSelect} value={selectedRegion} onChange={handleRegion}>
        <option value="">시/도</option>
        {regionList.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select className={styles.filterSelect} value={selectedSubregion} onChange={handleSubregion} disabled={!selectedRegion}>
        <option value="">시/군/구</option>
        {subregionList.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {mode === "교육원" && (
        <select className={styles.filterSelect} value={selectedLaw} onChange={handleLaw}>
          {LAWS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
