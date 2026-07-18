// Prozedurale Sound-Effekte über WebAudio — keine Audio-Dateien nötig,
// funktioniert offline und hält die PWA klein.
let ctx = null;
const MUTE_KEY = 'yunaSoundMuted';

export const isMuted = () => localStorage.getItem(MUTE_KEY) === '1';
export const setMuted = (m) => localStorage.setItem(MUTE_KEY, m ? '1' : '0');

const ac = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

const tone = (freq, start, dur, { type = 'sine', gain = 0.15, slideTo = null } = {}) => {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
};

const noise = (start, dur, { gain = 0.1, freq = 800 } = {}) => {
  const c = ac();
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(c.currentTime + start);
};

export const sfx = {
  coin() {
    if (isMuted()) return;
    tone(988, 0, 0.08, { type: 'square', gain: 0.08 });
    tone(1319, 0.08, 0.18, { type: 'square', gain: 0.08 });
  },
  levelUp() {
    if (isMuted()) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, { type: 'triangle', gain: 0.12 }));
  },
  pop() {
    if (isMuted()) return;
    tone(400, 0, 0.07, { type: 'sine', gain: 0.12, slideTo: 900 });
  },
  bark() {
    if (isMuted()) return;
    // Zwei kurze Kläffer: Sägezahn-Sweep abwärts + Rausch-Anteil
    for (const s of [0, 0.16]) {
      tone(700, s, 0.09, { type: 'sawtooth', gain: 0.1, slideTo: 250 });
      noise(s, 0.08, { gain: 0.05, freq: 1200 });
    }
  },
  munch() {
    if (isMuted()) return;
    for (const s of [0, 0.15, 0.3]) noise(s, 0.09, { gain: 0.09, freq: 500 });
  },
  giggle() {
    if (isMuted()) return;
    [900, 1100, 950, 1200].forEach((f, i) => tone(f, i * 0.07, 0.06, { type: 'sine', gain: 0.07 }));
  },
  snore() {
    if (isMuted()) return;
    tone(90, 0, 0.5, { type: 'sawtooth', gain: 0.05, slideTo: 60 });
  },
};
