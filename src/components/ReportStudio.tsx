import { useEffect, useMemo, useRef, useState } from "react";
import {
  LOCATIONS,
  RESULT_META,
  SLOTS,
  SLOT_BY_ID,
  addDays,
  fmtDate,
  fmtDateRu,
  makeSampleData,
  parseCsv,
  type LocId,
  type ReportRow,
  type SlotId,
} from "../lib/core";
import { buildHtmlReport, buildTxtReport, downloadFile } from "../lib/report";
import { IconDoc, IconDownload } from "./ui";

type Source = "sample" | "sim" | "csv";

const TONE: Record<string, string> = {
  green: "border-ledgreen/50 text-ledgreen bg-ledgreen/10",
  red: "border-ledred/50 text-ledred bg-ledred/10",
  amber: "border-amberled/50 text-amberled bg-amberled/10",
  copper: "border-copper-400/50 text-copper-300 bg-copper-500/10",
  slate: "border-pine-500/60 text-pine-300 bg-pine-700/30",
};

const RESULT_CSV: Record<string, string> = {
  OK: "OK",
  ALREADY: "REJECT_ALREADY",
  TIME: "REJECT_TIME",
  NOREG: "REJECT_NOREG",
};

export default function ReportStudio({ simRows }: { simRows: ReportRow[] | null }) {
  const [source, setSource] = useState<Source>("sample");
  const [rows, setRows] = useState<ReportRow[]>(() => makeSampleData());
  const [from, setFrom] = useState(() => fmtDate(addDays(new Date(), -6)));
  const [to, setTo] = useState(() => fmtDate(new Date()));
  const [loc, setLoc] = useState<0 | LocId>(0);
  const [slotId, setSlotId] = useState<0 | SlotId>(0);
  const [res, setRes] = useState<"ALL" | "OK" | "BAD">("ALL");
  const [q, setQ] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvErr, setCsvErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const sourceLabel =
    source === "sample" ? "демо-данные за неделю" : source === "sim" ? "журнал симулятора" : "импортированный visits.csv";

  /* журнал, переданный из симулятора, подхватывается автоматически */
  useEffect(() => {
    if (simRows && simRows.length) {
      setRows(simRows);
      setSource("sim");
      setCsvErr("");
      setFrom(simRows[0].date);
      setTo(simRows[simRows.length - 1].date);
    }
  }, [simRows]);

  const pick = (s: Source) => {
    setSource(s);
    setCsvErr("");
    if (s === "sample") setRows(makeSampleData());
    if (s === "sim" && simRows) setRows(simRows);
  };

  const loadCsvText = (text: string) => {
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setCsvErr("Не удалось распознать ни одной строки. Формат: ГГГГ-ММ-ДД ЧЧ:ММ:СС;UID;ID;СЛОТ;МЕСТО;РЕЗУЛЬТАТ;…");
      return;
    }
    setCsvErr("");
    setCsvText(text);
    setRows(parsed);
    setSource("csv");
    setFrom(parsed[0].date);
    setTo(parsed[parsed.length - 1].date);
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => loadCsvText(String(r.result ?? ""));
    r.readAsText(f, "utf-8");
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.date < from || r.date > to) return false;
      if (loc && r.loc !== loc) return false;
      if (slotId && r.slotId !== slotId) return false;
      if (res === "OK" && r.result !== "OK") return false;
      if (res === "BAD" && r.result === "OK") return false;
      if (
        needle &&
        !r.guest.toLowerCase().includes(needle) &&
        !String(r.guestId).includes(needle) &&
        !r.uid.toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
  }, [rows, from, to, loc, slotId, res, q]);

  const stats = useMemo(() => {
    const ok = filtered.filter((r) => r.result === "OK");
    return {
      ok: ok.length,
      guests: new Set(ok.map((r) => r.guestId)).size,
      canteen: ok.filter((r) => r.loc === 1).length,
      resto: ok.filter((r) => r.loc === 2).length,
      bySlot: SLOTS.map((s) => ok.filter((r) => r.slotId === s.id).length),
      bad: filtered.filter((r) => r.result !== "OK").length,
    };
  }, [filtered]);

  const opts = { from, to, locFilter: loc, source: sourceLabel };
  const fname = `otchet_pitanie_${from}_${to}`;

  const selCls =
    "border border-pine-600 bg-pine-950 px-2.5 py-1.5 font-mono text-[12px] text-pine-200 outline-none transition-colors focus:border-copper-400 [color-scheme:dark]";

  return (
    <div className="border border-pine-600 bg-pine-850">
      {/* источники данных */}
      <div className="flex flex-wrap items-center gap-2 border-b border-pine-600 px-5 py-3">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-pine-500">Источник:</span>
        {(
          [
            ["sample", "Демо-данные (неделя)"],
            ["sim", simRows?.length ? `Журнал симулятора · ${simRows.length}` : "Журнал симулятора"],
            ["csv", "Импорт visits.csv"],
          ] as [Source, string][]
        ).map(([s, label]) => (
          <button
            key={s}
            onClick={() => pick(s)}
            disabled={s === "sim" && !simRows?.length}
            className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              source === s
                ? "border-copper-400 bg-copper-500/15 text-copper-300"
                : "border-pine-600 text-pine-300 hover:border-pine-400"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className="border border-pine-600 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-pine-300 transition-colors hover:border-copper-400 hover:text-copper-300"
        >
          Открыть файл…
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <button
          onClick={() => setCsvOpen((v) => !v)}
          className="ml-auto border border-pine-600 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-pine-300 transition-colors hover:border-copper-400 hover:text-copper-300"
        >
          {csvOpen ? "Скрыть вставку" : "Вставить CSV"}
        </button>
      </div>

      {csvOpen && (
        <div className="border-b border-pine-600 px-5 py-4">
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={5}
            placeholder={`Вставьте сюда строки visits.csv (можно сразу из двух файлов — столовой и ресторана):\n2026-02-14 09:12:44;04:A8:53:2E;1003;BREAKFAST;STOLOVAYA;OK;вход разрешён`}
            className="nice-scroll w-full resize-y border border-pine-600 bg-pine-950 p-3 font-mono text-[11.5px] text-pine-200 outline-none placeholder:text-pine-600 focus:border-copper-400"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => loadCsvText(csvText)}
              className="border border-copper-500 bg-copper-500 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-pine-950 transition-colors hover:bg-copper-400"
            >
              Разобрать и построить отчёт
            </button>
            {csvErr && <span className="text-[12px] text-ledred">{csvErr}</span>}
          </div>
        </div>
      )}

      {/* фильтры */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-pine-600 px-5 py-3.5">
        <label className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest text-pine-400">
          с
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selCls} />
        </label>
        <label className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest text-pine-400">
          по
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selCls} />
        </label>
        <select value={loc} onChange={(e) => setLoc(Number(e.target.value) as 0 | LocId)} className={selCls}>
          <option value={0}>Все места</option>
          <option value={1}>Столовая</option>
          <option value={2}>Ресторан</option>
        </select>
        <select value={slotId} onChange={(e) => setSlotId(Number(e.target.value) as 0 | SlotId)} className={selCls}>
          <option value={0}>Все периоды</option>
          {SLOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ru}
            </option>
          ))}
        </select>
        <select value={res} onChange={(e) => setRes(e.target.value as "ALL" | "OK" | "BAD")} className={selCls}>
          <option value="ALL">Все события</option>
          <option value="OK">Только входы</option>
          <option value="BAD">Только нарушения</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Гость, ID или UID…"
          className="min-w-[160px] flex-1 border border-pine-600 bg-pine-950 px-3 py-1.5 font-mono text-[12px] text-pine-200 outline-none transition-colors placeholder:text-pine-600 focus:border-copper-400"
        />
        <span className="font-mono text-[11px] tabular-nums text-pine-400">
          строк: <b className="text-copper-300">{filtered.length}</b>
        </span>
      </div>

      {/* сводка */}
      <div className="grid grid-cols-2 gap-px border-b border-pine-600 bg-pine-700 sm:grid-cols-3 lg:grid-cols-7">
        {[
          ["Посещений", stats.ok, false],
          ["Гостей", stats.guests, false],
          ["Столовая", stats.canteen, false],
          ["Ресторан", stats.resto, false],
          ["Завтрак", stats.bySlot[0], false],
          ["Обед", stats.bySlot[1], false],
          ["Ужин", stats.bySlot[2], false],
        ].map(([k, v]) => (
          <div key={k as string} className="bg-pine-850 px-4 py-3 transition-colors hover:bg-pine-800">
            <div className="font-display text-xl font-bold tabular-nums text-pine-100">{v as number}</div>
            <div className="font-mono text-[9.5px] uppercase tracking-widest text-pine-400">{k as string}</div>
          </div>
        ))}
      </div>

      {/* таблица */}
      <div className="nice-scroll max-h-[420px] overflow-auto">
        <table className="rtable w-full min-w-[760px] text-left text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-pine-600 bg-pine-900 font-mono text-[10px] uppercase tracking-widest text-pine-400">
              <th className="px-5 py-2.5 font-medium">Дата</th>
              <th className="px-3 py-2.5 font-medium">Время</th>
              <th className="px-3 py-2.5 font-medium">Гость</th>
              <th className="px-3 py-2.5 font-medium">ID</th>
              <th className="px-3 py-2.5 font-medium">Период</th>
              <th className="px-3 py-2.5 font-medium">Место</th>
              <th className="px-5 py-2.5 font-medium">Результат</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center font-mono text-[12px] text-pine-500">
                  нет строк под выбранные условия — расширьте период или сбросьте фильтры
                </td>
              </tr>
            )}
            {filtered.map((r, i) => (
              <tr
                key={i}
                className={`border-b border-pine-800 transition-colors hover:bg-copper-500/5 ${
                  r.result !== "OK" ? "bg-ledred/4" : ""
                }`}
              >
                <td className="px-5 py-2 font-mono text-[12px] tabular-nums text-pine-300">{fmtDateRu(r.date)}</td>
                <td className="px-3 py-2 font-mono text-[12px] tabular-nums text-pine-200">{r.time}</td>
                <td className="px-3 py-2 text-pine-100">{r.guest}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-copper-300">{r.guestId || "—"}</td>
                <td className="px-3 py-2 text-pine-200">{SLOT_BY_ID[r.slotId].ru}</td>
                <td className="px-3 py-2 text-pine-200">{LOCATIONS[r.loc].ru}</td>
                <td className="px-5 py-2">
                  <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${TONE[RESULT_META[r.result].tone]}`}>
                    {RESULT_META[r.result].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* скачивание */}
      <div className="flex flex-wrap items-center gap-3 border-t border-pine-600 px-5 py-4">
        <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest text-pine-400">
          <IconDoc className="h-4 w-4 text-copper-400" />
          Сформировать отчёт за {fmtDateRu(from)} — {fmtDateRu(to)}:
        </span>
        <button
          onClick={() => downloadFile(fname + ".html", buildHtmlReport(filtered, opts), "text/html")}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 border border-copper-500 bg-copper-500 px-4 py-2 font-mono text-[11.5px] font-bold uppercase tracking-wide text-pine-950 transition-all hover:bg-copper-400 active:translate-y-[1px] disabled:cursor-not-allowed disabled:border-pine-600 disabled:bg-transparent disabled:text-pine-500"
        >
          <IconDownload className="h-4 w-4" /> HTML (для печати)
        </button>
        <button
          onClick={() => downloadFile(fname + ".txt", buildTxtReport(filtered, opts), "text/plain")}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 border border-pine-500 px-4 py-2 font-mono text-[11.5px] uppercase tracking-wide text-pine-200 transition-colors hover:border-copper-400 hover:text-copper-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconDownload className="h-4 w-4" /> TXT
        </button>
        <button
          onClick={() =>
            downloadFile(
              fname + ".csv",
              "DATETIME;UID;GUEST_ID;SLOT;LOCATION;RESULT;NOTE\n" +
                filtered
                  .map((r) => `${r.date} ${r.time}:00;${r.uid.replace(/:/g, "")};${r.guestId};${SLOT_BY_ID[r.slotId].name};${LOCATIONS[r.loc].en};${RESULT_CSV[r.result]};отчёт`)
                  .join("\n"),
              "text/csv"
            )
          }
          disabled={filtered.length === 0}
          className="flex items-center gap-2 border border-pine-500 px-4 py-2 font-mono text-[11.5px] uppercase tracking-wide text-pine-200 transition-colors hover:border-copper-400 hover:text-copper-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconDownload className="h-4 w-4" /> CSV
        </button>
        <span className="ml-auto hidden font-mono text-[10px] text-pine-500 lg:block">
          нарушения: <b className="text-ledred">{stats.bad}</b>
        </span>
      </div>
    </div>
  );
}
