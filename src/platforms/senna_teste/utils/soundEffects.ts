// Sistema de Efeitos Sonoros via Web Audio API (Duração Estendida >= 3.5 segundos)
class SoundFX {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. Som de Luzes Piscando em Curto Elétrico (Stranger Things - Marco 1) -> ~3.6s
  public playElectricShortCircuit() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Sequência rítmica e caótica de faíscas elétricas por 3.5 segundos
      const sparkTimes = [0, 0.15, 0.35, 0.6, 0.9, 1.2, 1.45, 1.8, 2.1, 2.35, 2.7, 3.0, 3.2];

      sparkTimes.forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
        const baseFreq = 50 + Math.random() * 150;
        osc.frequency.setValueAtTime(baseFreq, now + offset);
        osc.frequency.exponentialRampToValueAtTime(700 + Math.random() * 800, now + offset + 0.12);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500 + Math.random() * 400, now + offset);
        filter.Q.setValueAtTime(4, now + offset);

        const intensity = idx > 8 ? 0.14 * (1 - (idx - 8) / 6) : 0.18;
        gain.gain.setValueAtTime(intensity, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.16);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // 2. Som de Rádio Sintonizando / Walkie-Talkie (Stranger Things - Marco 2) -> ~3.5s
  public playRadioStaticTune() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Varredura de frequências de rádio e bips de transmissão por 3.5s
      const steps = [
        { time: 0, freq: 850, dur: 0.6 },
        { time: 0.65, freq: 1300, dur: 0.7 },
        { time: 1.4, freq: 620, dur: 0.8 },
        { time: 2.25, freq: 1750, dur: 0.6 },
        { time: 2.9, freq: 1050, dur: 0.6 },
      ];

      steps.forEach((step) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.setValueAtTime(step.freq, now + step.time);
        osc.frequency.exponentialRampToValueAtTime(step.freq * 1.3, now + step.time + step.dur);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now + step.time);

        gain.gain.setValueAtTime(0.09, now + step.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + step.time + step.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + step.time);
        osc.stop(now + step.time + step.dur + 0.05);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // 3. Som de Monitor Cardíaco / Bip de Emergência (Grey's Anatomy - Marco 1) -> ~3.6s
  public playHeartMonitorBeep() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 5 bips clínicos sincronizados ao longo de 3.6 segundos
      const beepIntervals = [0, 0.72, 1.44, 2.16, 2.88];

      beepIntervals.forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now + offset); // Nota B5 clínica padrão

        gain.gain.setValueAtTime(0.14, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.3);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // 4. Som de Acorde Cirúrgico / Harmonia Seattle Grace (Grey's Anatomy - Marco 2) -> ~3.5s
  public playSurgicalChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const chords = [
        { offset: 0, notes: [261.63, 329.63, 392.0, 523.25] },     // C Major
        { offset: 1.1, notes: [293.66, 369.99, 440.0, 587.33] },   // D Major
        { offset: 2.2, notes: [329.63, 392.0, 493.88, 659.25] },   // E minor/lift
      ];

      chords.forEach((chord) => {
        chord.notes.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + chord.offset);

          gain.gain.setValueAtTime(0.08, now + chord.offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + chord.offset + 1.3);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + chord.offset);
          osc.stop(now + chord.offset + 1.35);
        });
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // 5. Som de Violoncelo Tocando (Wandinha - Marco 1) -> ~3.8s
  public playCelloNotes() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Melodia gótica solene de violoncelo em 4 frases lentas com sustain
      // D2 (73.4Hz) -> F2 (87.3Hz) -> A2 (110.0Hz) -> D3 (146.8Hz) -> C#3 (138.6Hz)
      const celloPhrases = [
        { freq: 73.42, start: 0, dur: 0.95 },
        { freq: 87.31, start: 0.9, dur: 0.95 },
        { freq: 110.0, start: 1.8, dur: 0.95 },
        { freq: 146.83, start: 2.7, dur: 1.1 },
      ];

      celloPhrases.forEach((phrase) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(phrase.freq, now + phrase.start);

        // Modulação de vibrato no arco do violoncelo
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(5.5, now + phrase.start); // 5.5 Hz vibrato
        lfoGain.gain.setValueAtTime(1.5, now + phrase.start);
        lfo.connect(osc.frequency);
        lfo.start(now + phrase.start);
        lfo.stop(now + phrase.start + phrase.dur);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now + phrase.start);
        filter.frequency.exponentialRampToValueAtTime(220, now + phrase.start + phrase.dur);

        gain.gain.setValueAtTime(0.001, now + phrase.start);
        gain.gain.linearRampToValueAtTime(0.22, now + phrase.start + 0.15); // Ataque de arco suave
        gain.gain.exponentialRampToValueAtTime(0.001, now + phrase.start + phrase.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + phrase.start);
        osc.stop(now + phrase.start + phrase.dur + 0.05);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // 6. Som de Sino Gótico / Badalada de Nevermore (Wandinha - Marco 2) -> ~3.6s
  public playGothicBell() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Duas badaladas profundas de sino de catedral gótica
      [0, 1.6].forEach((bellTime) => {
        const fundamentalFreqs = [110, 220, 277.18, 330, 440, 587.33];

        fundamentalFreqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + bellTime);

          const vol = 0.12 / (idx + 1);
          gain.gain.setValueAtTime(vol, now + bellTime);
          gain.gain.exponentialRampToValueAtTime(0.001, now + bellTime + 1.9);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + bellTime);
          osc.stop(now + bellTime + 2.0);
        });
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // 7. Som de Conclusão da Respiração -> ~3.0s
  public playBreathingSuccess() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const successNotes = [
        { f: 440.0, time: 0, dur: 1.0 },
        { f: 554.37, time: 0.4, dur: 1.2 },
        { f: 659.25, time: 0.9, dur: 1.5 },
        { f: 880.0, time: 1.5, dur: 1.6 },
      ];

      successNotes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, now + note.time);

        gain.gain.setValueAtTime(0.08, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur + 0.1);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }
}

export const soundFX = new SoundFX();
