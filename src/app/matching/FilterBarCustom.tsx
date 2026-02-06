import CustomDropdown from "./CustomDropdown";
import REGIONS from "./region";

const LAWS = [
  { label: "구법/신법", value: "" },
  
  { label: "신법", value: "신법" },
  { label: "구법+신법", value: "구법+신법" },
];

export default function FilterBarCustom({
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
  const regionList = Object.keys(REGIONS);
  const subregionList = region ? REGIONS[region] : [];

  return (
    <div style={{ display: "flex", gap: 6, width: mode === '교육원' ? 328 : "100%" }}>
      <CustomDropdown
        options={regionList}
        value={region}
        placeholder="시/도"
        onChange={(v) => onChange({ region: v, subregion: "", law })}
      />
      <CustomDropdown
        options={subregionList}
        value={subregion}
        placeholder="시/군/구"
        onChange={(v) => onChange({ region, subregion: v, law })}
      />
      {mode === '교육원' && (
        <CustomDropdown
          options={LAWS.map((l) => l.label)}
          value={law}
          placeholder="구법/신법"
          onChange={(v) => onChange({ region, subregion, law: v === "구법/신법" ? "" : v })}
        />
      )}
    </div>
  );
}
