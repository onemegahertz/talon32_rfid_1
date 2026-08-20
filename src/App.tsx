import { useEffect, useMemo, useState } from "react";
import DeviceSim from "./components/DeviceSim";
import FirmwareView from "./components/FirmwareView";
import IntegrationSection from "./components/IntegrationSection";
import ReportStudio from "./components/ReportStudio";
import { BomSection, GuideSection, RulesSection, WiringSection } from "./components/InfoSections";
import { IconChip, IconDownload, IconArrowR, Reveal, SectionHead } from "./components/ui";
import { FW_FILES } from "./data/firmware";
import { SLOTS, fmtMin, slotAt, type ReportRow } from "./lib/core";
import { downloadFile } from "./lib/report";

const NAV = [
  ["#terminal", "Терминал"],
  ["#rules", "Логика"],
  ["#bom", "Комплект"],
  ["#wiring", "Подключение"],
  ["#firmware", "Прошивка"],
  ["#guide", "Инструкция"],
  ["#reports", "Отчёты"],
] as const;

const TICKER = [
  "завтрак 08:30–11:30",
  "обед 13:30–15:30",
  "ужин 18:00–20:00",
  "одно посещение на период",
  "столовая или ресторан — выбор гостя",
  "повтор — красная лампа и три гудка",
  "журнал visits.csv по wi-fi",
  "отчёт html / txt за любую дату",
];

export default function App() {
  const [progress, setProgress] = useState(0);
  const [simRows, setSimRows] = useState<ReportRow[] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearInterval(t);
    };
  }, []);

  const liveSlot = useMemo(() => slotAt(now.getHours() * 60 + now.getMinutes()), [now]);

  const onExport = (rows: ReportRow[]) => {
    setSimRows(rows);
    document.getElementById("reports")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-pine-900 text-pine-100">
      {/* ======================= НАВИГАЦИЯ ======================= */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-pine-700 bg-pine-950/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5">
          <a href="#terminal" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center border border-copper-500 bg-copper-500/10 text-copper-400">
              <IconChip className="h-4.5 w-4.5" />
            </span>
            <span className="font-display text-[13px] font-bold tracking-[0.18em] text-pine-100">
              ТАЛОН<span className="text-copper-400">·32</span>
            </span>
          </a>
          <nav className="ml-6 hidden items-center gap-5 lg:flex">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="u-sweep font-mono text-[11px] uppercase tracking-widest text-pine-300 transition-colors hover:text-copper-300">
                {label}
              </a>
            ))}
          </nav>
          <span className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-pine-400">
            <span className="led h-1.5 w-1.5 rounded-full bg-ledgreen shadow-[0_0_8px_rgba(69,224,143,0.9)]" />
            fw 1.2.0
          </span>
        </div>
        <div className="h-[2px] bg-pine-800">
          <div className="h-full bg-copper-500 transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* ======================= ОТКРЫВАЮЩИЙ БЛОК ======================= */}
      <section id="terminal" className="pcb-bg relative overflow-hidden pt-14">
        <div className="grid-bg absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-10 md:pb-24 md:pt-16">
          <div className="grid items-start gap-10 xl:grid-cols-[1fr_1.15fr]">
            {/* левая колонка */}
            <div>
              <Reveal>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.22em] text-copper-400">
                  <span>ESP32-WROOM-32</span>
                  <span className="text-pine-500">+</span>
                  <span>MFRC522</span>
                  <span className="text-pine-500">+</span>
                  <span>DS3231</span>
                  <span className="text-pine-500">·</span>
                  <span className="text-pine-300">готовый проект</span>
                </p>
                <h1 className="mt-5 font-display text-[26px] font-black uppercase leading-[1.12] tracking-tight sm:text-4xl xl:text-[42px]">
                  <span className="text-ledgreen">Зелёный</span> — проходи.
                  <br />
                  <span className="text-ledred">Красный</span> — <span className="text-copper-400">уже ел.</span>
                </h1>
                <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-pine-200">
                  Учёт питания гостей отеля и столовой на RFID-картах: завтрак, обед и ужин —{" "}
                  <b className="text-pine-100">строго по одному посещению в период</b>, в столовую или ресторан на выбор гостя.
                  Прошивка, схема, комплектующие, инструкция и генератор отчётов за любую дату — на этой странице.
                </p>
              </Reveal>

              {/* периоды с живым индикатором */}
              <Reveal delay={120}>
                <div className="mt-7 grid max-w-xl grid-cols-3 gap-2">
                  {SLOTS.map((s) => {
                    const active = liveSlot?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`border px-3 py-2.5 transition-all duration-500 ${
                          active
                            ? "border-ledgreen/70 bg-ledgreen/10 shadow-[0_0_24px_-8px_rgba(69,224,143,0.6)]"
                            : "border-pine-600 bg-pine-850/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-mono text-[10px] uppercase tracking-widest ${active ? "text-ledgreen" : "text-pine-400"}`}>
                            {s.ru}
                          </span>
                          {active && (
                            <span className="font-mono text-[8.5px] uppercase tracking-widest text-ledgreen">● сейчас</span>
                          )}
                        </div>
                        <div className="mt-1 font-mono text-sm font-bold tabular-nums text-pine-100">
                          {fmtMin(s.from)}–{fmtMin(s.to)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-pine-500">
                  расписание прошито в терминалах · индикатор — по вашему местному времени
                </p>
              </Reveal>

              <Reveal delay={200}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => downloadFile(FW_FILES[0].name, FW_FILES[0].code, "text/plain")}
                    className="group flex items-center gap-2.5 border border-copper-500 bg-copper-500 px-6 py-3 font-display text-[12px] font-bold uppercase tracking-widest text-pine-950 transition-all duration-200 hover:bg-copper-400 active:translate-y-[2px]"
                  >
                    <IconDownload className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                    Скачать прошивку .ino
                  </button>
                  <a
                    href="#reports"
                    className="flex items-center gap-2.5 border border-pine-500 px-6 py-3 font-display text-[12px] font-bold uppercase tracking-widest text-pine-200 transition-colors hover:border-copper-400 hover:text-copper-300"
                  >
                    Собрать отчёт
                    <IconArrowR className="h-4 w-4" />
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-pine-400">
                  <span><b className="text-copper-300">2</b> терминала</span>
                  <span><b className="text-copper-300">3</b> периода в день</span>
                  <span><b className="text-copper-300">1</b> карта на гостя</span>
                  <span>отчёт <b className="text-copper-300">html / txt</b></span>
                </div>
              </Reveal>
            </div>

            {/* правая колонка — живой терминал */}
            <Reveal delay={150}>
              <DeviceSim onExport={onExport} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ======================= БЕГУЩАЯ СТРОКА ======================= */}
      <div className="ticker-mask overflow-hidden border-y border-copper-700/40 bg-pine-950 py-2.5">
        <div className="ticker-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center">
              {TICKER.map((t) => (
                <span key={dup + t} className="flex items-center font-mono text-[11px] uppercase tracking-[0.22em] text-pine-300">
                  <span className="px-5">{t}</span>
                  <span className="text-copper-500">✳</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ======================= РАЗДЕЛЫ ======================= */}
      <RulesSection />
      <BomSection />
      <WiringSection />

      <section id="firmware" className="pcb-bg border-y border-pine-700 bg-pine-900 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead
            num="04"
            title="Прошивка"
            sub="Полный исходник одним файлом: считыватель, часы, логика периодов, запись на карту, журнал в LittleFS и веб-страница для скачивания CSV. Рядом — разовый скетч установки часов."
          />
          <FirmwareView />
        </div>
      </section>

      <GuideSection />

      <section id="reports" className="pcb-bg relative bg-pine-900 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead
            num="06"
            title="Отчёты по посещениям"
            sub="Загрузите visits.csv со столовой и ресторана (или передайте журнал из симулятора выше), выберите период — и скачайте отчёт в HTML для печати либо в TXT. Нарушения подсвечиваются."
          />
          <Reveal>
            <ReportStudio simRows={simRows} />
          </Reveal>
        </div>
      </section>

      {/* ======================= ФУТЕР ======================= */}
      <footer className="border-t border-pine-700 bg-pine-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center border border-copper-500 bg-copper-500/10 text-copper-400">
                <IconChip className="h-4.5 w-4.5" />
              </span>
              <span className="font-display text-[13px] font-bold tracking-[0.18em]">
                ТАЛОН<span className="text-copper-400">·32</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-pine-300">
              RFID-контроль питания гостей: одно посещение в период, честный журнал и отчёт за любую дату.
              Собирается из доступных модулей за вечер.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-copper-400">Файлы проекта</h4>
            <ul className="mt-4 space-y-2.5">
              {FW_FILES.map((f) => (
                <li key={f.name}>
                  <button
                    onClick={() => downloadFile(f.name, f.code, "text/plain")}
                    className="u-sweep font-mono text-[12.5px] text-pine-200 transition-colors hover:text-copper-300"
                  >
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-copper-400">Разделы</h4>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {NAV.map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="u-sweep font-mono text-[12.5px] text-pine-200 transition-colors hover:text-copper-300">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-pine-800">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-pine-500">
            <span>talon-32 · прошивка 1.2.0 · arduino c++</span>
            <span>esp32 + rc522 + ds3231 · littlefs · wi-fi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
