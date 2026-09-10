/**
 * Throttle a callback to run at most `maxFps` frames per second using requestAnimationFrame.
 * Returns a function that you can call each animation frame; the callback will only be
 * invoked when enough time has passed.
 */
export function throttleRaf(callback: () => void, maxFps: number = 30) {
  const minInterval = 1000 / maxFps;
  let lastTime = 0;
  let rafId: number | null = null;

  const tick = (timestamp: number) => {
    if (timestamp - lastTime >= minInterval) {
      lastTime = timestamp;
      callback();
    }
    rafId = requestAnimationFrame(tick);
  };

  // start the loop
  rafId = requestAnimationFrame(tick);

  // return a cleanup function
  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}
