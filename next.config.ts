import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Clerk's Frontend API host is encoded in its publishable key ("pk_test_<base64 host$>").
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.split("_")[2];
const clerk = clerkKey ? `https://${Buffer.from(clerkKey, "base64").toString().replace(/\$$/, "")}` : "";
const transcribeRegion = process.env.TRANSCRIBE_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const transcribe = `wss://transcribestreaming.${transcribeRegion}.amazonaws.com:8443`;
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Bot checks during sign-up (Cloudflare Turnstile and Clerk's own), per @clerk/nextjs's default CSP.
const turnstile = "https://challenges.cloudflare.com";
const protect = "https://*.protect.clerk.com";

// Limits where page code can fetch from: this site, Clerk (sign-in), Supabase and Amazon Transcribe. A backstop, not a
// guarantee: CSP doesn't cover navigation or inline scripts. Dev needs 'unsafe-eval' for React's debugging tools.
// ponytail: 'unsafe-inline' scripts keep pages static; move to proxy nonces if a stricter CSP is required.
const csp = [
  "default-src 'self'",
  `script-src 'self' blob: 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${clerk} ${turnstile} ${protect}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://img.clerk.com",
  "font-src 'self'",
  "media-src 'self'",
  // A source with no port only matches 443, and Clerk's bot check also uses other ports.
  `connect-src 'self' ${clerk} ${supabase} ${transcribe} https://img.clerk.com ${protect}:*`,
  `frame-src ${turnstile} ${protect}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
