/* ============================================================
   ТАЛОН-32 · общая логика: периоды, места, данные, CSV
   ============================================================ */

export type SlotId = 1 | 2 | 3;
export type LocId = 1 | 2;
export type Result = "OK" | "ALREADY" | "TIME" | "NOREG" | "REG" | "RESET" | "FAIL";

export interface Slot {
  id: SlotId;
  name: string;
  ru: string;
  from: number; // минуты от начала суток
  to: number;
}

export const SLOTS: Slot[] = [
  { id: 1, name: "BREAKFAST", ru: "Завтрак", from: 8 * 60 + 30, to: 11 * 60 + 30 },
  { id: 2, name: "LUNCH", ru: "Обед", from: 13 * 60 + 30, to: 15 * 60 + 30 },
  { id: 3, name: "DINNER", ru: "Ужин", from: 18 * 60, to: 20 * 60 },
];

export const SLOT_BY_ID: Record<number, Slot> = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

export const LOCATIONS: Record<LocId, { ru: string; en: string }> = {
  1: { ru: "Столовая", en: "STOLOVAYA" },
  2: { ru: "Ресторан", en: "RESTORAN" },
};

export const RESULT_META: Record<Result, { label: string; tone: "green" | "red" | "amber" | "copper" | "slate" }> = {
  OK: { label: "Вход разрешён", tone: "green" },
  ALREADY: { label: "Уже посещал", tone: "red" },
  TIME: { label: "Вне периода", tone: "amber" },
  NOREG: { label: "Нет регистрации", tone: "red" },
  REG: { label: "Регистрация", tone: "copper" },
  RESET: { label: "Сброс карты", tone: "slate" },
  FAIL: { label: "Отказ", tone: "red" },
};

/* ---------------- время ---------------- */

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const fmtMin = (m: number) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;

export function slotAt(minute: number): Slot | null {
  for (const s of SLOTS) if (minute >= s.from && minute < s.to) return s;
  return null;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fmtDateRu(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
export function weekdayRu(iso: string): string {
  return WEEKDAYS[new Date(iso + "T12:00:00").getDay()];
}

/* ---------------- гости ---------------- */

export const ROSTER: string[] = [
  "Смирнов А. П.",
  "Кузнецова М. И.",
  "Волков Д. С.",
  "Орлова Е. В.",
  "Лебедев К. Н.",
  "Морозова Т. А.",
  "Козлов И. И.",
  "Павлова Н. Р.",
  "Соколов Г. М.",
  "Никитина О. Д.",
  "Фёдоров С. С.",
  "Белова А. К.",
];

export const guestById = (id: number): string =>
  id >= 1001 && id <= 1000 + ROSTER.length ? ROSTER[id - 1001] : `Гость ${id}`;

export function uidHex(seed: number): string {
  const b = [0x04, (0xa1 + seed * 7) & 0xff, (0x3c + seed * 13) & 0xff, (0x11 + seed * 29) & 0xff];
  return b.map((x) => x.toString(16).toUpperCase().padStart(2, "0")).join(":");
}

/* ---------------- строка отчёта ---------------- */

export interface ReportRow {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  uid: string;
  guestId: number;
  guest: string;
  slotId: SlotId;
  loc: LocId;
  result: Result;
}

/* ---------------- демо-данные (детерминированные) ---------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSampleData(): ReportRow[] {
  const rnd = mulberry32(20260214);
  const rows: ReportRow[] = [];
  const today = new Date();

  for (let day = 6; day >= 0; day--) {
    const date = fmtDate(addDays(today, -day));
    ROSTER.forEach((guest, gi) => {
      const guestId = 1001 + gi;
      const uid = uidHex(gi);
      const plan: Array<{ slot: Slot; p: number; canteen: number }> = [
        { slot: SLOTS[0], p: 0.52, canteen: 0.72 },
        { slot: SLOTS[1], p: 0.74, canteen: 0.55 },
        { slot: SLOTS[2], p: 0.48, canteen: 0.3 },
      ];
      for (const { slot, p, canteen } of plan) {
        if (rnd() > p) continue;
        const span = slot.to - slot.from;
        const minute = slot.from + 2 + Math.floor(rnd() * (span - 6));
        const loc: LocId = rnd() < canteen ? 1 : 2;
        rows.push({
          date,
          time: fmtMin(minute),
          uid,
          guestId,
          guest,
          slotId: slot.id,
          loc,
          result: "OK",
        });
        // повторная попытка в том же периоде (нарушение)
        if (rnd() < 0.08) {
          const m2 = Math.min(slot.to - 1, minute + 4 + Math.floor(rnd() * 40));
          rows.push({
            date,
            time: fmtMin(m2),
            uid,
            guestId,
            guest,
            slotId: slot.id,
            loc: (loc === 1 ? 2 : 1) as LocId,
            result: "ALREADY",
          });
        }
      }
    });
  }

  // Попытки «вне периода» и «нет регистрации» остаются в сыром журнале
  // терминала (SLOT = «-»), но в отчёт по питанию не входят — как и в
  // реальной системе, поэтому в демо-данных их нет.

  rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return rows;
}

/* ---------------- разбор CSV с терминалов ---------------- */

const SLOT_MAP: Record<string, SlotId> = {
  BREAKFAST: 1, ЗАВТРАК: 1, "1": 1,
  LUNCH: 2, ОБЕД: 2, "2": 2,
  DINNER: 3, УЖИН: 3, "3": 3,
};
const LOC_MAP: Record<string, LocId> = {
  STOLOVAYA: 1, СТОЛОВАЯ: 1, "1": 1,
  RESTORAN: 2, RESTAURANT: 2, РЕСТОРАН: 2, "2": 2,
};

export function parseCsv(text: string): ReportRow[] {
  const rows: ReportRow[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.toUpperCase().includes("DATETIME")) continue;
    const p = line.split(";");
    if (p.length < 6) continue;
    const [dtRaw, uidRaw, idRaw, slotRaw, locRaw, resRaw] = p;
    const [date, timeRaw = ""] = dtRaw.trim().split(" ");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const slotId = SLOT_MAP[slotRaw.trim().toUpperCase()];
    const loc = LOC_MAP[locRaw.trim().toUpperCase()];
    if (!slotId || !loc) continue;
    const ru = resRaw.trim().toUpperCase();
    let result: Result;
    if (ru === "OK") result = "OK";
    else if (ru.includes("ALREADY")) result = "ALREADY";
    else if (ru.includes("TIME")) result = "TIME";
    else if (ru.includes("NOREG")) result = "NOREG";
    else continue; // BOOT / REG / RESET не входят в отчёт по питанию
    const guestId = parseInt(idRaw, 10) || 0;
    const uid = uidRaw
      .replace(/[^0-9a-fA-F]/g, "")
      .toUpperCase()
      .match(/.{2}/g)
      ?.join(":") ?? uidRaw;
    rows.push({
      date,
      time: timeRaw.slice(0, 5),
      uid,
      guestId,
      guest: guestId === 0 ? "Не зарегистрирован" : guestById(guestId),
      slotId,
      loc,
      result,
    });
  }
  rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return rows;
}
