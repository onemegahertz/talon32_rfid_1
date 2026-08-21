/* Звуковые сигналы терминала (Web Audio, без внешних файлов) */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = "square", gain = 0.045) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + at);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + at + 0.012);
  g.gain.setValueAtTime(gain, c.currentTime + at + dur - 0.03);
  g.gain.linearRampToValueAtTime(0, c.currentTime + at + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.05);
}

/** зелёная лампа — два коротких восходящих тона */
export function playApprove() {
  tone(1175, 0, 0.09);
  tone(1568, 0.11, 0.16);
}

/** красная лампа — три низких гудка (повторное посещение) */
export function playDeny() {
  tone(311, 0, 0.14);
  tone(311, 0.22, 0.14);
  tone(311, 0.44, 0.2);
}

/** длинный гудок — вне периода питания */
export function playTime() {
  tone(233, 0, 0.75, "sawtooth", 0.04);
}

/** регистрация карты — восходящая трель */
export function playReg() {
  tone(880, 0, 0.08);
  tone(1175, 0.1, 0.08);
  tone(1568, 0.2, 0.18);
}

/** короткий щелчок интерфейса */
export function playTick() {
  tone(1900, 0, 0.03, "square", 0.02);
}
