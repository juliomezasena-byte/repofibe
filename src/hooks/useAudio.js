import { useCallback, useRef, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Singleton para el AudioContext para no crear múltiples (y reusar si el navegador lo permite)
let audioCtx = null;

const initAudio = () => {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Generadores de sonido sintético (Web Audio API) = 0 KB de carga de red!
const playTone = (ctx, freq, type, duration, vol) => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

// Ruido blanco corto para emular teclado mecánico
const playClick = (ctx) => {
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * 0.05; // 50ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  const gain = ctx.createGain();
  
  // Filtro pasa-banda para darle un sonido más a "tecla de plástico"
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  
  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noiseSource.start();
};

export function useAudio() {
  // Opt-in (Apagado por defecto, persistido de forma segura)
  const [isMuted, setIsMuted] = useLocalStorage('amadeus_sfx_muted', true);
  
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (!next) {
        // Al encender el volumen (interacción del usuario), inicializamos/resumimos el contexto
        initAudio();
      }
      return next;
    });
  }, [setIsMuted]);

  const playSound = useCallback((type) => {
    if (isMuted) return;
    try {
      const ctx = initAudio();
      if (type === 'key') {
        playClick(ctx);
      } else if (type === 'error') {
        // Sonido grave de error (bzz)
        playTone(ctx, 150, 'sawtooth', 0.3, 0.2);
      } else if (type === 'success') {
        // Campana de éxito (Arpegio rápido)
        playTone(ctx, 523.25, 'sine', 0.1, 0.1); // C5
        setTimeout(() => playTone(ctx, 659.25, 'sine', 0.1, 0.1), 100); // E5
        setTimeout(() => playTone(ctx, 783.99, 'sine', 0.3, 0.1), 200); // G5
      }
    } catch (e) {
      // Ignorar silenciosamente si el navegador sigue bloqueando el audio
      console.warn("Audio bloqueado por el navegador:", e);
    }
  }, [isMuted]);

  return { isMuted, toggleMute, playSound };
}
