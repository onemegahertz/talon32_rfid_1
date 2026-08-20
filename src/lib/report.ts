/* ============================================================
   ТАЛОН-32 · генератор отчётов: HTML и TXT
   ============================================================ */

import { LOCATIONS, RESULT_META, SLOT_BY_ID, fmtDateRu, type ReportRow } from "./core";

export interface ReportOptions {
  from: string;
  to: string;
  locFilter: 0 | 1 | 2;
  source: string;
}

interface Stats {
  ok: number;
  already: number;
  guests: number;
  byLoc: Record<number, number>;
  bySlot: Record<number, number>;
}

function calcStats(rows: ReportRow[]): Stats {
  const okRows = rows.filter((r) => r.result === "OK");
  const byLoc: Record<number, number> = { 1: 0, 2: 0 };
  const bySlot: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const r of okRows) {
    byLoc[r.loc]++;
    bySlot[r.slotId]++;
  }
  return {
    ok: okRows.length,
    already: rows.filter((r) => r.result !== "OK").length,
    guests: new Set(okRows.map((r) => r.guestId)).size,
    byLoc,
    bySlot,
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildHtmlReport(rows: ReportRow[], o: ReportOptions): string {
  const st = calcStats(rows);
  const now = new Date();
  const stamp = `${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  const locLabel = o.locFilter === 0 ? "Столовая + Ресторан" : LOCATIONS[o.locFilter as 1 | 2].ru;

  const trs = rows
    .map((r, i) => {
      const meta = RESULT_META[r.result];
      const cls = r.result === "OK" ? "" : ` class="bad"`;
      return `<tr${cls}>
        <td>${i + 1}</td>
        <td>${fmtDateRu(r.date)}</td>
        <td>${r.time}</td>
        <td>${esc(r.guest)}</td>
        <td class="mono">${r.guestId || "—"}</td>
        <td>${SLOT_BY_ID[r.slotId].ru}</td>
        <td>${LOCATIONS[r.loc].ru}</td>
        <td>${meta.label}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Отчёт по питанию · ${fmtDateRu(o.from)} — ${fmtDateRu(o.to)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #1b2a20; background: #f2f5ec; }
  .sheet { max-width: 1080px; margin: 0 auto; padding: 32px 24px 64px; }
  header { background: #122419; color: #e9efdc; padding: 28px 32px; border-left: 10px solid #d18a3e; }
  header h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: 0.04em; }
  header p { margin: 2px 0; color: #aacdb8; font-size: 14px; }
  header b { color: #e5a95f; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 22px 0; }
  .stat { background: #fff; border: 1px solid #d8e0c6; border-top: 3px solid #2e5c45; padding: 12px 14px; }
  .stat .v { font-size: 26px; font-weight: 700; color: #122419; }
  .stat .k { font-size: 12px; color: #55705e; text-transform: uppercase; letter-spacing: 0.06em; }
  .stat.warn { border-top-color: #c0392b; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d8e0c6; font-size: 13.5px; }
  th { background: #122419; color: #e5a95f; text-align: left; padding: 9px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 7px 10px; border-bottom: 1px solid #e4ead6; }
  tr:nth-child(even) td { background: #f6f8ee; }
  tr.bad td { color: #b03a2e; }
  .mono { font-family: Consolas, monospace; }
  footer { margin-top: 26px; font-size: 12px; color: #55705e; border-top: 1px solid #d8e0c6; padding-top: 12px; }
  @media print { body { background: #fff; } header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <h1>ОТЧЁТ ПО ПОСЕЩЕНИЮ ПИТАНИЯ</h1>
    <p>Система «ТАЛОН-32» · ESP32 + RC522 · <b>${esc(locLabel)}</b></p>
    <p>Период: <b>${fmtDateRu(o.from)} — ${fmtDateRu(o.to)}</b> · сформирован ${stamp} · источник: ${esc(o.source)}</p>
  </header>

  <div class="stats">
    <div class="stat"><div class="v">${st.ok}</div><div class="k">Посещений</div></div>
    <div class="stat"><div class="v">${st.guests}</div><div class="k">Уникальных гостей</div></div>
    <div class="stat"><div class="v">${st.byLoc[1]}</div><div class="k">Столовая</div></div>
    <div class="stat"><div class="v">${st.byLoc[2]}</div><div class="k">Ресторан</div></div>
    <div class="stat"><div class="v">${st.bySlot[1]} / ${st.bySlot[2]} / ${st.bySlot[3]}</div><div class="k">Завтрак / Обед / Ужин</div></div>
    <div class="stat warn"><div class="v">${st.already}</div><div class="k">Нарушений (повторных попыток)</div></div>
  </div>

  <table>
    <thead>
      <tr><th>№</th><th>Дата</th><th>Время</th><th>Гость</th><th>ID</th><th>Период</th><th>Место</th><th>Результат</th></tr>
    </thead>
    <tbody>
${trs}
    </tbody>
  </table>

  <footer>
    Правило системы: одно посещение на гостя в каждом периоде (завтрак 08:30–11:30, обед 13:30–15:30, ужин 18:00–20:00) —
    столовая или ресторан на выбор гостя. Повторные попытки прохода фиксируются как нарушения; обращения вне периода
    и карты без регистрации остаются в сыром журнале терминала (visits.csv).
  </footer>
</div>
</body>
</html>`;
}

export function buildTxtReport(rows: ReportRow[], o: ReportOptions): string {
  const st = calcStats(rows);
  const now = new Date();
  const stamp = `${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  const locLabel = o.locFilter === 0 ? "Столовая + Ресторан" : LOCATIONS[o.locFilter as 1 | 2].ru;
  const line = "=".repeat(96);
  const thin = "-".repeat(96);

  const body = rows
    .map((r, i) => {
      return (
        String(i + 1).padStart(4) + "  " +
        fmtDateRu(r.date).padEnd(11) +
        r.time.padEnd(7) +
        r.guest.padEnd(22) +
        String(r.guestId || "—").padEnd(7) +
        SLOT_BY_ID[r.slotId].ru.padEnd(10) +
        LOCATIONS[r.loc].ru.padEnd(11) +
        RESULT_META[r.result].label
      );
    })
    .join("\n");

  return `ТАЛОН-32 · ОТЧЁТ ПО ПОСЕЩЕНИЮ ПИТАНИЯ
${line}
Период      : ${fmtDateRu(o.from)} — ${fmtDateRu(o.to)}
Место       : ${locLabel}
Сформирован : ${stamp}
Источник    : ${o.source}
${line}
Посещений всего ......... ${st.ok}
Уникальных гостей ....... ${st.guests}
Столовая ................ ${st.byLoc[1]}
Ресторан ................ ${st.byLoc[2]}
Завтрак / Обед / Ужин ... ${st.bySlot[1]} / ${st.bySlot[2]} / ${st.bySlot[3]}
Нарушений (повторов) .... ${st.already}
${line}
  №   ДАТА       ВРЕМЯ  ГОСТЬ                 ID     ПЕРИОД    МЕСТО      РЕЗУЛЬТАТ
${thin}
${body}
${thin}
Правило: одно посещение на гостя в периоде (завтрак 08:30-11:30, обед 13:30-15:30,
ужин 18:00-20:00) — столовая или ресторан на выбор гостя.
`;
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
