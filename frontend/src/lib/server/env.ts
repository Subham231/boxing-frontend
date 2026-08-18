export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Dev payment skip is never allowed in production, even if the public flag is set. */
export function isDevSkipAllowed(): boolean {
  return !isProduction() && process.env.NEXT_PUBLIC_ENABLE_DEV_SKIP === 'true';
}
