import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Style objects, because Clerk's own styles outrank utility classes.
const clerkLink = {
  color: "var(--foreground)",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
  "&:hover": { color: "var(--foreground)" },
};

export const metadata: Metadata = {
  title: "Barry",
  description: "The voice agent that goes to the doctor with you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          telemetry={false}
          appearance={{
            theme: shadcn,
            // Black text on Barry orange (6.8:1). Orange text on white is 2.9:1, so links stay black.
            variables: { colorPrimary: "#fe6900", colorPrimaryForeground: "#0a0a0a" },
            elements: {
              formFieldInput: { boxShadow: "0 0 0 1.5px var(--control)" },
              // Clerk's generated avatars are purple; keep them black and white.
              avatarBox: { filter: "grayscale(1)" },
              userButtonAvatarBox: { filter: "grayscale(1)" },
              // 28px avatar + padding = a 44px tap target.
              userButtonTrigger: { padding: "8px" },
              footerActionLink: clerkLink,
              formFieldAction: clerkLink,
              formResendCodeLink: clerkLink,
              identityPreviewEditButton: clerkLink,
              backLink: clerkLink,
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
