let audioCtx: AudioContext | null = null;

let muted: boolean = (() => {
  try { return localStorage.getItem('ctp_muted') === '1'; } catch { return false; }
})();

export function setSoundMuted(v: boolean) {
  muted = v;
  try { localStorage.setItem('ctp_muted', v ? '1' : '0'); } catch { /* ignore */ }
}

export function isSoundMuted(): boolean {
  return muted;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playDiceSound() {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Tạo chuỗi âm thanh xóc xúc xắc (rattling noise)
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120 + Math.random() * 240, now + i * 0.06);
      
      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.005, now + i * 0.06 + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.05);
    }
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

export function playCoinsSound() {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Âm thanh leng keng tiền xu khi mua đất / nhận tiền
    const freqs = [587.33, 880.00, 1174.66, 1760.00]; // D5, A5, D6, A6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      
      gain.gain.setValueAtTime(0.08, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.2);
    });
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

export function playPaySound() {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Âm thanh khi thanh toán tiền thuê / nộp thuế (hơi trầm xuống)
    const freqs = [987.77, 783.99, 587.33]; // B5, G5, D5
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      
      gain.gain.setValueAtTime(0.06, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.15);
    });
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

export function playSadSound() {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Âm thanh trầm buồn khi phá sản
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.7);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.7);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.7);
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

export function playClickSound() {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

export function playDiceRollingSound() {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 1. Rattle sound during 800ms rolling (14 quick clicks)
    const clickCount = 14;
    for (let i = 0; i < clickCount; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 200, now + i * 0.05);
      
      gain.gain.setValueAtTime(0.07, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.005, now + i * 0.05 + 0.045);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.045);
    }

    // 2. Impact 1 (Die 1 settles) around 0.8s (low thud sound)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, now + 0.8);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.95);
    gain1.gain.setValueAtTime(0.2, now + 0.8);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.95);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now + 0.8);
    osc1.stop(now + 0.95);

    // 3. Impact 2 (Die 2 settles) around 0.95s
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(75, now + 0.95);
    osc2.frequency.exponentialRampToValueAtTime(30, now + 1.1);
    gain2.gain.setValueAtTime(0.2, now + 0.95);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.95);
    osc2.stop(now + 1.1);

  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

export function playTokenMoveSound(skinId: string) {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    switch (skinId) {
      case 'rocket': {
        // Space whoosh laser / jet engine thrust
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.16);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        break;
      }
      case 'car': {
        // Sports car engine vroom
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(320, now + 0.18);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        break;
      }
      case 'motorbike': {
        // Motorcycle high-pitched brap rev
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(450, now + 0.15);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        break;
      }
      case 'dragon': {
        // Majestic wings flap / growl swoosh
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.22);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        break;
      }
      case 'tiger': {
        // Leaping tiger pounce / low growl
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(45, now + 0.25);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        break;
      }
      case 'hat': {
        // Windy leaf drift airy float
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.16);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        break;
      }
      case 'pho': {
        // Squishy bubbly wobble pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.linearRampToValueAtTime(700, now + 0.08);
        osc.frequency.linearRampToValueAtTime(300, now + 0.16);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        break;
      }
      case 'coconut': {
        // Hollow shell wood knock
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        break;
      }
      default: {
        // Default crisp board game token pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.07);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        break;
      }
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}
