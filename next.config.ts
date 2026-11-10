import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Version-skew protection. Netlify sets DEPLOY_ID at build time; with it,
  // a tab still running an older deploy gets a full reload on its next
  // navigation instead of requesting JS chunks / Server Action IDs that no
  // longer exist (which surfaced as intermittent "not found" pages after
  // each auto-deploy). Undefined locally, so dev is unaffected.
  deploymentId: process.env.DEPLOY_ID || undefined,
  // Shown on the Guide page's Developer section. Netlify sets COMMIT_REF at
  // build time; it's inlined here so the running app doesn't need it.
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: (process.env.COMMIT_REF ?? "").slice(0, 7),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "images.igdb.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No iframe embedding anywhere in this app — block framing entirely.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // This app uses none of these browser features.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // A Content-Security-Policy is intentionally not set here: a wrong
          // one (e.g. blocking Neon Auth's session calls or Next's own
          // hydration scripts) fails silently and could lock out the one
          // real user. Add it separately with the app open and testable.
        ],
      },
    ];
  },
};

export default nextConfig;
