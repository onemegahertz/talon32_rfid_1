import { useMemo, useState, type ReactNode } from "react";
import { FW_FILES } from "../data/firmware";
import { downloadFile } from "../lib/report";
import { IconCheck, IconCopy, IconDownload } from "./ui";
import { Reveal } from "./ui";

/* ---------- лёгкая подсветка C++ ---------- */
const RX =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(#\s*[a-z]+)|\b(\d+(?:\.\d+)?)\b|\b(void|bool|boolean|byte|char|int|uint8_t|uint16_t|uint32_t|long|size_t|float|const|struct|if|else|for|while|return|true|false|nullptr|String|File|DateTime|MFRC522|RTC_DS3231|WebServer|HIGH|LOW|PROGMEM)\b/g;

function highlightLine(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RX.lastIndex = 0;
  let k = 0;
  while ((m = RX.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    if (m[1]) out.push(<span key={k++} className="italic text-pine-400">{m[1]}</span>);
    else if (m[2]) out.push(<span key={k++} className="text-copper-300">{m[2]}</span>);
    else if (m[3]) out.push(<span key={k++} className="font-medium text-copper-400">{m[3]}</span>);
    else if (m[4]) out.push(<span key={k++} className="text-amberled">{m[4]}</span>);
    else if (m[5]) out.push(<span key={k++} className="font-medium text-[#8fd6ad]">{m[5]}</span>);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export default function FirmwareView() {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const file = FW_FILES[tab];

  const lines = useMemo(() => file.code.replace(/\n$/, "").split("\n"), [file]);
  const inRaw = useMemo(() => {
    /* отметка строк внутри R"rawliteral(...)rawliteral" — красим как строку */
    const marks: boolean[] = [];
    let inside = false;
    for (const ln of lines) {
      if (inside) {
        marks.push(true);
        if (ln.includes(")rawliteral")) inside = false;
      } else if (ln.includes('R"rawliteral(')) {
        marks.push(true);
        if (!ln.includes(")rawliteral")) inside = true;
      } else {
        marks.push(false);
      }
    }
    return marks;
  }, [lines]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(file.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* среда без clipboard API */
    }
  };

  return (
    <Reveal>
      <div className="border border-pine-600 bg-pine-850">
        {/* шапка панели */}
        <div className="flex flex-wrap items-center gap-2 border-b border-pine-600 px-4 py-2.5">
          <div className="flex gap-1.5">
            {FW_FILES.map((f, i) => (
              <button
                key={f.name}
                onClick={() => setTab(i)}
                className={`border px-3 py-1.5 font-mono text-[11.5px] transition-colors ${
                  tab === i
                    ? "border-copper-400 bg-copper-500/15 text-copper-300"
                    : "border-pine-600 text-pine-300 hover:border-pine-400"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-pine-500 sm:block">
              {lines.length} строк · arduino c++
            </span>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 border border-pine-600 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-pine-200 transition-colors hover:border-copper-400 hover:text-copper-300"
            >
              {copied ? <IconCheck className="h-3.5 w-3.5 text-ledgreen" /> : <IconCopy className="h-3.5 w-3.5" />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
            <button
              onClick={() => downloadFile(file.name, file.code, "text/plain")}
              className="flex items-center gap-1.5 border border-copper-500 bg-copper-500 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-pine-950 transition-colors hover:bg-copper-400"
            >
              <IconDownload className="h-3.5 w-3.5" />
              Скачать
            </button>
          </div>
        </div>

        <p className="border-b border-pine-700 px-4 py-2 text-[12.5px] text-pine-300">{file.desc}</p>

        {/* код */}
        <div className="nice-scroll max-h-[560px] overflow-auto bg-pine-950 py-3 font-mono text-[12px] leading-[1.55] text-pine-200">
          {lines.map((ln, i) => (
            <div key={i} className="flex hover:bg-pine-900/60">
              <span className="w-12 shrink-0 select-none pr-3 text-right text-pine-600">{i + 1}</span>
              <span className="whitespace-pre pr-6">
                {inRaw[i] ? <span className="text-copper-300">{ln || "\u00A0"}</span> : ln ? highlightLine(ln) : "\u00A0"}
              </span>
            </div>
          ))}
        </div>

        {/* мета */}
        <div className="flex flex-wrap items-center gap-2 border-t border-pine-600 px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-pine-500">Понадобится:</span>
          {["Плата: ESP32 Dev Module", "MFRC522 · GitHubCommunity", "RTClib · Adafruit", "Partition: Default 4MB", "Монитор порта: 115200"].map(
            (c) => (
              <span key={c} className="border border-pine-600 px-2 py-0.5 font-mono text-[10.5px] text-pine-300">
                {c}
              </span>
            )
          )}
        </div>
      </div>
    </Reveal>
  );
}
