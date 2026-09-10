import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/features',
        '/features/',
        '/blog',
        '/blog/',
        '/login',
      ],
      disallow: [
        '/dashboard',
        '/dashboard/',
        '/settings',
        '/settings/',
        '/spar',
        '/spar/',
        '/vision',
        '/vision/',
        '/training',
        '/training/',
        '/analytics',
        '/analytics/',
        '/reflex',
        '/reflex/',
        '/guru',
        '/guru/',
        '/planner',
        '/planner/',
        '/leaderboard',
        '/leaderboard/',
        '/api/',
      ],
    },
    sitemap: 'https://sparai.in/sitemap.xml',
  };
}
