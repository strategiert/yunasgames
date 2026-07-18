// Nachsprechen wie Talking Tom: aufnehmen, mit hoher Quietschstimme abspielen.
// Komplett offline: MediaRecorder + WebAudio, Pitch über playbackRate.
let stream = null;

export async function ensureMic() {
  if (stream?.active) return stream;
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return stream;
}

export function releaseMic() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

export async function startRecording() {
  const s = await ensureMic();
  const rec = new MediaRecorder(s);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType }));
        rec.stop();
      }),
  };
}

// Abspielen mit Hundestimme; liefert Dauer in Sekunden fürs Mund-Animieren
export async function playAsDog(blob, rate = 1.7) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(ctx.destination);
  return new Promise((resolve) => {
    src.onended = () => {
      ctx.close();
      resolve();
    };
    src.start();
  });
}
