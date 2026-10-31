import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-neutral-900 text-white selection:bg-orange-200 selection:text-black">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/hero-poster.jpg"
        aria-hidden
        className="absolute inset-0 -z-20 size-full object-cover motion-reduce:hidden"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-[url(/hero-poster.jpg)] bg-cover bg-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-b from-black/45 via-black/10 via-35% to-black/75"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-tr from-black/50 via-transparent via-45%"
      />

      <header className="flex h-16 items-center justify-between px-5 sm:h-20 sm:px-10">
        <Link href="/" aria-label="Barry home">
          <Logo className="h-6 brightness-0 invert sm:h-7" />
        </Link>
        <Button asChild size="lg" className="rounded-full bg-white px-4 text-black hover:bg-white/85">
          <Link href="/app">Log in</Link>
        </Button>
      </header>

      <main className="mt-auto px-5 pb-10 sm:px-10 sm:pb-14">
        <h1 className="max-w-3xl text-4xl font-medium tracking-tight text-balance sm:text-6xl">
          The voice agent that goes to the doctor with you.
        </h1>
      </main>
    </div>
  );
}
