export function playNotificationTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);

    oscillator.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // Ignore notification sound failures (browser permissions/autoplay policy).
  }
}

export function startTitleBlink(text) {
  if (typeof document === 'undefined') return () => {};

  const originalTitle = document.title;
  let toggled = false;

  const intervalId = window.setInterval(() => {
    document.title = toggled ? originalTitle : text;
    toggled = !toggled;
  }, 900);

  const stop = () => {
    window.clearInterval(intervalId);
    document.title = originalTitle;
    window.removeEventListener('focus', stop);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  const onVisibilityChange = () => {
    if (!document.hidden) {
      stop();
    }
  };

  window.addEventListener('focus', stop);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return stop;
}
