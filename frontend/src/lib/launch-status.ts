const DEFAULT_LAUNCH_AT = '2026-08-28T00:00:00+05:30';

export function getLaunchAt(): Date {
  const configured = process.env.APP_LAUNCH_AT || DEFAULT_LAUNCH_AT;
  const parsed = new Date(configured);
  return Number.isNaN(parsed.getTime()) ? new Date(DEFAULT_LAUNCH_AT) : parsed;
}

export function getLaunchStatus() {
  const now = new Date();
  const launchAt = getLaunchAt();
  return {
    launched: now.getTime() >= launchAt.getTime(),
    launchAt: launchAt.toISOString(),
    launchLabel: launchAt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) + ' IST',
    serverNow: now.toISOString(),
  };
}
