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
