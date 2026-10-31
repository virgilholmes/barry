import Link from "next/link";
import { Suspense } from "react";
import { Show, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { HeroVideo } from "@/components/hero-video";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    // White focus ring, because the default near-black one disappears over the video.
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-neutral-900 text-white selection:bg-orange-200 selection:text-black [--ring:#fff]">
      <HeroVideo />
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-[url(/hero-poster.jpg)] bg-cover bg-center"
      />
      {/* The top stop keeps the header's 14px links at 4.5:1 over the brightest frame. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-b from-black/60 via-black/10 via-35% to-black/75"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-tr from-black/50 via-transparent via-45%"
      />

      <header className="flex h-16 items-center justify-between px-5 sm:h-20 sm:px-10">
        <Link href="/" aria-label="Barry home" className="flex min-h-11 items-center">
          <Logo className="h-6 brightness-0 invert sm:h-7" />
        </Link>
        <Suspense>
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <Button asChild size="lg" variant="ghost" className="h-11 rounded-full px-5 text-white hover:bg-white/15 hover:text-white">
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button asChild size="lg" className="h-11 rounded-full bg-white px-5 text-black hover:bg-white/85">
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </Show>
            <Show when="signed-in">
              <Button asChild size="lg" className="h-11 rounded-full bg-white px-5 text-black hover:bg-white/85">
                <Link href="/app">Open Barry</Link>
              </Button>
              <UserButton />
            </Show>
          </div>
        </Suspense>
      </header>

      <main className="mt-auto px-5 pb-20 sm:px-10 sm:pb-14">
        <h1 className="max-w-3xl text-4xl font-medium tracking-tight text-balance sm:text-6xl">
          The voice agent that goes to the doctor with you.
        </h1>
      </main>
    </div>
  );
}
