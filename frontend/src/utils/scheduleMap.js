export function buildEmployeeDayMap({ grid, days, employees }) {
  const map = Object.fromEntries(
    employees.map((e) => [e, Array.from({ length: days }, () => "L")])
  );

  for (let d = 0; d < days; d++) {
    const [pagi = [], siang = [], malam = []] = grid[d] ?? [];
    for (const e of pagi) map[e][d] = "P";
    for (const e of siang) map[e][d] = "S";
    for (const e of malam) map[e][d] = "M";
  }

  return map;
}
