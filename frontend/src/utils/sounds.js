// Simple sound manager using Web Audio API
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

const sounds = {
  stretch: { frequency: 200, duration: 0.1, type: 'sine' },
  snap: { frequency: 400, duration: 0.15, type: 'square' },
  pop: { frequency: 800, duration: 0.2, type: 'sine' },
  bounce: { frequency: 300, duration: 0.1, type: 'triangle' }
};

export const playSound = (soundName) => {
  if (!audioContext) return;
  
  const sound = sounds[soundName];
  if (!sound) return;
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};