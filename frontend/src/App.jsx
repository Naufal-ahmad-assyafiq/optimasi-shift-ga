import { useMemo, useState, useEffect } from "react";
import ShiftCard from "./components/ShiftCard";
import { exportColoredExcel } from "./utils/excelExport";

const SHIFTS = ["Pagi", "Siang", "Malam"];
const WEEKDAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// index: 0 Senin ... 5 Sabtu 6 Minggu
const SAT = 5;
const SUN = 6;

export default function App() {
  const [days, setDays] = useState(7);
  const [employeesText, setEmployeesText] = useState("A,B,C,D,E,F,G,H,I,J");
  const [demand, setDemand] = useState({ Pagi: 3, Siang: 3, Malam: 2 });

  const [shiftTimes, setShiftTimes] = useState({
    Pagi: { start: "08:00", end: "15:00" },
    Siang: { start: "15:00", end: "22:00" },
    Malam: { start: "22:00", end: "06:00" },
  });

  /**
   * ✅ Libur Pabrik (Company Closed Days)
   * - 2 hari/minggu => Sabtu + Minggu (tutup)
   * - 1 hari/minggu => pilih Sabtu ATAU Minggu (tutup)
   */
  const [factoryOffPerWeek, setFactoryOffPerWeek] = useState(2); // 1 atau 2
  const [factoryOffOneDay, setFactoryOffOneDay] = useState(SAT); // kalau 1 hari, default Sabtu
  const [offDays, setOffDays] = useState([SAT, SUN]); // otomatis sesuai pilihan

  // ⚠️ Catatan: di serverless Vercel, ini bisa berat.
  // Kalau sering timeout, turunin jadi Pop 80, Gen 250.
  const [populationSize, setPopulationSize] = useState(120);
  const [generations, setGenerations] = useState(500);
  const [mutationRate, setMutationRate] = useState(0.25);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Update offDays otomatis ketika user ubah libur pabrik
  useEffect(() => {
    if (factoryOffPerWeek === 2) setOffDays([SAT, SUN]);
    else setOffDays([factoryOffOneDay]);
  }, [factoryOffPerWeek, factoryOffOneDay]);

  const employees = useMemo(() => {
    return employeesText
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }, [employeesText]);

  const shiftTimeText = (shiftName) =>
    `${shiftTimes[shiftName]?.start ?? "--:--"} – ${shiftTimes[shiftName]?.end ?? "--:--"}`;

  const dayLabel = (dayIndex) => `${WEEKDAYS[dayIndex % 7]} (Hari ${dayIndex + 1})`;

  async function optimize() {
    setLoading(true);
    setSelectedEmp(null);

    try {
      // ✅ Panggil serverless API Vercel (same domain)
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          shifts: SHIFTS,
          employees,
          demand,
          shiftTimes,
          rules: {
            factoryOffPerWeek, // info (opsional)
            offDays,
            closeOnOffDays: true, // ✅ tutup pabrik pada offDays

            // aturan lain
            forbidDoubleShiftPerDay: true,
            forbidNightToMorning: true,
            maxShiftsPerWeek: 5,
            maxNightPerWeek: 2,
          },
          ga: { populationSize, generations, mutationRate },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.error || `Request gagal (HTTP ${res.status})`;
        alert(msg);
        return;
      }

      setResult(data);
    } catch (err) {
      alert(`API error: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  const grid = result?.bestGrid;

  const inputStyle = {
    width: 90,
    padding: "6px 8px",
    borderRadius: 10,
    border: "1px solid #2a2a2a",
    background: "#111",
    color: "#eaeaea",
  };

  return (
    <div style={{ maxWidth: 1250, margin: "0 auto", padding: 20, fontFamily: "system-ui", color: "#eaeaea" }}>
      <h2 style={{ marginBottom: 6 }}>Optimasi Shift Karyawan (Genetic Algorithm)</h2>

      <div
        style={{
          border: "1px solid #222",
          background: "#0b0b0b",
          borderRadius: 16,
          padding: 16,
          display: "grid",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Baris Atas */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Durasi:
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ ...inputStyle, width: 150, marginLeft: 8 }}
            >
              <option value={7}>7 hari</option>
              <option value={14}>14 hari</option>
              <option value={28}>28 hari</option>
              <option value={30}>30 hari</option>
              <option value={31}>31 hari</option>
            </select>
          </label>

          <label>
            Libur pabrik/minggu:
            <select
              value={factoryOffPerWeek}
              onChange={(e) => setFactoryOffPerWeek(Number(e.target.value))}
              style={{ ...inputStyle, width: 140, marginLeft: 8 }}
            >
              <option value={1}>1 hari</option>
              <option value={2}>2 hari</option>
            </select>
          </label>

          {factoryOffPerWeek === 1 ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <b>Hari tutup:</b>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="factory-off"
                  checked={factoryOffOneDay === SAT}
                  onChange={() => setFactoryOffOneDay(SAT)}
                />
                Sabtu
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="factory-off"
                  checked={factoryOffOneDay === SUN}
                  onChange={() => setFactoryOffOneDay(SUN)}
                />
                Minggu
              </label>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <b>Hari tutup:</b>
              <span style={{ opacity: 0.85 }}>Sabtu & Minggu</span>
            </div>
          )}
        </div>

        {/* Karyawan */}
        <div>
          <div>Daftar karyawan (pisahkan koma):</div>
          <textarea
            rows={3}
            value={employeesText}
            onChange={(e) => setEmployeesText(e.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 12,
              border: "1px solid #2a2a2a",
              background: "#111",
              color: "#eaeaea",
            }}
          />
        </div>

        {/* Shift */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {SHIFTS.map((shift) => (
            <div
              key={shift}
              style={{
                border: "1px solid #222",
                borderRadius: 14,
                padding: 12,
                background: "#0f0f0f",
                minWidth: 320,
              }}
            >
              <b>{shift}</b>

              <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <label>
                  Need:
                  <input
                    type="number"
                    min={0}
                    value={demand[shift]}
                    onChange={(e) => setDemand({ ...demand, [shift]: Number(e.target.value) })}
                    style={{ ...inputStyle, marginLeft: 8 }}
                  />
                </label>

                <label>
                  Mulai:
                  <input
                    type="time"
                    value={shiftTimes[shift].start}
                    onChange={(e) =>
                      setShiftTimes((p) => ({ ...p, [shift]: { ...p[shift], start: e.target.value } }))
                    }
                    style={{ ...inputStyle, width: 130, marginLeft: 8 }}
                  />
                </label>

                <label>
                  Selesai:
                  <input
                    type="time"
                    value={shiftTimes[shift].end}
                    onChange={(e) =>
                      setShiftTimes((p) => ({ ...p, [shift]: { ...p[shift], end: e.target.value } }))
                    }
                    style={{ ...inputStyle, width: 130, marginLeft: 8 }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* GA + tombol */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Pop:
            <input
              type="number"
              min={20}
              value={populationSize}
              onChange={(e) => setPopulationSize(Number(e.target.value))}
              style={{ ...inputStyle, marginLeft: 8 }}
            />
          </label>

          <label>
            Gen:
            <input
              type="number"
              min={50}
              value={generations}
              onChange={(e) => setGenerations(Number(e.target.value))}
              style={{ ...inputStyle, marginLeft: 8 }}
            />
          </label>

          <label>
            Mut:
            <input
              type="number"
              step="0.05"
              min={0}
              max={1}
              value={mutationRate}
              onChange={(e) => setMutationRate(Number(e.target.value))}
              style={{ ...inputStyle, marginLeft: 8 }}
            />
          </label>

          <button
            onClick={optimize}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #2a2a2a",
              background: "#111",
              color: "#eaeaea",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            {loading ? "Optimizing..." : "Optimize"}
          </button>

          <button
            onClick={() =>
              exportColoredExcel({
                grid,
                days,
                employees,
                shiftTimes,
                offDays,
                factoryOffPerWeek,
              })
            }
            disabled={!grid}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #2a2a2a",
              background: "#111",
              color: !grid ? "#777" : "#eaeaea",
              cursor: !grid ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            Export Excel (Berwarna)
          </button>
        </div>
      </div>

      {/* Hasil */}
      {result ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #222", background: "#0b0b0b" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Fitness</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{Number(result.bestFitness).toFixed(6)}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #222", background: "#0b0b0b" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Penalty</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{Number(result.bestPenalty).toFixed(2)}</div>
          </div>
        </div>
      ) : null}

      {/* Jadwal */}
      <h3 style={{ marginBottom: 10 }}>Jadwal per Hari</h3>
      {!grid ? (
        <div style={{ opacity: 0.75 }}>
          Klik <b>Optimize</b> untuk membuat jadwal.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {Array.from({ length: days }, (_, dIdx) => (
            <div
              key={dIdx}
              style={{
                border: "1px solid #222",
                background: "#0b0b0b",
                borderRadius: 16,
                padding: 14,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{dayLabel(dIdx)}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {offDays.includes(dIdx % 7) ? "Tutup (Libur Pabrik)" : "Buka"}
                </div>
              </div>

              {SHIFTS.map((shiftName, sIdx) => (
                <ShiftCard
                  key={shiftName}
                  shiftName={shiftName}
                  timeText={shiftTimeText(shiftName)}
                  names={grid[dIdx]?.[sIdx] ?? []}
                  selectedEmp={selectedEmp}
                  onSelect={setSelectedEmp}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
