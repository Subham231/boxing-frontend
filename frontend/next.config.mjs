/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Allow TURN server env vars to be accessed at runtime
  env: {
    TURN_SERVER_URL: process.env.TURN_SERVER_URL,
    TURN_USERNAME: process.env.TURN_USERNAME,
    TURN_CREDENTIAL: process.env.TURN_CREDENTIAL,
    TURNS_SERVER_URL: process.env.TURNS_SERVER_URL,
    TURNS_USERNAME: process.env.TURNS_USERNAME,
    TURNS_CREDENTIAL: process.env.TURNS_CREDENTIAL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // =====================================================================
          // DO NOT TOUCH — Permissions-Policy
          // =====================================================================
          // camera and microphone MUST both be "(self)". The Spar screen calls
          // navigator.mediaDevices.getUserMedia({ video, audio: true }) as a
          // SINGLE combined request. This HTTP header is enforced by the
          // browser BEFORE the permission prompt even appears — if either
          // camera or microphone is set to "()" (empty allow-list) here, the
          // browser hard-blocks that device for the whole site, for every
          // visitor, no matter what they click. It fails instantly with
          // "NotAllowedError" and looks exactly like the user denied
          // permission, even though they were never asked.
          //
          // This previously shipped as `microphone=()`, which silently broke
          // 100% of live spar sessions (camera worked, mic was policy-blocked,
          // so the combined getUserMedia call failed and the match could
          // never connect). If you "clean up" this header, you WILL
          // reintroduce that bug. Do not remove `(self)` from camera or
          // microphone. Do not delete this header. Do not merge a change that
          // touches this line without re-testing a live spar match end to end
          // on HTTPS.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
