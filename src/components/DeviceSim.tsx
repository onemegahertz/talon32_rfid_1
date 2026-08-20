import { useEffect, useMemo, useRef, useState } from "react";
import {
  LOCATIONS,
  RESULT_META,
  ROSTER,
  SLOTS,
  addDays,
  fmtDate,
  fmtDateRu,
  fmtMin,
  slotAt,
  uidHex,
  weekdayRu,
  type LocId,
  type ReportRow,
  type Result,
  type SlotId,
} from "../lib/core";
import { playApprove, playDeny, playReg, playTick, playTime } from "../lib/audio";
import { IconCard, IconMute, IconPause, IconPlay, IconSound, IconSwap } from "./ui";

/* ------------------------------------------------------------------ */

interface SimCard {
  uid: string;
  guestId: number;
  name: string;
  registered: boolean;
  last: { date: string; slotId: SlotId; loc: LocId } | null;
}

interface SimLogEntry {
  id: number;
  date: string;
  time: string;
  uid: string;
  guestId: number;
  guest: string;
  slotId: SlotId | 0;
  loc: LocId;
  result: Result;
  note: string;
}

type Mode = "read" | "reg" | "reset";

const TONE_BADGE: Record<string, string> = {
  green: "border-ledgreen/50 text-ledgreen bg-ledgreen/10",
  red: "border-ledred/50 text-ledred bg-ledred/10",
  amber: "border-amberled/50 text-amberled bg-amberled/10",
  copper: "border-copper-400/50 text-copper-300 bg-copper-500/10",
  slate: "border-pine-500/60 text-pine-300 bg-pine-700/30",
};

const JUMPS = [
  { label: "08:29", m: 8 * 60 + 29, hint: "до завтрака" },
  { label: "09:10", m: 9 * 60 + 10, hint: "завтрак" },
  { label: "13:29", m: 13 * 60 + 29, hint: "до обеда" },
  { label: "14:05", m: 14 * 60 + 5, hint: "обед" },
  { label: "16:20", m: 16 * 60 + 20, hint: "между" },
  { label: "18:30", m: 18 * 60 + 30, hint: "ужин" },
];

function initCards(): SimCard[] {
  const cs: SimCard[] = ROSTER.slice(0, 5).map((name, i) => ({
    uid: uidHex(i + 1),
    guestId: 1001 + i,
    name,
    registered: true,
    last: null,
  }));
  cs.push({ uid: "04:00:00:00", guestId: 0, name: "Чистая карта", registered: false, last: null });
  return cs;
}

function hexByte(n: number) {
  return (n & 0xff).toString(16).toUpperCase().padStart(2, "0");
}

function cardDump(card: SimCard): { b4: string[]; b6: string[] } {
  const b4 = new Array(16).fill(0);
  if (card.registered) {
    b4[0] = 0xa5; b4[1] = 0xc3; b4[2] = 0x00; b4[3] = 0x01;
    b4[4] = card.guestId & 0xff;
    b4[5] = (card.guestId >>> 8) & 0xff;
    b4[6] = (card.guestId >>> 16) & 0xff;
    b4[7] = (card.guestId >>> 24) & 0xff;
  }
  const b6 = new Array(16).fill(0);
  if (card.last) {
    const [y, m, d] = card.last.date.split("-").map(Number);
    b6[0] = y - 2000; b6[1] = m; b6[2] = d; b6[3] = card.last.slotId; b6[4] = card.last.loc;
    let crc = 0;
    for (let i = 0; i < 15; i++) crc += b6[i];
    b6[15] = crc & 0xff;
  }
  return { b4: b4.map(hexByte), b6: b6.map(hexByte) };
}

/* ------------------------------------------------------------------ */

export default function DeviceSim({ onExport }: { onExport: (rows: ReportRow[]) => void }) {
  const today = useMemo(() => new Date(), []);
  const [dayOffset, setDayOffset] = useState(0);
  const [minutes, setMinutes] = useState(8 * 60 + 29);
  const [running, setRunning] = useState(true);
  const [loc, setLoc] = useState<LocId>(1);
  const [mode, setMode] = useState<Mode>("read");
  const [cards, setCards] = useState<SimCard[]>(initCards);
  const [selectedUid, setSelectedUid] = useState(() => uidHex(1));
  const [scanning, setScanning] = useState(false);
  const [verdict, setVerdict] = useState<{ result: Result; note: string } | null>(null);
  const [buzzing, setBuzzing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [log, setLog] = useState<SimLogEntry[]>([]);
  const logId = useRef(1);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  /* тикающее время симуляции */
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setMinutes((m) => (m + 1) % 1440), 1300);
    return () => clearInterval(t);
  }, [running]);

  const dateIso = fmtDate(addDays(today, dayOffset));
  const slot = slotAt(minutes);
  const selected = cards.find((c) => c.uid === selectedUid) ?? cards[0];
  const dump = cardDump(selected);
  const greenOn = verdict && (verdict.result === "OK" || verdict.result === "REG" || verdict.result === "RESET");
  const redOn = verdict && !greenOn;

  const sound = (fn: () => void, buzzMs = 0) => {
    if (!mutedRef.current) fn();
    if (buzzMs) {
      setBuzzing(true);
      setTimeout(() => setBuzzing(false), buzzMs);
    }
  };

  const pushLog = (e: Omit<SimLogEntry, "id">) => {
    setLog((l) => [{ ...e, id: logId.current++ }, ...l].slice(0, 80));
  };

  const applyCard = () => {
    if (scanning) return;
    const card = { ...selected };
    setScanning(true);
    setVerdict(null);
    if (!mutedRef.current) playTick();

    setTimeout(() => {
      const nowTime = fmtMin(minutes);
      let result: Result;
      let note = "";
      let slotId: SlotId | 0 = slot ? slot.id : 0;

      if (mode === "reset") {
        card.last = null;
        result = "RESET";
        note = "Запись о посещении стёрта с карты";
        setCards((cs) => cs.map((c) => (c.uid === card.uid ? card : c)));
        setVerdict({ result, note });
        sound(() => playReg(), 500);
      } else if (mode === "reg") {
        if (card.registered) {
          result = "FAIL";
          note = `Карта уже зарегистрирована — ID ${card.guestId}`;
          setVerdict({ result, note });
          sound(() => playDeny(), 750);
        } else {
          const nextId = Math.max(...cards.filter((c) => c.registered).map((c) => c.guestId), 1000) + 1;
          card.guestId = nextId;
          card.registered = true;
          card.name = `Гость ${nextId}`;
          result = "REG";
          note = `Присвоен идентификатор ${nextId}`;
          setCards((cs) => cs.map((c) => (c.uid === card.uid ? card : c)));
          setVerdict({ result, note });
          sound(() => playReg(), 650);
        }
      } else {
        /* обычный режим чтения */
        if (!card.registered) {
          result = "NOREG";
          note = "На карте нет идентификатора гостя";
          setVerdict({ result, note });
          sound(() => playTime(), 850);
        } else if (!slot) {
          result = "TIME";
          note = "Сейчас вне периода питания";
          setVerdict({ result, note });
          sound(() => playTime(), 850);
        } else if (card.last && card.last.date === dateIso && card.last.slotId === slot.id) {
          result = "ALREADY";
          note = `В этом периоде уже посещал(а): ${LOCATIONS[card.last.loc].ru}`;
          setVerdict({ result, note });
          sound(() => playDeny(), 750);
        } else {
          const prev = card.last && card.last.date === dateIso ? ` (ранее сегодня: ${LOCATIONS[card.last.loc].ru})` : "";
          card.last = { date: dateIso, slotId: slot.id, loc };
          result = "OK";
          note = `Вход разрешён · ${slot.ru} · ${LOCATIONS[loc].ru}${prev}`;
          setCards((cs) => cs.map((c) => (c.uid === card.uid ? card : c)));
          setVerdict({ result, note });
          sound(() => playApprove(), 450);
        }
      }

      pushLog({
        date: dateIso,
        time: nowTime,
        uid: card.uid,
        guestId: card.guestId,
        guest: card.registered ? card.name : "—",
        slotId,
        loc,
        result,
        note,
      });
      setScanning(false);
    }, 700);
  };

  const exportRows: ReportRow[] = useMemo(
    () =>
      log
        .filter((e) => e.slotId > 0 && (e.result === "OK" || e.result === "ALREADY"))
        .map((e) => ({
          date: e.date,
          time: e.time,
          uid: e.uid,
          guestId: e.guestId,
          guest: e.guestId ? e.guest : "Не зарегистрирован",
          slotId: e.slotId as SlotId,
          loc: e.loc,
          result: e.result,
        }))
        .reverse(),
    [log]
  );

  const seg = (active: boolean) =>
    `px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide border transition-colors duration-150 ${
      active
        ? "bg-copper-500 text-pine-950 border-copper-400 font-bold"
        : "bg-transparent text-pine-300 border-pine-600 hover:border-copper-500 hover:text-copper-300"
    }`;

  return (
    <div className="relative border border-pine-600 bg-pine-850 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
      {/* винты по углам */}
      {[
        "top-2 left-2",
        "top-2 right-2",
        "bottom-2 left-2",
        "bottom-2 right-2",
      ].map((pos) => (
        <span key={pos} className={`absolute ${pos} h-2 w-2 rounded-full bg-pine-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]`} />
      ))}

      {/* ------- шильдик ------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pine-600 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-[13px] font-bold tracking-widest text-copper-400">ТАЛОН-32</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-pine-400 sm:block">
            терминал контроля · fw 1.2.0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex">
            {([1, 2] as LocId[]).map((l) => (
              <button key={l} onClick={() => { setLoc(l); if (!mutedRef.current) playTick(); }} className={seg(loc === l)}>
                {LOCATIONS[l].ru}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            className="border border-pine-600 p-1.5 text-pine-300 transition-colors hover:border-copper-500 hover:text-copper-300"
            title={muted ? "Включить звук" : "Выключить звук"}
          >
            {muted ? <IconMute className="h-4 w-4" /> : <IconSound className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[240px_1fr]">
        {/* ------- левая колонка: считыватель ------- */}
        <div className="flex flex-col gap-4">
          <div className="relative flex h-44 items-center justify-center overflow-hidden border border-pine-600 bg-pine-900">
            <div className="grid-bg absolute inset-0" />
            {scanning && (
              <div className="scan-beam absolute inset-x-3 h-14 bg-gradient-to-b from-transparent via-copper-400/25 to-transparent" />
            )}
            <div className="relative flex flex-col items-center gap-2">
              <div className="relative">
                {scanning && <span className="ring-pulse absolute inset-0 rounded-full border-2 border-copper-400" />}
                <IconCard className={`h-14 w-14 transition-colors duration-300 ${scanning ? "text-copper-300" : verdict ? (greenOn ? "text-ledgreen" : "text-ledred") : "text-pine-400"}`} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-pine-400">
                {scanning ? "чтение…" : "rc522 · 13.56 МГц"}
              </span>
            </div>
            <span className="absolute right-2 top-2 font-mono text-[9px] text-pine-500">SPI · GPIO5</span>
          </div>

          {/* лампы и зуммер */}
          <div className="flex items-center justify-between border border-pine-600 bg-pine-900 px-4 py-3">
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center gap-1">
                <span className={`led h-5 w-5 rounded-full ${greenOn ? "led-green-on" : mode === "reg" ? "led-green-off blink-fast" : "led-green-off"}`} />
                <span className="font-mono text-[9px] uppercase tracking-widest text-pine-400">вход</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className={`led h-5 w-5 rounded-full ${redOn ? "led-red-on" : mode === "reset" ? "led-red-off blink-fast" : "led-red-off"}`} />
                <span className="font-mono text-[9px] uppercase tracking-widest text-pine-400">запрет</span>
              </div>
            </div>
            <div className="flex items-center gap-2" title="Пьезозуммер, GPIO32">
              <div className="flex h-5 items-end gap-[3px]">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`w-[3px] rounded-sm ${buzzing ? "wave-bar bg-ledred" : "bg-pine-600"}`}
                    style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.07}s` }}
                  />
                ))}
              </div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-pine-400">зуммер</span>
            </div>
          </div>

          {/* режимы */}
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-pine-400">Режим кнопки GPIO33</div>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ["read", "Чтение"],
                  ["reg", "Регистрация"],
                  ["reset", "Сброс"],
                ] as [Mode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); if (!mutedRef.current) playTick(); }}
                  className={`border px-1 py-1.5 font-mono text-[10.5px] uppercase tracking-wide transition-colors ${
                    mode === m
                      ? m === "read"
                        ? "border-ledgreen/60 bg-ledgreen/10 text-ledgreen"
                        : m === "reg"
                          ? "border-copper-400/60 bg-copper-500/10 text-copper-300"
                          : "border-ledred/60 bg-ledred/10 text-ledred"
                      : "border-pine-600 text-pine-300 hover:border-pine-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={applyCard}
            disabled={scanning}
            className={`group relative w-full border px-4 py-3.5 font-display text-[13px] font-bold uppercase tracking-widest transition-all duration-200 ${
              scanning
                ? "cursor-wait border-pine-600 text-pine-500"
                : "border-copper-500 bg-copper-500 text-pine-950 hover:bg-copper-400 active:translate-y-[2px]"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <IconCard className="h-4 w-4" />
              {scanning ? "Чтение карты…" : "Приложить карту"}
            </span>
          </button>

          {/* вердикт */}
          <div
            className={`min-h-[52px] border px-3 py-2 text-[12.5px] leading-snug transition-colors duration-300 ${
              !verdict
                ? "border-pine-700 text-pine-500"
                : greenOn
                  ? "border-ledgreen/50 bg-ledgreen/8 text-ledgreen"
                  : verdict.result === "TIME"
                    ? "border-amberled/50 bg-amberled/8 text-amberled"
                    : "border-ledred/50 bg-ledred/8 text-ledred"
            }`}
          >
            {verdict ? (
              <>
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-80">
                  {RESULT_META[verdict.result].label}
                </span>
                <div>{verdict.note}</div>
              </>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-widest">выберите карту и приложите её к считывателю</span>
            )}
          </div>
        </div>

        {/* ------- правая колонка ------- */}
        <div className="flex flex-col gap-4">
          {/* часы и периоды */}
          <div className="border border-pine-600 bg-pine-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-3xl font-bold tabular-nums tracking-tight text-pine-100">
                  {fmtMin(minutes)}
                </span>
                <span className="font-mono text-xs text-pine-300">
                  {weekdayRu(dateIso)} {fmtDateRu(dateIso)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDayOffset((d) => d - 1)}
                  className="border border-pine-600 px-2 py-1 font-mono text-xs text-pine-300 transition-colors hover:border-copper-500 hover:text-copper-300"
                >
                  ‹ день
                </button>
                <button
                  onClick={() => { setRunning((r) => !r); if (!mutedRef.current) playTick(); }}
                  className="border border-pine-600 p-1.5 text-pine-300 transition-colors hover:border-copper-500 hover:text-copper-300"
                  title={running ? "Пауза времени" : "Запустить время"}
                >
                  {running ? <IconPause className="h-3.5 w-3.5" /> : <IconPlay className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setDayOffset((d) => d + 1)}
                  className="border border-pine-600 px-2 py-1 font-mono text-xs text-pine-300 transition-colors hover:border-copper-500 hover:text-copper-300"
                >
                  день ›
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {SLOTS.map((s) => {
                const active = slot?.id === s.id;
                return (
                  <div
                    key={s.id}
                    className={`border px-2 py-1.5 transition-all duration-300 ${
                      active ? "border-ledgreen/60 bg-ledgreen/10 shadow-[0_0_18px_-6px_rgba(69,224,143,0.5)]" : "border-pine-700"
                    }`}
                  >
                    <div className={`font-mono text-[10px] uppercase tracking-widest ${active ? "text-ledgreen" : "text-pine-400"}`}>
                      {s.ru}
                    </div>
                    <div className={`font-mono text-xs tabular-nums ${active ? "text-pine-100" : "text-pine-300"}`}>
                      {fmtMin(s.from)}–{fmtMin(s.to)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {JUMPS.map((j) => (
                <button
                  key={j.label}
                  onClick={() => { setMinutes(j.m); if (!mutedRef.current) playTick(); }}
                  title={j.hint}
                  className={`border px-2 py-0.5 font-mono text-[11px] tabular-nums transition-colors ${
                    minutes === j.m
                      ? "border-copper-400 bg-copper-500/15 text-copper-300"
                      : "border-pine-600 text-pine-300 hover:border-copper-500 hover:text-copper-300"
                  }`}
                >
                  {j.label}
                </button>
              ))}
              <span className="ml-auto hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-pine-500 sm:flex">
                <IconSwap className="h-3.5 w-3.5" />
                1 мин / 1.3 с
              </span>
            </div>
          </div>

          {/* карты гостей */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-pine-400">Карты гостей (Mifare Classic 1K)</span>
              <span className="font-mono text-[10px] text-pine-500">{cards.length} шт.</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cards.map((c) => {
                const visitedToday = c.last && c.last.date === dateIso;
                return (
                  <button
                    key={c.uid}
                    onClick={() => { setSelectedUid(c.uid); setVerdict(null); if (!mutedRef.current) playTick(); }}
                    className={`group flex items-center gap-2 border px-2.5 py-1.5 transition-all duration-150 ${
                      selectedUid === c.uid
                        ? "border-copper-400 bg-copper-500/10"
                        : "border-pine-600 hover:border-pine-400"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        !c.registered ? "bg-pine-500" : visitedToday ? "bg-amberled" : "bg-ledgreen"
                      }`}
                    />
                    <span className="text-left">
                      <span className={`block text-[12px] leading-tight ${selectedUid === c.uid ? "text-copper-300" : "text-pine-100"}`}>
                        {c.name}
                      </span>
                      <span className="block font-mono text-[9.5px] text-pine-400">
                        {c.registered ? `ID ${c.guestId} · ${c.uid}` : "нет ID · чистая"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* дамп памяти карты */}
          <div className="border border-pine-600 bg-pine-950 p-3 font-mono text-[10.5px] leading-relaxed text-pine-300">
            <div className="mb-1 flex items-center justify-between text-[9.5px] uppercase tracking-widest text-pine-500">
              <span>Память карты · сектор 1</span>
              <span>{selected.uid}</span>
            </div>
            <div>
              <span className="text-copper-400">БЛОК 4</span>{" "}
              <span className="text-pine-500">ID гостя:</span> {dump.b4.slice(0, 8).join(" ")}
              <span className="text-pine-600"> {dump.b4.slice(8).join(" ")}</span>
            </div>
            <div>
              <span className="text-copper-400">БЛОК 6</span>{" "}
              <span className="text-pine-500">посещение:</span> {dump.b6.slice(0, 5).join(" ")}
              <span className="text-pine-600"> {dump.b6.slice(5, 15).join(" ")}</span>{" "}
              <span className="text-pine-500">crc</span> {dump.b6[15]}
            </div>
          </div>

          {/* журнал */}
          <div className="flex min-h-0 flex-1 flex-col border border-pine-600 bg-pine-900">
            <div className="flex items-center justify-between border-b border-pine-600 px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-pine-400">
                Журнал терминала · {log.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onExport(exportRows)}
                  disabled={exportRows.length === 0}
                  className="border border-copper-500/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-copper-300 transition-colors hover:bg-copper-500 hover:text-pine-950 disabled:cursor-not-allowed disabled:border-pine-600 disabled:text-pine-500 disabled:hover:bg-transparent"
                >
                  в отчёты →
                </button>
                <button
                  onClick={() => setLog([])}
                  disabled={log.length === 0}
                  className="border border-pine-600 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-pine-300 transition-colors hover:border-ledred/60 hover:text-ledred disabled:cursor-not-allowed disabled:text-pine-600"
                >
                  очистить
                </button>
              </div>
            </div>
            <div className="nice-scroll h-36 overflow-y-auto px-3 py-1.5 lg:h-44">
              {log.length === 0 && (
                <div className="flex h-full items-center justify-center font-mono text-[11px] text-pine-500">
                  событий пока нет — приложите карту
                </div>
              )}
              {log.map((e) => (
                <div key={e.id} className="flex items-center gap-2 border-b border-pine-800 py-1.5 text-[11.5px] last:border-0">
                  <span className="font-mono text-[10.5px] tabular-nums text-pine-500">
                    {fmtDateRu(e.date).slice(0, 5)} {e.time}
                  </span>
                  <span className={`shrink-0 border px-1.5 py-px font-mono text-[9px] uppercase tracking-wide ${TONE_BADGE[RESULT_META[e.result].tone]}`}>
                    {RESULT_META[e.result].label}
                  </span>
                  <span className="truncate text-pine-200">
                    {e.guestId ? `${e.guest} · ID ${e.guestId}` : e.uid}
                    <span className="text-pine-500"> — {e.note}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* нижняя строка */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-pine-600 px-5 py-2">
        <span className="font-mono text-[9.5px] uppercase tracking-widest text-pine-500">
          демо повторяет логику прошивки 1:1 · посещение хранится в памяти карты
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-pine-500">
          <span className="led h-1.5 w-1.5 rounded-full bg-ledgreen shadow-[0_0_8px_rgba(69,224,143,0.8)]" />
          DS3231 · LittleFS · Wi-Fi
        </span>
      </div>
    </div>
  );
}
