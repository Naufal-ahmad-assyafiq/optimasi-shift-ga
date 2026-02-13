import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { buildEmployeeDayMap } from "./scheduleMap";

const WEEKDAYS = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];

// helper: offDays (0..6) -> teks
function offDaysLabel(offDays = []) {
  if (!Array.isArray(offDays) || offDays.length === 0) return "-";
  const names = offDays
    .slice()
    .sort((a, b) => a - b)
    .map((i) => WEEKDAYS[i] ?? `Hari-${i}`);
  return names.join(", ");
}

export async function exportColoredExcel({
  grid,
  days,
  employees,
  shiftTimes,
  offDays = [],          // ✅ NEW: hari tutup pabrik (weekday index)
  factoryOffPerWeek = 0, // ✅ optional info
}) {
  if (!grid || !employees?.length) return;

  // Map emp->hari: "P"/"S"/"M"/"L"
  // NOTE: buildEmployeeDayMap default L untuk tidak dijadwalkan,
  // dan karena pabrik tutup sudah dipaksa kosong di backend, weekend akan jadi L juga.
  const empDay = buildEmployeeDayMap({ grid, days, employees });

  // Warna cell (ARGB)
  const fills = {
    P: { type: "pattern", pattern: "solid", fgColor: { argb: "FF9DC3E6" } }, // biru
    S: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4B183" } }, // orange
    M: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC9B2E6" } }, // ungu
    L: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4CCCC" } }, // merah (libur / tutup)
    header: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } },
    legendHead: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } },
  };

  const thinBorder = {
    top: { style: "thin", color: { argb: "FF999999" } },
    left: { style: "thin", color: { argb: "FF999999" } },
    bottom: { style: "thin", color: { argb: "FF999999" } },
    right: { style: "thin", color: { argb: "FF999999" } },
  };

  const timeP = `${shiftTimes?.Pagi?.start ?? "--:--"}–${shiftTimes?.Pagi?.end ?? "--:--"}`;
  const timeS = `${shiftTimes?.Siang?.start ?? "--:--"}–${shiftTimes?.Siang?.end ?? "--:--"}`;
  const timeM = `${shiftTimes?.Malam?.start ?? "--:--"}–${shiftTimes?.Malam?.end ?? "--:--"}`;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jadwal");

  // kolom
  ws.getColumn(1).width = 18; // nama
  for (let c = 2; c <= 8; c++) ws.getColumn(c).width = 10; // Senin..Minggu
  ws.getColumn(11).width = 32; // keterangan

  const styleCell = (cell, { fill, bold, center, border } = {}) => {
    if (fill) cell.fill = fill;
    if (border) cell.border = border;
    if (bold) cell.font = { ...(cell.font || {}), bold: true };
    if (center) cell.alignment = { vertical: "middle", horizontal: "center" };
  };

  // =====================
  // Header
  // =====================
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "Jadwal Shift Karyawan";
  ws.getCell("A1").font = { bold: true, size: 14 };

  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Durasi: ${days} hari | Libur Pabrik/Minggu: ${factoryOffPerWeek} | Hari Tutup: ${offDaysLabel(offDays)}`;

  // =====================
  // Table per minggu
  // =====================
  let row = 4;
  const totalWeeks = Math.ceil(days / 7);

  for (let w = 0; w < totalWeeks; w++) {
    const startDay = w * 7;
    const endDay = Math.min(days - 1, startDay + 6);

    ws.mergeCells(row, 1, row, 8);
    ws.getCell(row, 1).value = `Minggu ${w + 1} (Hari ${startDay + 1} - ${endDay + 1})`;
    ws.getCell(row, 1).font = { bold: true };
    row++;

    // header baris
    ws.getCell(row, 1).value = "Nama Karyawan";
    styleCell(ws.getCell(row, 1), { fill: fills.header, bold: true, center: true, border: thinBorder });

    for (let d = 0; d < 7; d++) {
      const col = 2 + d;
      const realDay = startDay + d;

      ws.getCell(row, col).value = WEEKDAYS[d];
      styleCell(ws.getCell(row, col), { fill: fills.header, bold: true, center: true, border: thinBorder });

      if (realDay > endDay) ws.getCell(row, col).value = "";
    }
    row++;

    // isi karyawan
    for (const emp of employees) {
      ws.getCell(row, 1).value = emp;
      styleCell(ws.getCell(row, 1), { border: thinBorder });

      for (let d = 0; d < 7; d++) {
        const col = 2 + d;
        const realDay = startDay + d;

        if (realDay > endDay) {
          ws.getCell(row, col).value = "";
          styleCell(ws.getCell(row, col), { border: thinBorder, center: true });
          continue;
        }

        const code = empDay?.[emp]?.[realDay] ?? "L";
        ws.getCell(row, col).value = code;

        // safety: kalau ada kode aneh, treat as L
        const safeCode = ["P","S","M","L"].includes(code) ? code : "L";
        styleCell(ws.getCell(row, col), {
          fill: fills[safeCode],
          border: thinBorder,
          center: true,
          bold: true,
        });
      }
      row++;
    }

    row += 2;
  }

  // =====================
  // Legend
  // =====================
  const legendRow = 4;

  ws.getCell(legendRow, 11).value = "Keterangan";
  styleCell(ws.getCell(legendRow, 11), {
    fill: fills.legendHead,
    bold: true,
    center: true,
    border: thinBorder,
  });

  const legend = [
    ["P", "Pagi (biru)"],
    ["S", "Siang (orange)"],
    ["M", "Malam (ungu)"],
    ["L", "Libur / Tutup (merah)"],
  ];

  for (let i = 0; i < legend.length; i++) {
    const r = legendRow + 1 + i;
    ws.getCell(r, 11).value = `${legend[i][0]} = ${legend[i][1]}`;
    styleCell(ws.getCell(r, 11), { border: thinBorder });
  }

  // jam kerja shift
  const jamRow = legendRow + 7;
  ws.getCell(jamRow, 11).value = `Shift Pagi: ${timeP}`;
  ws.getCell(jamRow + 1, 11).value = `Shift Siang: ${timeS}`;
  ws.getCell(jamRow + 2, 11).value = `Shift Malam: ${timeM}`;
  ws.getCell(jamRow + 4, 11).value = `Hari Tutup Pabrik: ${offDaysLabel(offDays)}`;

  // =====================
  // Save
  // =====================
  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `jadwal-shift_berwarna_${days}hari.xlsx`
  );
}
