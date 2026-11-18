let ctx

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  return ctx
}

function tone({ type = 'sine', freq = 440, duration = 0.12, gain = 0.05, slide = 0 }) {
  const c = audio()
  const osc = c.createOscillator()
  const g = c.createGain()
  const filter = c.createBiquadFilter()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  if (slide) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + duration)
  }
  filter.type = 'lowpass'
  filter.frequency.value = 1800
  g.gain.setValueAtTime(gain, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration)
  osc.connect(filter).connect(g).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + duration + 0.02)
}

/** Инициализирует или возобновляет Web Audio контекст после пользовательского жеста. */
export function unlockAudio() {
  try {
    audio()
  } catch {
    /* ignore */
  }
}

/** Воспроизводит короткий стеклянный клик при нажатии на элементы интерфейса. */
export function playGlassClick() {
  tone({ type: 'triangle', freq: 980, duration: 0.07, gain: 0.035 })
}

/** Воспроизводит мягкий поп-звук при отметке выполнения привычки. */
export function playHabitPop() {
  tone({ type: 'sine', freq: 420, duration: 0.11, gain: 0.06, slide: 220 })
  setTimeout(() => tone({ type: 'triangle', freq: 720, duration: 0.08, gain: 0.03 }), 40)
}

/** Воспроизводит гармоничный аккорд при сохранении записи сна. */
export function playSleepChime() {
  tone({ type: 'sine', freq: 523.25, duration: 0.18, gain: 0.045 })
  setTimeout(() => tone({ type: 'sine', freq: 659.25, duration: 0.22, gain: 0.04 }), 90)
  setTimeout(() => tone({ type: 'triangle', freq: 783.99, duration: 0.28, gain: 0.03 }), 180)
}
