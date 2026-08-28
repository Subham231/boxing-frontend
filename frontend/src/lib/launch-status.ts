const DEFAULT_LAUNCH_AT = '2026-08-28T12:00:00+05:30';

export function getLaunchAt(): Date {
  const configured = process.env.APP_LAUNCH_AT || DEFAULT_LAUNCH_AT;
  const parsed = new Date(configured);
  return Number.isNaN(parsed.getTime()) ? new Date(DEFAULT_LAUNCH_AT) : parsed;
}

export function getLaunchStatus() {
  const now = new Date();
  const launchAt = getLaunchAt();
  return {
    launched: true,
    launchAt: launchAt.toISOString(),
    launchLabel: 'Live',
    serverNow: now.toISOString(),
  };
}
