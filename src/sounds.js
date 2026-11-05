// Web Audio API chimes & notification sounds (no external mp3 files needed)

let _audioCtx = null;

function getAudioContext() {
  if (!_audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      _audioCtx = new AudioContextClass();
    }
  }
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

// 1. Notification Chime: for incoming bookings, counter offers, job requests (🔔 Ding-Dong!)
export function playRingChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 3-note ascending chime (G5, B5, D6)
    const notes = [
      { freq: 783.99, delay: 0, dur: 0.28 },
      { freq: 987.77, delay: 0.16, dur: 0.28 },
      { freq: 1174.66, delay: 0.32, dur: 0.45 }
    ];

    notes.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.28, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (e) {}
}

// 2. Chat Message Pop / Chime (WhatsApp-like sent/received sound)
export function playMessageChime(isOutgoing = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isOutgoing) {
      // Crisp outgoing bubble "pop"
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      // Double ding for incoming message (E6 -> G6)
      [
        { freq: 1318.51, delay: 0, dur: 0.14 },
        { freq: 1567.98, delay: 0.10, dur: 0.22 }
      ].forEach(({ freq, delay, dur }) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + delay);
        g.gain.setValueAtTime(0.22, now + delay);
        g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + delay);
        o.stop(now + delay + dur);
      });

      if (navigator.vibrate) {
        navigator.vibrate([100, 60, 100]);
      }
    }
  } catch (e) {}
}
