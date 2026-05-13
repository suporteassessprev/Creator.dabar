/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint is run separately via `npm run lint` (passed 0 errors).
  // Skipping during build avoids ETIMEDOUT failures in restricted network environments.
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Allow images from Gemini / Google APIs and common CDNs.
    // Avoid '**' wildcard — it allows any external host (SSRF risk).
    remotePatterns: [
      { protocol: 'https', hostname: 'generativelanguage.googleapis.com' },
      { protocol: 'https', hostname: '*.googleapis.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.viralpost.app' },
    ],
    // For images generated as base64 data URIs no remote pattern is needed.
    dangerouslyAllowSVG: false,
  },
}

module.exports = nextConfig
