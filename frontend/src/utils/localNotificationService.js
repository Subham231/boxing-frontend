// src/utils/localNotificationService.js

/**
 * Requests web browser notification access.
 */
export async function requestLocalNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications.');
    return false;
  }
  
  if (Notification.permission === 'granted') return true;
  
  const status = await Notification.requestPermission();
  return status === 'granted';
}

/**
 * Registers an autonomous browser timer to trigger when it is training time.
 * @param {string} targetTimeStr - Selected daily time formatted as "HH:MM" (24-hour).
 * @param {string} fighterName - User name collected from profile context.
 */
export function scheduleLocalWorkoutReminder(targetTimeStr, fighterName = 'Champ') {
  if (!targetTimeStr) return;

  // Clear existing checks if any
  if (window.workoutNotificationTicker) {
    clearInterval(window.workoutNotificationTicker);
  }

  console.log(`Workout scheduler activated for ${targetTimeStr} daily local time.`);

  window.workoutNotificationTicker = setInterval(() => {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeCompiled = `${currentHours}:${currentMinutes}`;

    if (currentTimeCompiled === targetTimeStr) {
      if (Notification.permission === 'granted') {
        new Notification('🥊 Time to Spar!', {
          body: `Hey ${fighterName}, your scheduled bodyweight split is active. Let's get to work!`,
          icon: '/favicon.ico',
          tag: 'workout-reminder'
        });
      }
    }
  }, 60000); // Evaluates synchronization accurately every minute
}
