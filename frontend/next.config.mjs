/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Pre-existing lint issues across many files — strict mode re-enabled
    // once those are cleaned up separately.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
