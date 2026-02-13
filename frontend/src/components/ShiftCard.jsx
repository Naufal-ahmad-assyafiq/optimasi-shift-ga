import NamePill from "./NamePill";

const SHIFT_STYLE = {
  Pagi: { border: "#60a5fa", bg: "#0b1220", pill: "#1e3a8a" },
  Siang: { border: "#f59e0b", bg: "#1a1406", pill: "#92400e" },
  Malam: { border: "#a78bfa", bg: "#140b1f", pill: "#4c1d95" },
};

export default function ShiftCard({ shiftName, timeText, names, selectedEmp, onSelect }) {
  const s = SHIFT_STYLE[shiftName];
  const hasSelected = selectedEmp && names.includes(selectedEmp);

  return (
    <div
      style={{
        border: `1px solid ${hasSelected ? "#fff7d6" : s.border}`,
        background: s.bg,
        borderRadius: 14,
        padding: 12,
        display: "grid",
        gap: 10,
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: 999,
              background: s.pill,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {shiftName}
          </span>
          <span style={{ opacity: 0.85, fontSize: 13 }}>{timeText}</span>
        </div>
        <span style={{ opacity: 0.7, fontSize: 12 }}>{names.length} orang</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {names.length === 0 ? (
          <span style={{ opacity: 0.6 }}>Belum terisi</span>
        ) : (
          names.map((n) => (
            <NamePill key={n} name={n} selectedEmp={selectedEmp} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}
