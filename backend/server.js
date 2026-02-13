const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// Closed day helpers (Libur Pabrik)
// =====================
// dayIndex: 0..days-1
// offDays: array of weekday index [0..6] (0 Senin .. 6 Minggu)
function isClosedDay(dayIndex, offDays, closeOnOffDays) {
  if (!closeOnOffDays) return false;
  const dow = dayIndex % 7;
  return Array.isArray(offDays) && offDays.includes(dow);
}

function applyClosedDaysToGrid(grid, days, shiftsLen, offDays, closeOnOffDays) {
  if (!closeOnOffDays) return grid;
  for (let d = 0; d < days; d++) {
    if (isClosedDay(d, offDays, closeOnOffDays)) {
      for (let s = 0; s < shiftsLen; s++) grid[d][s] = [];
    }
  }
  return grid;
}

// ====== GA helper ======
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sampleUnique(arr, k) {
  return shuffle(arr).slice(0, k);
}

// =====================
// Schedule generation
// =====================
function createRandomSchedule({ days, shifts, employees, demand, rules }) {
  const offDays = rules?.offDays ?? [];
  const closeOnOffDays = rules?.closeOnOffDays ?? false;

  const grid = Array.from({ length: days }, () =>
    Array.from({ length: shifts.length }, () => [])
  );

  for (let d = 0; d < days; d++) {
    // HARD CONSTRAINT: hari libur pabrik => kosong
    if (isClosedDay(d, offDays, closeOnOffDays)) {
      for (let s = 0; s < shifts.length; s++) grid[d][s] = [];
      continue;
    }

    let available = [...employees];

    for (let s = 0; s < shifts.length; s++) {
      const need = demand[shifts[s]] ?? 0;
      if (need <= 0) continue;

      if (available.length >= need) {
        const chosen = sampleUnique(available, need);
        grid[d][s] = chosen;
        available = available.filter((x) => !chosen.includes(x));
      } else {
        // kalau kurang, ambil random (akan kena penalti demand shortage di evaluasi)
        grid[d][s] = sampleUnique(employees, Math.min(need, employees.length));
      }
    }
  }

  applyClosedDaysToGrid(grid, days, shifts.length, offDays, closeOnOffDays);
  return grid;
}

// =====================
// Evaluation
// =====================
function evaluateSchedule({ grid, days, shifts, employees, demand, rules }) {
  let penalty = 0;

  const maxShiftsPerWeek = rules?.maxShiftsPerWeek ?? 5;
  const maxNightPerWeek = rules?.maxNightPerWeek ?? 2;

  const offDays = rules?.offDays ?? [];
  const closeOnOffDays = rules?.closeOnOffDays ?? false;

  const forbidNightToMorning = rules?.forbidNightToMorning ?? true;
  const forbidDoubleShiftPerDay = rules?.forbidDoubleShiftPerDay ?? true;

  // HARD CONSTRAINT: hari libur pabrik harus kosong
  applyClosedDaysToGrid(grid, days, shifts.length, offDays, closeOnOffDays);

  const shiftIndex = Object.fromEntries(shifts.map((n, i) => [n, i]));
  const nightIdx = shiftIndex["Malam"];
  const morningIdx = shiftIndex["Pagi"];

  // stats total (untuk fairness)
  const totalShifts = Object.fromEntries(employees.map((e) => [e, 0]));
  const nightShifts = Object.fromEntries(employees.map((e) => [e, 0]));

  // counts per week for constraints
  // weekIndex = Math.floor(d/7)
  const totalByWeek = Object.fromEntries(employees.map((e) => [e, []]));
  const nightByWeek = Object.fromEntries(employees.map((e) => [e, []]));

  for (let d = 0; d < days; d++) {
    // perusahaan tutup => demand tidak dihitung
    if (isClosedDay(d, offDays, closeOnOffDays)) continue;

    const week = Math.floor(d / 7);

    // demand fulfillment + count
    for (let s = 0; s < shifts.length; s++) {
      const need = demand[shifts[s]] ?? 0;
      const assignedCount = grid[d][s].length;

      // demand penalty
      if (assignedCount < need) penalty += (need - assignedCount) * 10;
      if (assignedCount > need) penalty += (assignedCount - need) * 2;

      for (const emp of grid[d][s]) {
        totalShifts[emp] = (totalShifts[emp] ?? 0) + 1;

        if (!Array.isArray(totalByWeek[emp][week])) totalByWeek[emp][week] = 0;
        totalByWeek[emp][week] += 1;

        if (shifts[s] === "Malam") {
          nightShifts[emp] = (nightShifts[emp] ?? 0) + 1;
          if (!Array.isArray(nightByWeek[emp][week])) nightByWeek[emp][week] = 0;
          nightByWeek[emp][week] += 1;
        }
      }
    }

    // double shift/day
    if (forbidDoubleShiftPerDay) {
      for (const emp of employees) {
        let c = 0;
        for (let s = 0; s < shifts.length; s++) {
          if (grid[d][s].includes(emp)) c++;
        }
        if (c > 1) penalty += (c - 1) * 50;
      }
    }

    // night -> morning
    if (
      forbidNightToMorning &&
      d < days - 1 &&
      nightIdx != null &&
      morningIdx != null &&
      !isClosedDay(d + 1, offDays, closeOnOffDays)
    ) {
      for (const emp of employees) {
        const workedNight = grid[d][nightIdx].includes(emp);
        const workedMorningNext = grid[d + 1][morningIdx].includes(emp);
        if (workedNight && workedMorningNext) penalty += 30;
      }
    }
  }

  // weekly limits (per minggu)
  const weeks = Math.ceil(days / 7);
  for (const emp of employees) {
    for (let w = 0; w < weeks; w++) {
      const t = Number(totalByWeek[emp][w] ?? 0);
      const n = Number(nightByWeek[emp][w] ?? 0);

      if (t > maxShiftsPerWeek) penalty += (t - maxShiftsPerWeek) * 15;
      if (n > maxNightPerWeek) penalty += (n - maxNightPerWeek) * 15;
    }
  }

  // fairness (variance total shifts)
  const totals = employees.map((e) => Number(totalShifts[e] ?? 0));
  const avg = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
  const variance = totals.reduce((acc, x) => acc + (x - avg) ** 2, 0) / (totals.length || 1);
  penalty += variance * 1.5;

  const fitness = 1 / (1 + penalty);
  return { fitness, penalty, stats: { totalShifts, nightShifts, variance } };
}

// =====================
// GA operators
// =====================
function crossover(parentA, parentB) {
  const days = parentA.length;
  const cut = randInt(1, days - 1);
  const child = [];
  for (let d = 0; d < days; d++) child.push(d < cut ? parentA[d] : parentB[d]);
  return child.map((day) => day.map((cell) => [...cell]));
}

function mutate(grid, { days, shifts, employees, demand, rules }, mutationRate = 0.25) {
  const offDays = rules?.offDays ?? [];
  const closeOnOffDays = rules?.closeOnOffDays ?? false;

  const g = grid.map((day) => day.map((cell) => [...cell]));
  if (Math.random() > mutationRate) {
    applyClosedDaysToGrid(g, days, shifts.length, offDays, closeOnOffDays);
    return g;
  }

  // pilih hari yang TIDAK tutup
  let d = randInt(0, days - 1);
  let tries = 0;
  while (tries < 30 && isClosedDay(d, offDays, closeOnOffDays)) {
    d = randInt(0, days - 1);
    tries++;
  }
  if (isClosedDay(d, offDays, closeOnOffDays)) {
    applyClosedDaysToGrid(g, days, shifts.length, offDays, closeOnOffDays);
    return g;
  }

  const s = randInt(0, shifts.length - 1);
  const need = demand[shifts[s]] ?? 0;
  if (need <= 0) {
    applyClosedDaysToGrid(g, days, shifts.length, offDays, closeOnOffDays);
    return g;
  }

  // hindari double shift: pilih dari karyawan yang belum terpakai di hari itu
  const dayAssigned = new Set();
  for (let ss = 0; ss < shifts.length; ss++) {
    if (ss === s) continue;
    for (const e of g[d][ss]) dayAssigned.add(e);
  }

  const available = employees.filter((e) => !dayAssigned.has(e));
  const pool = available.length >= need ? available : employees;

  g[d][s] = sampleUnique(pool, Math.min(need, pool.length));

  applyClosedDaysToGrid(g, days, shifts.length, offDays, closeOnOffDays);
  return g;
}

// =====================
// Run GA
// =====================
function runGA({ days, shifts, employees, demand, rules, ga }) {
  const populationSize = ga?.populationSize ?? 120;
  const generations = ga?.generations ?? 500;
  const elitism = ga?.elitism ?? 6;
  const mutationRate = ga?.mutationRate ?? 0.25;
  const tournamentSize = ga?.tournamentSize ?? 4;

  let population = Array.from({ length: populationSize }, () =>
    createRandomSchedule({ days, shifts, employees, demand, rules })
  );

  const history = [];
  let best = null;

  const evalOne = (grid) => evaluateSchedule({ grid, days, shifts, employees, demand, rules });

  function tournamentSelect(scored) {
    const contenders = sampleUnique(scored, Math.min(tournamentSize, scored.length));
    contenders.sort((a, b) => b.fitness - a.fitness);
    return contenders[0].grid;
  }

  for (let gen = 0; gen < generations; gen++) {
    const scored = population.map((grid) => ({ grid, ...evalOne(grid) }));
    scored.sort((a, b) => b.fitness - a.fitness);

    const genBest = scored[0];
    if (!best || genBest.fitness > best.fitness) best = genBest;

    history.push({ gen, bestFitness: genBest.fitness, bestPenalty: genBest.penalty });

    const next = [];
    for (let i = 0; i < Math.min(elitism, scored.length); i++) next.push(scored[i].grid);

    while (next.length < populationSize) {
      const pA = tournamentSelect(scored);
      const pB = tournamentSelect(scored);
      let child = crossover(pA, pB);
      child = mutate(child, { days, shifts, employees, demand, rules }, mutationRate);
      next.push(child);
    }
    population = next;
  }

  // pastikan output final libur pabrik kosong
  applyClosedDaysToGrid(
    best.grid,
    days,
    shifts.length,
    rules?.offDays ?? [],
    rules?.closeOnOffDays ?? false
  );

  return {
    bestGrid: best.grid,
    bestFitness: best.fitness,
    bestPenalty: best.penalty,
    bestStats: best.stats,
    history,
  };
}

// ====== API ======
app.post("/api/optimize", (req, res) => {
  try {
    const body = req.body;

    const days = body.days ?? 7;
    const shifts = body.shifts ?? ["Pagi", "Siang", "Malam"];
    const employees = body.employees ?? ["A", "B", "C", "D", "E", "F", "G", "H"];
    const demand = body.demand ?? { Pagi: 3, Siang: 3, Malam: 2 };
    const rules = body.rules ?? {};
    const ga = body.ga ?? {};
    const shiftTimes = body.shiftTimes ?? {};

    const result = runGA({ days, shifts, employees, demand, rules, ga });
    res.json({ ...result, shiftTimes });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
