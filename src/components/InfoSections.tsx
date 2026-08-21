import { useState } from "react";
import { Reveal, SectionHead, IconAlert, IconCard, IconChip, IconClock, IconDoc, IconTag, IconWifi } from "./ui";

/* ============================================================
   01 · ПРАВИЛА СИСТЕМЫ
   ============================================================ */
const RULES = [
  {
    icon: IconTag,
    title: "Карта — это гость",
    text: "На ресепшен гостю выдают карту Mifare Classic 1K. Одно нажатие кнопки на терминале — и карте присваивается очередной идентификатор (1001, 1002, …), который записывается прямо в её память.",
  },
  {
    icon: IconClock,
    title: "Один период — одно посещение",
    text: "Завтрак 08:30–11:30, обед 13:30–15:30, ужин 18:00–20:00. В каждом периоде гость проходит один раз — в столовую или в ресторан, куда захочет. Первый вход: зелёная лампа и короткий сигнал.",
  },
  {
    icon: IconCard,
    title: "Повтор — красный со звонком",
    text: "Дата и период посещения хранятся на самой карте. Если гость уже ел в этом периоде — в любом из двух мест — терминал зажжёт красную лампу с тремя гудками и запишет нарушение в журнал.",
  },
  {
    icon: IconDoc,
    title: "Журнал знает, кто где ел",
    text: "Каждое обращение (вход, повтор, попытка вне времени) пишется в visits.csv во внутренней памяти и отдаётся по Wi-Fi. Два файла — со столовой и ресторана — сливаются в один отчёт за любой период.",
  },
];

export function RulesSection() {
  return (
    <section id="rules" className="border-y border-ink-900/10 bg-paper-50 py-20 text-ink-900 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          light
          num="01"
          title="Как устроена логика"
          sub="Четыре правила, которые прошиты в каждом терминале. Интерактивная демонстрация этой же логики — в симуляторе выше."
        />
        <div className="grid gap-px overflow-hidden border border-ink-900/15 bg-ink-900/15 md:grid-cols-2">
          {RULES.map((r, i) => (
            <Reveal key={r.title} delay={i * 90}>
              <div className="group h-full bg-paper-50 p-6 transition-colors duration-300 hover:bg-paper-100 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl font-bold text-copper-600/90 md:text-4xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <r.icon className="h-7 w-7 text-ink-500 transition-colors duration-300 group-hover:text-copper-600" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold uppercase tracking-wide md:text-lg">{r.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-700">{r.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   02 · КОМПЛЕКТУЮЩИЕ
   ============================================================ */
const BOM_A = [
  ["ESP32 DevKit V1 (или NodeMCU-32S)", "1", "Мозг терминала: логика карты, журнал, Wi-Fi", "≈ 550 ₽"],
  ["Модуль RFID RC522 (MFRC522, 13.56 МГц)", "1", "Считыватель карт, интерфейс SPI", "≈ 220 ₽"],
  ["Модуль часов DS3231 (с батарейкой)", "1", "Точное время периодов, не сбивается при отключении питания", "≈ 190 ₽"],
  ["Светодиод зелёный, 5 мм", "1", "«Вход разрешён»", "≈ 5 ₽"],
  ["Светодиод красный, 5 мм", "1", "«Вход запрещён»", "≈ 5 ₽"],
  ["Резистор 220 Ом", "2", "Ограничение тока светодиодов", "≈ 2 ₽/шт"],
  ["Пьезоизлучатель пассивный (buzzer)", "1", "Звуковой сигнал — тон задаёт прошивка", "≈ 15 ₽"],
  ["Кнопка тактовая 6×6 мм", "1", "Режимы: регистрация карт / сброс посещения", "≈ 5 ₽"],
];
const BOM_B = [
  ["Карты Mifare Classic 1K (пачка 50 шт)", "1 пачка", "Гостевые карты; важно — НЕ NTAG и НЕ Ultralight!", "≈ 450 ₽"],
  ["Макетная плата + провода-перемычки (или пайка)", "1 комплект", "Монтаж; для постоянной работы лучше спаять", "≈ 250 ₽"],
  ["Блок питания 5 В / 2 А + кабель micro-USB", "2", "Питание терминалов (подойдёт и USB-зарядка)", "≈ 400 ₽/шт"],
  ["Корпус (распечатать на 3D или распредкоробка)", "2", "Опрятный вид на входе в зал", "по желанию"],
];

function BomTable({ title, note, rows }: { title: string; note: string; rows: string[][] }) {
  return (
    <Reveal>
      <div className="border border-pine-600 bg-pine-850">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-pine-600 px-5 py-3">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-copper-400">{title}</h3>
          <span className="font-mono text-[11px] text-pine-400">{note}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-pine-700 font-mono text-[10.5px] uppercase tracking-widest text-pine-400">
                <th className="px-5 py-2.5 font-medium">Компонент</th>
                <th className="px-3 py-2.5 font-medium">Кол-во</th>
                <th className="px-3 py-2.5 font-medium">Зачем</th>
                <th className="px-5 py-2.5 text-right font-medium">Цена</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="rtable border-b border-pine-800 last:border-0 hover:bg-copper-500/5">
                  <td className="px-5 py-3 font-medium text-pine-100">{r[0]}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-copper-300">{r[1]}</td>
                  <td className="px-3 py-3 text-pine-300">{r[2]}</td>
                  <td className="px-5 py-3 text-right font-mono text-[12px] text-pine-300">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Reveal>
  );
}

export function BomSection() {
  return (
    <section id="bom" className="pcb-bg border-y border-pine-700 bg-pine-900 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          num="02"
          title="Комплектующие"
          sub="Всё покупается за один заказ в любом магазине радиоэлектроники или на маркетплейсе. Цены ориентировочные."
        />
        <div className="grid gap-6">
          <BomTable title="На один терминал" note="× 2 комплекта — столовая и ресторан" rows={BOM_A} />
          <BomTable title="На весь проект" note="общее на оба терминала" rows={BOM_B} />
        </div>
        <Reveal delay={120}>
          <div className="mt-6 flex items-start gap-3 border border-amberled/40 bg-amberled/8 px-5 py-4 text-sm text-amberled">
            <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Карты — только <b>Mifare Classic 1K</b> (S50). NTAG213/215 и Ultralight физически не умеют то, что нам нужно —
              запись блока по ключу. Модуль RC522 питается строго от <b>3.3V</b> — от 5V он сгорает.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   03 · ПОДКЛЮЧЕНИЕ
   ============================================================ */
/* цвета проводов: от, куда, цвет, hex, примечание */
const WIRE_ROWS: { group: string; rows: [string, string, string, string, string][] }[] = [
  {
    group: "Считыватель RC522 · SPI",
    rows: [
      ["RC522 · 3.3V", "ESP32 · 3V3", "Красный", "#e05252", "питание модуля — строго 3.3V!"],
      ["RC522 · GND", "ESP32 · GND", "Чёрный", "#5a615c", "общий провод"],
      ["RC522 · SDA (SDS)", "ESP32 · GPIO 5", "Жёлтый", "#e5c94e", "выбор чипа (SS)"],
      ["RC522 · SCK", "ESP32 · GPIO 18", "Оранжевый", "#e59a4e", "тактирование SPI"],
      ["RC522 · MOSI", "ESP32 · GPIO 23", "Синий", "#4e86e5", "данные к модулю"],
      ["RC522 · MISO", "ESP32 · GPIO 19", "Зелёный", "#45e08f", "данные от модуля"],
      ["RC522 · RST", "ESP32 · GPIO 27", "Белый", "#d7e6dc", "сброс чипа"],
    ],
  },
  {
    group: "Часы реального времени DS3231 · I²C",
    rows: [
      ["DS3231 · VCC", "ESP32 · 3V3", "Красный", "#e05252", "питание (общая шина 3.3V)"],
      ["DS3231 · GND", "ESP32 · GND", "Чёрный", "#5a615c", "общий провод"],
      ["DS3231 · SDA", "ESP32 · GPIO 21", "Жёлто-зелёный", "#b8e54e", "линия данных I²C"],
      ["DS3231 · SCL", "ESP32 · GPIO 22", "Серый", "#9aa39d", "линия тактирования I²C"],
    ],
  },
  {
    group: "Индикация, звук, кнопка",
    rows: [
      ["Светодиод зелёный (+)", "ESP32 · GPIO 26", "Зелёный", "#45e08f", "через резистор 220 Ом, (−) на GND"],
      ["Светодиод красный (+)", "ESP32 · GPIO 25", "Красный", "#e05252", "через резистор 220 Ом, (−) на GND"],
      ["Зуммер пассивный (+)", "ESP32 · GPIO 32", "Фиолетовый", "#b48ae0", "(−) на GND, тон задаёт прошивка"],
      ["Кнопка тактовая", "GPIO 33 ↔ GND", "Коричневый", "#a5713f", "второй вывод на GND, подтяжка в прошивке"],
    ],
  },
  {
    group: "Питание терминала",
    rows: [
      ["Блок питания 5V ⎓ 2A", "ESP32 · micro-USB", "—", "", "питает весь терминал целиком"],
      ["Батарейка CR1220", "держатель DS3231", "—", "", "часы идут даже при отключении питания"],
    ],
  },
];

function Schematic() {
  const wire = "flow-line";
  return (
    <svg viewBox="0 0 780 430" className="w-full" role="img" aria-label="Схема подключения ESP32, RC522, DS3231, светодиодов, зуммера и кнопки">
      {/* шина GND */}
      <line x1="60" y1="398" x2="720" y2="398" stroke="#45805f" strokeWidth="2" strokeDasharray="2 5" />
      <text x="60" y="416" fill="#74a88c" fontSize="11" fontFamily="JetBrains Mono, monospace">GND-ШИНА</text>

      {/* ESP32 */}
      <rect x="310" y="120" width="170" height="250" rx="6" fill="#122419" stroke="#45805f" strokeWidth="1.6" />
      <rect x="368" y="96" width="54" height="30" rx="3" fill="#1a3527" stroke="#45805f" />
      <text x="395" y="115" textAnchor="middle" fill="#74a88c" fontSize="9" fontFamily="JetBrains Mono, monospace">USB</text>
      <text x="395" y="230" textAnchor="middle" fill="#d7e6dc" fontSize="17" fontWeight="bold" fontFamily="Unbounded, sans-serif">ESP32</text>
      <text x="395" y="252" textAnchor="middle" fill="#74a88c" fontSize="11" fontFamily="JetBrains Mono, monospace">DevKit V1</text>
      {[
        ["3V3", 150], ["21 SDA", 185], ["22 SCL", 220], ["33 BTN", 255], ["GND", 290],
      ].map(([t, y]) => (
        <g key={t as string}>
          <line x1="284" y1={y as number} x2="310" y2={y as number} stroke="#45805f" strokeWidth="1.4" />
          <circle cx="284" cy={y as number} r="3" fill="#45805f" />
          <text x="318" y={(y as number) + 4} fill="#aacdb8" fontSize="10.5" fontFamily="JetBrains Mono, monospace">{t}</text>
        </g>
      ))}
      {[
        ["5 SS", 150], ["18 SCK", 185], ["23 MOSI", 220], ["19 MISO", 255], ["27 RST", 290],
      ].map(([t, y]) => (
        <g key={t as string}>
          <line x1="480" y1={y as number} x2="506" y2={y as number} stroke="#45805f" strokeWidth="1.4" />
          <circle cx="506" cy={y as number} r="3" fill="#45805f" />
          <text x="472" y={(y as number) + 4} textAnchor="end" fill="#aacdb8" fontSize="10.5" fontFamily="JetBrains Mono, monospace">{t}</text>
        </g>
      ))}

      {/* RC522 */}
      <rect x="590" y="130" width="150" height="180" rx="6" fill="#122419" stroke="#e5a95f" strokeWidth="1.6" />
      <circle cx="665" cy="205" r="34" fill="none" stroke="#d18a3e" strokeWidth="1.6" />
      <circle cx="665" cy="205" r="20" fill="none" stroke="#d18a3e" strokeWidth="1.2" opacity="0.7" />
      <circle cx="665" cy="205" r="6" fill="#d18a3e" opacity="0.55" />
      <text x="665" y="278" textAnchor="middle" fill="#d7e6dc" fontSize="14" fontWeight="bold" fontFamily="Unbounded, sans-serif">RC522</text>
      <text x="665" y="296" textAnchor="middle" fill="#74a88c" fontSize="10" fontFamily="JetBrains Mono, monospace">13.56 МГц</text>
      {[150, 185, 220, 255, 290].map((y, i) => (
        <path key={y} d={`M506 ${y} H ${540 + i * 8} V ${150 + i * 30} H590`} className={wire} fill="none" stroke="#e5a95f" strokeWidth="1.4" opacity="0.85" />
      ))}

      {/* DS3231 */}
      <rect x="60" y="150" width="150" height="120" rx="6" fill="#122419" stroke="#45805f" strokeWidth="1.6" />
      <circle cx="95" cy="185" r="13" fill="none" stroke="#74a88c" strokeWidth="1.4" />
      <text x="95" y="189" textAnchor="middle" fill="#74a88c" fontSize="8" fontFamily="JetBrains Mono, monospace">CR1220</text>
      <text x="135" y="230" textAnchor="middle" fill="#d7e6dc" fontSize="13" fontWeight="bold" fontFamily="Unbounded, sans-serif">DS3231</text>
      <text x="135" y="248" textAnchor="middle" fill="#74a88c" fontSize="10" fontFamily="JetBrains Mono, monospace">RTC · I²C</text>
      <path d="M210 185 H 250 V 185 H284" className={wire} fill="none" stroke="#45805f" strokeWidth="1.4" />
      <path d="M210 220 H 262 V 220 H284" className={wire} fill="none" stroke="#45805f" strokeWidth="1.4" />

      {/* верхняя периферия */}
      {[
        { x: 200, label: "LED ЗЕЛ → 26", sym: "led-g" },
        { x: 300, label: "LED КРАСН → 25", sym: "led-r" },
        { x: 420, label: "ЗУММЕР → 32", sym: "buzz" },
        { x: 540, label: "КНОПКА → 33", sym: "btn" },
      ].map((c) => (
        <g key={c.label}>
          <line x1={c.x} y1="92" x2={c.x} y2="120" className={wire} stroke="#e5a95f" strokeWidth="1.3" opacity="0.75" />
          {c.sym === "led-g" && <><polygon points={`${c.x - 8},58 ${c.x + 8},58 ${c.x},76`} fill="none" stroke="#45e08f" strokeWidth="1.6" /><line x1={c.x - 9} y1="76" x2={c.x + 9} y2="76" stroke="#45e08f" strokeWidth="1.6" /><line x1={c.x} y1="76" x2={c.x} y2="92" stroke="#45e08f" strokeWidth="1.3" /></>}
          {c.sym === "led-r" && <><polygon points={`${c.x - 8},58 ${c.x + 8},58 ${c.x},76`} fill="none" stroke="#ff5d5d" strokeWidth="1.6" /><line x1={c.x - 9} y1="76" x2={c.x + 9} y2="76" stroke="#ff5d5d" strokeWidth="1.6" /><line x1={c.x} y1="76" x2={c.x} y2="92" stroke="#ff5d5d" strokeWidth="1.3" /></>}
          {c.sym === "buzz" && <><circle cx={c.x} cy="68" r="13" fill="none" stroke="#e5a95f" strokeWidth="1.6" /><circle cx={c.x} cy="68" r="3.5" fill="#e5a95f" /><line x1={c.x} y1="81" x2={c.x} y2="92" stroke="#e5a95f" strokeWidth="1.3" /></>}
          {c.sym === "btn" && <><line x1={c.x - 12} y1="76" x2={c.x - 4} y2="76" stroke="#aacdb8" strokeWidth="1.6" /><line x1={c.x + 4} y1="76" x2={c.x + 12} y2="76" stroke="#aacdb8" strokeWidth="1.6" /><line x1={c.x - 5} y1="76" x2={c.x + 4} y2="64" stroke="#aacdb8" strokeWidth="1.6" /><line x1={c.x} y1="76" x2={c.x} y2="92" stroke="#aacdb8" strokeWidth="1.3" /></>}
          <text x={c.x} y="44" textAnchor="middle" fill="#aacdb8" fontSize="10" fontFamily="JetBrains Mono, monospace">{c.label}</text>
        </g>
      ))}

      {/* подписи шин питания */}
      <text x="300" y="143" fill="#74a88c" fontSize="10" fontFamily="JetBrains Mono, monospace">3V3</text>
      <text x="300" y="283" fill="#74a88c" fontSize="10" fontFamily="JetBrains Mono, monospace">GND</text>
    </svg>
  );
}

/* ---------- общая архитектура проекта ---------- */
function SystemSchematic() {
  const flow = "flow-line";
  const mono = { fontFamily: "JetBrains Mono, monospace" } as const;
  const disp = { fontFamily: "Unbounded, sans-serif" } as const;

  const Terminal = ({ x, num, name, locId }: { x: number; num: string; name: string; locId: string }) => (
    <g>
      <rect x={x} y={205} width={250} height={150} rx={6} fill="#122419" stroke="#e5a95f" strokeWidth="1.6" />
      <text x={x + 125} y={228} textAnchor="middle" fill="#e5a95f" fontSize="11" style={mono}>
        ТЕРМИНАЛ {num} · LOCATION_ID = {locId}
      </text>
      {/* ESP32 */}
      <rect x={x + 18} y={245} width={72} height={88} rx={4} fill="#1a3527" stroke="#45805f" strokeWidth="1.3" />
      <text x={x + 54} y={286} textAnchor="middle" fill="#d7e6dc" fontSize="11" fontWeight="bold" style={disp}>ESP32</text>
      <text x={x + 54} y={302} textAnchor="middle" fill="#74a88c" fontSize="8.5" style={mono}>журнал · Wi-Fi</text>
      {/* RC522 с пульсацией */}
      <circle cx={x + 155} cy={288} r={34} fill="none" stroke="#d18a3e" strokeWidth="1.6" />
      <circle cx={x + 155} cy={288} r={20} fill="none" stroke="#d18a3e" strokeWidth="1.1" opacity="0.7" />
      <circle cx={x + 155} cy={288} r={6} fill="#d18a3e" opacity="0.6" />
      <circle cx={x + 155} cy={288} r={34} fill="none" stroke="#d18a3e" strokeWidth="1.2">
        <animate attributeName="r" values="34;52" dur="1.7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0" dur="1.7s" repeatCount="indefinite" />
      </circle>
      <text x={x + 155} y={333} textAnchor="middle" fill="#74a88c" fontSize="8.5" style={mono}>RC522 · 13.56 МГц</text>
      {/* DS3231 + LEDs + buzzer */}
      <rect x={x + 208} y={245} width={26} height={34} rx={3} fill="#1a3527" stroke="#45805f" strokeWidth="1.1" />
      <text x={x + 221} y={266} textAnchor="middle" fill="#74a88c" fontSize="6.5" style={mono}>DS3231</text>
      <circle cx={x + 213} cy={298} r={4.5} fill="#45e08f">
        <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={x + 229} cy={298} r={4.5} fill="#5a2323" />
      <circle cx={x + 221} cy={316} r={7} fill="none" stroke="#e5a95f" strokeWidth="1.2" />
      <circle cx={x + 221} cy={316} r={2} fill="#e5a95f" />
    </g>
  );

  const Guest = ({ x, flip = false }: { x: number; flip?: boolean }) => (
    <g transform={flip ? `translate(${x},0) scale(-1,1)` : `translate(${x},0)`}>
      <circle cx={0} cy={252} r={10} fill="none" stroke="#aacdb8" strokeWidth="1.6" />
      <path d="M-12 296 q0 -26 12 -26 q12 0 12 26" fill="none" stroke="#aacdb8" strokeWidth="1.6" />
      <rect x={16} y={262} width={26} height={18} rx={2} fill="#122419" stroke="#e5a95f" strokeWidth="1.4" />
      <path d="M20 268 h18 M20 273 h12" stroke="#e5a95f" strokeWidth="1" />
      <text x={3} y={314} textAnchor="middle" fill="#74a88c" fontSize="8.5" style={mono} transform={flip ? "scale(-1,1)" : undefined}>
        {flip ? "" : "гость с картой"}
      </text>
    </g>
  );

  return (
    <svg viewBox="0 0 960 470" className="w-full" role="img" aria-label="Архитектура проекта: ресепшен, два терминала, Wi-Fi роутер и компьютер с отчётами">
      {/* ---- линии данных: терминалы <-> роутер ---- */}
      <path d="M448 92 C 380 140 320 165 250 205" className={flow} fill="none" stroke="#e5a95f" strokeWidth="1.6" opacity="0.9" />
      <path d="M512 92 C 580 140 640 165 710 205" className={flow} fill="none" stroke="#e5a95f" strokeWidth="1.6" opacity="0.9" />
      {/* ---- роутер -> компьютер отчётов ---- */}
      <path d="M540 70 C 700 84 820 200 828 392" className={flow} fill="none" stroke="#e5a95f" strokeWidth="1.6" opacity="0.9" />
      <text x="770" y="250" fill="#e5a95f" fontSize="10" style={mono} transform="rotate(58 770 250)">visits.csv</text>
      {/* ---- маршруты гостей ---- */}
      <path d="M196 392 L196 359" stroke="#74a88c" strokeWidth="1.4" strokeDasharray="3 5" markerEnd="url(#arr)" />
      <path d="M296 418 C 480 440 560 400 628 359" stroke="#74a88c" strokeWidth="1.4" strokeDasharray="3 5" fill="none" markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#74a88c" />
        </marker>
      </defs>
      {/* ---- питание ---- */}
      <g>
        <rect x="66" y="372" width="70" height="30" rx="3" fill="#122419" stroke="#d18a3e" strokeWidth="1.3" />
        <text x="101" y="391" textAnchor="middle" fill="#d18a3e" fontSize="8.5" style={mono}>5V ⎓ 2A</text>
        <path d="M136 380 C 160 376 168 366 172 355" className={flow} fill="none" stroke="#d18a3e" strokeWidth="1.4" opacity="0.85" />
      </g>
      <g>
        <rect x="556" y="372" width="70" height="30" rx="3" fill="#122419" stroke="#d18a3e" strokeWidth="1.3" />
        <text x="591" y="391" textAnchor="middle" fill="#d18a3e" fontSize="8.5" style={mono}>5V ⎓ 2A</text>
        <path d="M626 380 C 650 376 658 366 662 355" className={flow} fill="none" stroke="#d18a3e" strokeWidth="1.4" opacity="0.85" />
      </g>

      {/* ---- Wi-Fi роутер ---- */}
      <g>
        <rect x="430" y="36" width="100" height="52" rx="5" fill="#122419" stroke="#45805f" strokeWidth="1.6" />
        <line x1="455" y1="36" x2="447" y2="14" stroke="#45805f" strokeWidth="1.6" />
        <line x1="505" y1="36" x2="513" y2="14" stroke="#45805f" strokeWidth="1.6" />
        <circle cx="447" cy="13" r="2.4" fill="#45e08f">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="513" cy="13" r="2.4" fill="#45e08f">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" repeatCount="indefinite" />
        </circle>
        <text x="480" y="58" textAnchor="middle" fill="#d7e6dc" fontSize="11" fontWeight="bold" style={disp}>WI-FI</text>
        <text x="480" y="76" textAnchor="middle" fill="#74a88c" fontSize="8.5" style={mono}>роутер отеля</text>
      </g>

      {/* ---- терминалы ---- */}
      <Terminal x={95} num="1" name="Столовая" locId="1" />
      <Terminal x={615} num="2" name="Ресторан" locId="2" />
      <text x="220" y="196" textAnchor="middle" fill="#d7e6dc" fontSize="13" fontWeight="bold" style={disp}>СТОЛОВАЯ</text>
      <text x="740" y="196" textAnchor="middle" fill="#d7e6dc" fontSize="13" fontWeight="bold" style={disp}>РЕСТОРАН</text>

      {/* ---- гости ---- */}
      <Guest x={52} />
      <Guest x={908} flip />

      {/* ---- ресепшен ---- */}
      <g>
        <rect x="96" y="392" width="200" height="52" rx="5" fill="#122419" stroke="#45805f" strokeWidth="1.6" />
        <rect x="116" y="404" width="30" height="21" rx="2" fill="none" stroke="#e5a95f" strokeWidth="1.3" />
        <rect x="122" y="409" width="30" height="21" rx="2" fill="#122419" stroke="#e5a95f" strokeWidth="1.3" />
        <text x="212" y="415" textAnchor="middle" fill="#d7e6dc" fontSize="11" fontWeight="bold" style={disp}>РЕСЕПШЕН</text>
        <text x="212" y="431" textAnchor="middle" fill="#74a88c" fontSize="8.5" style={mono}>выдача карт · кнопка регистрации</text>
      </g>

      {/* ---- компьютер отчётов ---- */}
      <g>
        <rect x="728" y="392" width="200" height="52" rx="5" fill="#122419" stroke="#45805f" strokeWidth="1.6" />
        <rect x="746" y="402" width="30" height="20" rx="2" fill="none" stroke="#45e08f" strokeWidth="1.3" />
        <line x1="740" y1="428" x2="782" y2="428" stroke="#45e08f" strokeWidth="1.6" />
        <text x="858" y="415" textAnchor="middle" fill="#d7e6dc" fontSize="11" fontWeight="bold" style={disp}>ОТЧЁТЫ</text>
        <text x="858" y="431" textAnchor="middle" fill="#74a88c" fontSize="8.5" style={mono}>браузер · HTML / TXT за период</text>
      </g>
    </svg>
  );
}

export function WiringSection() {
  return (
    <section id="wiring" className="border-y border-ink-900/10 bg-paper-50 py-20 text-ink-900 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          light
          num="03"
          title="Схема подключения всего проекта"
          sub="Два одинаковых терминала (столовая и ресторан) плюс общий Wi-Fi для сбора отчётов. Разница между терминалами — одна строка прошивки LOCATION_ID."
        />

        {/* -------- уровень 1: архитектура проекта -------- */}
        <Reveal>
          <div className="pcb-bg border border-pine-600 bg-pine-900 p-5 md:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <span className="font-display text-xs font-bold uppercase tracking-widest text-copper-400">
                Архитектура проекта
              </span>
              <span className="flex flex-wrap items-center gap-4 font-mono text-[10px] text-pine-300">
                <span className="flex items-center gap-1.5">
                  <svg width="26" height="6"><line x1="0" y1="3" x2="26" y2="3" stroke="#e5a95f" strokeWidth="2" strokeDasharray="5 4" /></svg>
                  данные (Wi-Fi)
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="26" height="6"><line x1="0" y1="3" x2="26" y2="3" stroke="#74a88c" strokeWidth="2" strokeDasharray="2 4" /></svg>
                  путь гостя
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="26" height="6"><line x1="0" y1="3" x2="26" y2="3" stroke="#d18a3e" strokeWidth="2" /></svg>
                  питание 5V
                </span>
              </span>
            </div>
            <SystemSchematic />
            <p className="mt-4 border-t border-pine-700 pt-3 text-[12.5px] leading-relaxed text-pine-300">
              Ресепшен выдаёт гостю карту Mifare Classic 1K и регистрирует её кнопкой на любом терминале. Гость прикладывает
              карту у входа в столовую или ресторан — терминал решает, первый ли это визит в периоде. Оба терминала пишут
              журнал в свою память и отдают файл <code className="font-mono text-copper-300">visits.csv</code> по Wi-Fi —
              с компьютера администратора файлы сливаются в один отчёт за любой период.
            </p>
          </div>
        </Reveal>

        {/* -------- уровень 2: клеммы одного терминала -------- */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <div className="pcb-bg h-full border border-pine-600 bg-pine-900 p-5 md:p-7">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-xs font-bold uppercase tracking-widest text-copper-400">
                  Клеммы одного терминала · × 2 шт
                </span>
                <span className="flex items-center gap-4 font-mono text-[10px] text-pine-300">
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-copper-400" /> SPI</span>
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-pine-400" /> I²C / GND</span>
                </span>
              </div>
              <Schematic />
            </div>
          </Reveal>

          {/* монтажная ведомость */}
          <div className="grid content-start gap-4">
            {WIRE_ROWS.map((g, gi) => (
              <Reveal key={g.group} delay={gi * 70}>
                <div className="border border-ink-900/15 bg-white/70">
                  <div className="flex items-center justify-between border-b border-ink-900/10 px-4 py-2">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-copper-600">{g.group}</span>
                    <span className="font-mono text-[10px] text-ink-500">{g.rows.length} проводов</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r[0]} className="rtable border-b border-ink-900/8 last:border-0 hover:bg-copper-500/5">
                          <td className="px-4 py-2 font-medium">{r[0]}</td>
                          <td className="px-2 py-2 font-mono text-[12px] font-bold text-copper-600">{r[1]}</td>
                          <td className="px-2 py-2">
                            <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-500">
                              {r[3] ? <span className="inline-block h-3 w-3 border border-ink-900/20" style={{ background: r[3] }} /> : <span className="text-ink-500/50">—</span>}
                              {r[2]}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-[11.5px] text-ink-500">{r[4]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* -------- уровень 3: питание / сеть / монтаж -------- */}
        <div className="mt-6 grid gap-4 md:grid-cols-[1.35fr_1fr_1fr]">
          <Reveal delay={40}>
            <div className="h-full border-l-4 border-amberled bg-white/70 p-5">
              <h3 className="font-display text-xs font-bold uppercase tracking-widest text-copper-600">Питание</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
                <li>Каждый терминал питается от блока <b>5V ⎓ 2A</b> через micro-USB ESP32 — этого хватает на всю периферию.</li>
                <li>RC522 берёт <b>3.3V</b> с пина 3V3 платы — от 5V модуль выходит из строя.</li>
                <li>Все GND объединяются в одну шину. DS3231 держит время от батарейки CR1220.</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={110}>
            <div className="h-full border-l-4 border-pine-500 bg-white/70 p-5">
              <h3 className="font-display text-xs font-bold uppercase tracking-widest text-copper-600">Сеть и адреса</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
                <li>SSID и пароль отеля — в начале прошивки. IP терминала печатается в мониторе порта при старте.</li>
                <li>Без роутера терминал поднимает точку доступа <b>TALON-32</b> (пароль 12345678), адрес 192.168.4.1.</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <div className="h-full border-l-4 border-copper-500 bg-white/70 p-5">
              <h3 className="font-display text-xs font-bold uppercase tracking-widest text-copper-600">Монтаж</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
                <li>Для постоянной работы — пайка вместо макетной платы, корпус с окном под антенну RC522.</li>
                <li>Карту подносят к центру антенны на 2–4 см — считывание занимает меньше секунды.</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   05 · ИНСТРУКЦИЯ ПО ЗАПУСКУ
   ============================================================ */
const STEPS: { t: string; d: string; code?: string }[] = [
  {
    t: "Подготовьте Arduino IDE",
    d: "Установите Arduino IDE 2.x. В «Файл → Настройки» добавьте в поле «Дополнительные ссылки для Менеджера плат» адрес ниже, затем в Менеджере плат установите пакет «esp32» от Espressif.",
    code: "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json",
  },
  {
    t: "Установите две библиотеки",
    d: "«Инструменты → Управлять библиотеками»: найдите и установите MFRC522 (автор GitHubCommunity) и RTClib (автор Adafruit).",
  },
  {
    t: "Соберите терминалы",
    d: "Смонтируйте два одинаковых устройства по таблице подключения: одно для столовой, второе для ресторана. RC522 питайте только от 3.3V.",
  },
  {
    t: "Установите часы DS3231 (один раз)",
    d: "Прошейте каждый терминал скетчем rtc_set.ino — часы установятся на дату компиляции и дальше будут идти от батарейки даже без питания.",
  },
  {
    t: "Настройте и прошейте основную прошивку",
    d: "Откройте talon32_control.ino. Для терминала столовой оставьте LOCATION_ID 1, для ресторана поставьте 2. Укажите SSID и пароль Wi-Fi отеля. Плата: «ESP32 Dev Module» → Загрузка.",
    code: "#define LOCATION_ID   2     // 1 = СТОЛОВАЯ, 2 = РЕСТОРАН",
  },
  {
    t: "Проверьте в мониторе порта",
    d: "Скорость 115200. При старте терминал напечатает место, время DS3231 и свой IP-адрес. Приложите любую карту — увидите строку OK или REJECT_ALREADY.",
  },
  {
    t: "Зарегистрируйте карты гостей",
    d: "Коротко нажмите кнопку на терминале — зелёная лампа замигает (режим регистрации). Прикладывайте карты по одной: каждой присвоится ID 1001, 1002, … Записывайте соответствие «UID карты — гость» в журнал заселения. Длинные карты выдачи — там же, у ресепшен.",
  },
  {
    t: "Снимайте отчёты",
    d: "В браузере откройте IP-адрес терминала (виден в мониторе порта) и нажмите «Скачать visits.csv». Сделайте так для обоих терминалов, загрузите файлы в раздел «Отчёты» на этой странице, выберите период — получите HTML или TXT.",
  },
];

const FAQ = [
  {
    q: "Считыватель не видит карты",
    a: "Проверьте питание RC522 — строго 3.3V, не 5V. Провода SPI: SDA→5, SCK→18, MOSI→23, MISO→19, RST→27. В мониторе порта должна печататься версия чипа. Карта должна лежать вплотную к антенне — у RC522 радиус 2–4 см.",
  },
  {
    q: "«ERROR: ошибка записи на карту»",
    a: "Карта не Mifare Classic 1K (NTAG, Ultralight, DESFire не поддерживают запись блока по ключу) либо защищена от записи. Возьмите карту из пачки Mifare Classic S50 — они пишутся стандартным ключом FF FF FF FF FF FF, который использует прошивка.",
  },
  {
    q: "Время сбрасывается / терминал пишет про обесточивание",
    a: "На модуле DS3231 села или отсутствует батарейка CR1220 (дешёвые модули иногда идут без неё). Замените батарейку и заново выполните шаг с rtc_set.ino.",
  },
  {
    q: "Зуммер молчит или пищит в одну ноту",
    a: "Прошивка рассчитана на пассивный пьезоизлучатель (без встроенного генератора) — он играет разные тона. Активный тоже будет работать, но все сигналы прозвучат одной нотой. Контакт — GPIO32.",
  },
  {
    q: "Не открывается страница терминала",
    a: "Компьютер и терминал должны быть в одной Wi-Fi сети; адрес виден в мониторе порта при старте. Если роутера нет, терминал поднимает точку доступа TALON-32 (пароль 12345678), адрес — http://192.168.4.1.",
  },
];

export function GuideSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="guide" className="border-y border-ink-900/10 bg-paper-50 py-20 text-ink-900 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          light
          num="05"
          title="Запуск за 8 шагов"
          sub="От распаковки деталей до первого отчёта. На каждый терминал — примерно час неспешной работы."
        />
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.t} delay={i * 50}>
                <div className="group flex gap-4 border border-ink-900/15 bg-white/60 p-4 transition-all duration-200 hover:border-copper-500/60 hover:bg-white md:p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-copper-600/50 font-display text-sm font-bold text-copper-600 transition-colors duration-200 group-hover:bg-copper-500 group-hover:text-paper-50">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[13.5px] font-bold uppercase tracking-wide md:text-sm">{s.t}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{s.d}</p>
                    {s.code && (
                      <pre className="nice-scroll mt-2.5 overflow-x-auto border border-ink-900/10 bg-pine-900 px-3 py-2 font-mono text-[11.5px] text-copper-300">
                        {s.code}
                      </pre>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div>
            <Reveal delay={150}>
              <div className="border border-ink-900/15 bg-white/60">
                <div className="flex items-center gap-2 border-b border-ink-900/10 px-5 py-3">
                  <IconAlert className="h-4 w-4 text-copper-600" />
                  <span className="font-display text-xs font-bold uppercase tracking-widest text-copper-600">
                    Если что-то пошло не так
                  </span>
                </div>
                <div>
                  {FAQ.map((f, i) => (
                    <div key={f.q} className="border-b border-ink-900/8 last:border-0">
                      <button
                        onClick={() => setOpen(open === i ? null : i)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-semibold transition-colors hover:bg-copper-500/5"
                      >
                        {f.q}
                        <span
                          className={`shrink-0 font-mono text-copper-600 transition-transform duration-200 ${open === i ? "rotate-45" : ""}`}
                        >
                          +
                        </span>
                      </button>
                      {open === i && (
                        <p className="px-5 pb-4 text-sm leading-relaxed text-ink-700">{f.a}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-4 flex items-start gap-3 border border-pine-600 bg-pine-900 px-5 py-4 text-sm text-pine-200">
                <IconWifi className="mt-0.5 h-5 w-5 shrink-0 text-copper-400" />
                <p>
                  Формат журнала терминала:{" "}
                  <code className="font-mono text-[11px] text-copper-300">
                    2026-02-14 09:12:44;04:A8:53:2E;1003;BREAKFAST;STOLOVAYA;OK;вход разрешён
                  </code>
                  <br />
                  Раздел «Отчёты» понимает этот CSV как есть — файлы двух терминалов можно просто вставить друг за другом.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* переиспользуемые иконки для шапки hero */
export const HeroIcons = { IconChip, IconWifi, IconCard };
