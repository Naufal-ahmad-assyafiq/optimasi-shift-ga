export default function NamePill({ name, selectedEmp, onSelect }) {
  const selected = selectedEmp === name;
  return (
    <button
      onClick={() => onSelect(selected ? null : name)}
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #2a2a2a",
        background: selected ? "#fff7d6" : "#0f0f0f",
        color: selected ? "#111" : "#eaeaea",
        cursor: "pointer",
        fontSize: 13,
      }}
      title="Klik untuk highlight"
    >
      {name}
    </button>
  );
}
