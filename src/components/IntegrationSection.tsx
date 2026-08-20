import { Reveal, SectionHead, IconAlert, IconArrowR, IconCard, IconChip, IconWifi } from "./ui";

/* ============================================================
   06 · ИНТЕГРАЦИЯ С «САНАТОРИУМ» (sanatorium-is.ru)
   ============================================================ */

const FACTS = [
  {
    wide: true,
    icon: IconCard,
    tag: "Ключевой факт",
    title: "Сценарий уже описан в их модуле «Питание»",
    text: "На сайте «Санаториум» буквально сказано: «Вход в столовую/ресторан по карте от номера или RFID-браслет. Карта прикладывается к считывающему устройству турникета или планшета менеджера ресторана». TALON-32 — это как раз недорогое автономное «считывающее устройство» для этого сценария: два терминала на входах, лампа, зуммер, журнал.",
  },
  {
    icon: IconChip,
    tag: "RFID",
    title: "Браслет — единый идентификатор гостя",
    text: "Карта в «Санаториум» — это ключ от номера, пропуск на процедуры и средство оплаты, привязанное к счёту. Терминалам TALON-32 не нужны свои карты: они работают с тем же браслетом.",
  },
  {
    icon: IconWifi,
    tag: "Интеграции",
    title: "80+ готовых стыков и ресторанные системы",
    text: "У вендора есть интеграции с iiko и r-keeper, замковыми системами (CISA, Kaba, Iron Logic, Onity…), 1С:Бухгалтерией, ЕГИСЗ. Плюс заявлена готовность к «персонализации продукта» силами их внедренцев.",
  },
];

const LEVELS = [
  {
    num: "L0",
    name: "Автономный режим",
    effort: 0,
    effortLabel: "готово сегодня",
    who: "вы сами",
    text: "Терминалы TALON-32 работают независимо: правило «одно посещение за период», журнал visits.csv, отчёты на этой странице. Подходит для пилота на одном объекте или маленького пансионата без «Санаториум».",
  },
  {
    num: "L1",
    name: "Файловый мост (CSV ⇄ Excel)",
    effort: 3,
    effortLabel: "1–2 дня, без вендора",
    who: "системный администратор",
    text: "«Санаториум» выгружает список проживающих с UID карт и планом питания (Excel); скрипт на ПК раз в 15 минут забирает visits.csv с обоих терминалов и загружает события в «Санаториум» через его импорт из Excel или блок «Бюро пропусков». Пакетная синхронизация, нулевая зависимость от API.",
  },
  {
    num: "L2",
    name: "REST-синхронизация (доработка прошивки)",
    effort: 6,
    effortLabel: "≈ неделя, мини-сервис на стороне отеля",
    who: "программист + внедренцы",
    text: "В прошивку добавляется HTTPClient: каждое событие улетает POST-запросом, а список гостей и их план питания терминал получает сам и хранит в LittleFS. Решения терминал по-прежнему принимает локально — сеть может падать, контроль доступа не останавливается.",
  },
  {
    num: "L3",
    name: "Нативный модуль «Санаториум»",
    effort: 9,
    effortLabel: "через вендора (integracii@ или демо-звонок)",
    who: "вендор + вы",
    text: "Вендор официально берёт терминалы TALON-32 в свой список из 80+ интеграций, как берёт замковые системы: единый справочник гостей, диета из медкарты влияет на допуск, события сразу в 300+ отчётах. Это их типовая услуга — «персонализация продукта под объект».",
  },
];

const DATA_OWNERSHIP = [
  ["Справочник гостей и заселения", "«Санаториум»", "→ на терминалы (UID карты, ID гостя, даты проживания)"],
  ["План питания (диета, включено ли питание в путёвку)", "«Санаториум»", "→ на терминалы (кого пускать, по какой диете рассадка)"],
  ["Факт и время входа: кто, когда, куда", "ТАЛОН-32", "→ в «Санаториум» (события OK / ALREADY / TIME)"],
  ["Правило «один вход за период»", "ТАЛОН-32", "работает автономно, хранится на самой карте гостя"],
  ["Сводные отчёты, биллинг, ЕГИСЗ", "«Санаториум»", "получает сырые события и строит свою аналитику"],
];

const EVENT_JSON = `{
  "terminal":  "STOLOVAYA",        // или RESTORAN
  "fw":        "1.2.0",
  "datetime":  "2026-02-14T09:12:44+03:00",
  "uid":       "04A8532E",        // UID карты/браслета гостя
  "guest_id":  1003,              // ID гостя из «Санаториум»
  "slot":      "BREAKFAST",       // BREAKFAST | LUNCH | DINNER
  "result":    "OK"               // OK | ALREADY | TIME
}`;

function ArchDiagram() {
  const wire = "flow-line";
  return (
    <svg viewBox="0 0 860 470" className="w-full" role="img" aria-label="Архитектура интеграции: Санаториум, локальная сеть, терминалы ТАЛОН-32, поток карт и событий">
      {/* «Санаториум» — сервер */}
      <rect x="300" y="26" width="260" height="92" rx="6" fill="#0e1d16" stroke="#e5a95f" strokeWidth="1.6" />
      <rect x="300" y="26" width="6" height="92" fill="#d18a3e" />
      <text x="330" y="58" fill="#d7e6dc" fontSize="17" fontWeight="bold" fontFamily="Unbounded, sans-serif">«САНАТОРИУМ»</text>
      <text x="330" y="78" fill="#aacdb8" fontSize="10.5" fontFamily="JetBrains Mono, monospace">PMS: гости · диеты · отчёты · ЕГИСЗ</text>
      <text x="330" y="96" fill="#74a88c" fontSize="10.5" fontFamily="JetBrains Mono, monospace">iiko / r-keeper · 80+ интеграций</text>

      {/* локальная сеть */}
      <line x1="430" y1="118" x2="430" y2="168" className={wire} stroke="#e5a95f" strokeWidth="1.6" opacity="0.9" />
      <rect x="250" y="168" width="360" height="46" rx="4" fill="#122419" stroke="#45805f" strokeWidth="1.4" />
      <text x="430" y="188" textAnchor="middle" fill="#aacdb8" fontSize="11" fontFamily="JetBrains Mono, monospace">Wi-Fi / LAN отеля</text>
      <text x="430" y="203" textAnchor="middle" fill="#55705e" fontSize="9.5" fontFamily="JetBrains Mono, monospace">гости вниз · события вверх (REST или CSV)</text>

      {/* ПК синхронизации */}
      <line x1="610" y1="191" x2="680" y2="191" stroke="#45805f" strokeWidth="1.4" strokeDasharray="2 4" />
      <rect x="680" y="160" width="150" height="62" rx="4" fill="#0e1d16" stroke="#45805f" strokeWidth="1.4" />
      <text x="755" y="186" textAnchor="middle" fill="#d7e6dc" fontSize="11" fontFamily="JetBrains Mono, monospace">ПК: синк-скрипт</text>
      <text x="755" y="203" textAnchor="middle" fill="#55705e" fontSize="9.5" fontFamily="JetBrains Mono, monospace">visits.csv ⇄ импорт</text>

      {/* к терминалам */}
      <line x1="330" y1="214" x2="200" y2="278" className={wire} stroke="#e5a95f" strokeWidth="1.4" opacity="0.85" />
      <line x1="530" y1="214" x2="640" y2="278" className={wire} stroke="#e5a95f" strokeWidth="1.4" opacity="0.85" />

      {/* терминал 1 */}
      <rect x="90" y="278" width="220" height="118" rx="6" fill="#122419" stroke="#45805f" strokeWidth="1.6" />
      <circle cx="120" cy="308" r="5" fill="#45e08f" />
      <text x="135" y="312" fill="#d7e6dc" fontSize="13" fontWeight="bold" fontFamily="Unbounded, sans-serif">ТЕРМИНАЛ · СТОЛОВАЯ</text>
      <text x="110" y="336" fill="#aacdb8" fontSize="10.5" fontFamily="JetBrains Mono, monospace">ESP32 + RC522 + DS3231</text>
      <text x="110" y="354" fill="#74a88c" fontSize="10.5" fontFamily="JetBrains Mono, monospace">лампа · зуммер · журнал</text>
      <text x="110" y="378" fill="#55705e" fontSize="9.5" fontFamily="JetBrains Mono, monospace">решение принимает ЛОКАЛЬНО</text>

      {/* терминал 2 */}
      <rect x="550" y="278" width="220" height="118" rx="6" fill="#122419" stroke="#45805f" strokeWidth="1.6" />
      <circle cx="580" cy="308" r="5" fill="#45e08f" />
      <text x="595" y="312" fill="#d7e6dc" fontSize="13" fontWeight="bold" fontFamily="Unbounded, sans-serif">ТЕРМИНАЛ · РЕСТОРАН</text>
      <text x="570" y="336" fill="#aacdb8" fontSize="10.5" fontFamily="JetBrains Mono, monospace">ESP32 + RC522 + DS3231</text>
      <text x="570" y="354" fill="#74a88c" fontSize="10.5" fontFamily="JetBrains Mono, monospace">лампа · зуммер · журнал</text>
      <text x="570" y="378" fill="#55705e" fontSize="9.5" fontFamily="JetBrains Mono, monospace">решение принимает ЛОКАЛЬНО</text>

      {/* обмен между терминалами — через карту */}
      <path d="M310 340 C 380 322, 480 322, 550 340" className={wire} fill="none" stroke="#d18a3e" strokeWidth="1.5" opacity="0.9" />
      <text x="430" y="318" textAnchor="middle" fill="#e5a95f" fontSize="10" fontFamily="JetBrains Mono, monospace">посещение передаётся НА КАРТЕ гостя</text>

      {/* гость с браслетом */}
      <g>
        <circle cx="430" cy="428" r="22" fill="#1a3527" stroke="#e5a95f" strokeWidth="1.4" />
        <circle cx="430" cy="421" r="7" fill="none" stroke="#aacdb8" strokeWidth="1.4" />
        <path d="M417 442 a13 10 0 0 1 26 0" fill="none" stroke="#aacdb8" strokeWidth="1.4" />
        <ellipse cx="444" cy="436" rx="7" ry="4" fill="none" stroke="#d18a3e" strokeWidth="1.6" />
        <text x="430" y="466" textAnchor="middle" fill="#aacdb8" fontSize="10.5" fontFamily="JetBrains Mono, monospace">гость с RFID-браслетом «Санаториум»</text>
      </g>
      <path d="M408 420 C 340 415, 300 405, 285 398" fill="none" stroke="#45805f" strokeWidth="1.2" strokeDasharray="2 4" />
      <path d="M452 420 C 520 415, 560 405, 575 398" fill="none" stroke="#45805f" strokeWidth="1.2" strokeDasharray="2 4" />

      {/* стрелки-подписи потоков */}
      <text x="160" y="252" fill="#45e08f" fontSize="9.5" fontFamily="JetBrains Mono, monospace">события ↑</text>
      <text x="610" y="252" fill="#45e08f" fontSize="9.5" fontFamily="JetBrains Mono, monospace">события ↑</text>
    </svg>
  );
}

export default function IntegrationSection() {
  return (
    <section id="sanatorium" className="grid-bg border-y border-pine-700 bg-pine-950 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          num="06"
          title="Интеграция с «Санаториум»"
          sub="Анализ совместимости с системой автоматизации sanatorium-is.ru. Короткий ответ — да, и это очень органичное соединение: вендор сам описывает наш сценарий в своём модуле «Питание»."
        />

        {/* вывод */}
        <Reveal>
          <div className="relative overflow-hidden border border-copper-500/60 bg-pine-900 px-6 py-6 md:px-8">
            <span className="absolute -right-6 -top-10 font-display text-[120px] font-bold leading-none text-copper-500/10 select-none">✓</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="border border-ledgreen/50 bg-ledgreen/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-ledgreen">
                Вердикт: возможно
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-pine-400">
                4 уровня внедрения — от «работает сегодня» до нативного модуля
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pine-200 md:text-[15px]">
              «Санаториум» — облачно-локальная PMS для санаториев с медкартами, диетами и 300+ отчётами. Ей не хватает
              дешёвой автономной точки контроля на входе в залы — турникеты и планшеты менеджера она упоминает, но это
              дорогие или зависимые от сети решения. <b className="text-copper-300">Два терминала TALON-32 закрывают эту нишу</b>,
              причём гость ходит с одним и тем же браслетом: номер, процедуры, столовая.
            </p>
          </div>
        </Reveal>

        {/* факты с сайта */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {FACTS.map((f, i) => (
            <Reveal key={f.title} delay={i * 80} className={f.wide ? "md:col-span-2" : ""}>
              <div
                className={`group h-full border border-pine-700 bg-pine-900 p-5 transition-all duration-300 hover:border-copper-500/70 hover:bg-pine-850 md:p-6 ${
                  f.wide ? "flex flex-col gap-4 md:flex-row md:items-start md:gap-6" : ""
                }`}
              >
                <div className="flex items-center gap-3 md:w-56 md:shrink-0 md:flex-col md:items-start md:gap-4">
                  <f.icon className="h-8 w-8 shrink-0 text-copper-400 transition-transform duration-300 group-hover:-translate-y-1" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-pine-400">{f.tag}</span>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-pine-100 md:text-base">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-pine-300">{f.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* архитектура */}
        <Reveal className="mt-10">
          <div className="border border-pine-700 bg-pine-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pine-700 px-5 py-3">
              <span className="font-display text-xs font-bold uppercase tracking-widest text-copper-400">
                Целевая архитектура
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-pine-500">
                пунктир — необязательные связи (уровни L1–L3)
              </span>
            </div>
            <div className="pcb-bg p-4 md:p-8">
              <ArchDiagram />
            </div>
          </div>
        </Reveal>

        {/* уровни внедрения */}
        <div className="mt-12">
          <Reveal>
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-pine-100 md:text-xl">
              Четыре уровня внедрения — лестница, а не развилка
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-pine-300">
              Каждый следующий уровень включает предыдущий. Начинать разумно с L0–L1: они не требуют согласия вендора.
            </p>
          </Reveal>
          <div className="mt-6 space-y-0">
            {LEVELS.map((l, i) => (
              <Reveal key={l.num} delay={i * 70}>
                <div className="group relative grid gap-3 border border-pine-700 border-b-0 bg-pine-900 p-5 transition-colors duration-300 last:border-b hover:bg-pine-850 md:grid-cols-[90px_1fr_220px] md:p-6">
                  <span className="font-display text-2xl font-bold text-copper-500/80 transition-colors group-hover:text-copper-400 md:text-3xl">
                    {l.num}
                  </span>
                  <div>
                    <h4 className="font-display text-sm font-bold uppercase tracking-wide text-pine-100">{l.name}</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-pine-300">{l.text}</p>
                  </div>
                  <div className="flex flex-col justify-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 10 }).map((_, k) => (
                        <span
                          key={k}
                          className={`h-2 flex-1 ${
                            (l.effort === 0 ? k < 1 : k < l.effort)
                              ? k < 4
                                ? "bg-ledgreen/80"
                                : k < 7
                                  ? "bg-amberled/80"
                                  : "bg-ledred/80"
                              : "bg-pine-700"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[10.5px] uppercase tracking-wide text-pine-400">
                      трудозатраты: {l.effortLabel}
                    </span>
                    <span className="font-mono text-[10.5px] text-copper-300">исполнитель: {l.who}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* владение данными + JSON */}
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <div className="h-full border border-pine-700 bg-pine-900">
              <div className="border-b border-pine-700 px-5 py-3 font-display text-xs font-bold uppercase tracking-widest text-copper-400">
                Кто чем владеет (источники истины)
              </div>
              <table className="w-full text-left text-[13px]">
                <tbody>
                  {DATA_OWNERSHIP.map((r, i) => (
                    <tr key={i} className="rtable border-b border-pine-800 align-top last:border-0 hover:bg-copper-500/5">
                      <td className="px-5 py-3 font-medium text-pine-100">{r[0]}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`whitespace-nowrap border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                            r[1] === "ТАЛОН-32"
                              ? "border-copper-400/50 bg-copper-500/10 text-copper-300"
                              : "border-pine-500/50 bg-pine-700/40 text-pine-200"
                          }`}
                        >
                          {r[1]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-pine-400">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex h-full flex-col border border-pine-700 bg-pine-900">
              <div className="border-b border-pine-700 px-5 py-3 font-display text-xs font-bold uppercase tracking-widest text-copper-400">
                Событие терминала (уровень L2)
              </div>
              <pre className="nice-scroll flex-1 overflow-x-auto bg-pine-950 p-4 font-mono text-[11.5px] leading-relaxed text-copper-300">
                {EVENT_JSON}
              </pre>
              <p className="border-t border-pine-700 px-5 py-3 text-[12px] leading-relaxed text-pine-400">
                Один POST на каждое прикладывание карты. Добавление HTTPClient в прошивку — ~80 строк; приёмная сторона —
                задача для внедренцев «Санаториум» либо прослойка через уже интегрированные iiko / r-keeper.
              </p>
            </div>
          </Reveal>
        </div>

        {/* вопросы вендору + совместимость карт */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full border border-pine-700 bg-pine-900 p-6">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-copper-400">
                Что спросить у вендора перед внедрением
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  "Есть ли API или обмен файлами для событий контроля доступа (в списке интеграций есть «Бюро пропусков»)?",
                  "Какой стандарт у RFID-браслетов: Mifare Classic 1K читается RC522 без замены железа.",
                  "Можно ли выгружать список проживающих «UID карты + ID гостя + план питания» в CSV/Excel по расписанию?",
                  "Готовы ли взять TALON-32 в персональную интеграцию объекта (они заявляют персонализацию продукта)?",
                ].map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-pine-200">
                    <span className="mt-0.5 shrink-0 font-mono text-[11px] font-bold text-copper-400">{String(i + 1).padStart(2, "0")}</span>
                    {q}
                  </li>
                ))}
              </ul>
              <a
                href="https://sanatorium-is.ru/integracii/"
                target="_blank"
                rel="noreferrer"
                className="u-sweep mt-5 inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-wide text-copper-300"
              >
                sanatorium-is.ru/integracii <IconArrowR className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-start gap-3 border border-amberled/40 bg-amberled/8 px-5 py-4 text-sm leading-relaxed text-amberled">
                <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  <b>Честное ограничение:</b> «Санаториум» — коммерческая закрытая система, публичного REST API на сайте
                  нет. Уровни L0–L1 делаются без вендора, L2 требует маленькой прослойки, L3 — только с их участием.
                  Поэтому проект и спроектирован автономным: контроль доступа не должен зависеть от чужого облака.
                </p>
              </div>
              <div className="flex-1 border border-pine-700 bg-pine-900 px-5 py-4">
                <h4 className="font-display text-xs font-bold uppercase tracking-widest text-copper-400">
                  Совместимость карт
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-pine-300">
                  Гостиничные ключ-карты и браслеты чаще всего — <b className="text-pine-100">Mifare Classic 1K</b>:
                  RC522 читает и пишет их «из коробки», гость носит одну карту. Если у «Санаториум» браслеты DESFire или
                  EM-Marine — в терминале меняется только модуль считывателя (PN532 / PN7150), а гость идентифицируется
                  по UID; логика прошивки остаётся прежней.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
