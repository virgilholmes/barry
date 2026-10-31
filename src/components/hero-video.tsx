"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

// WCAG 2.2.2: looping motion needs a way to pause it. Hidden with the video when the
// visitor prefers reduced motion, since the poster image shows instead.
export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  return (
    <>
      <video
        ref={video}
        autoPlay
        muted
        loop
        playsInline
        poster="/hero-poster.jpg"
        aria-hidden
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        className="absolute inset-0 -z-20 size-full object-cover motion-reduce:hidden"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <button
        onClick={toggle}
        className="absolute right-4 bottom-4 inline-flex h-11 items-center gap-2 rounded-full bg-black/70 px-4 text-sm font-medium text-white transition-colors hover:bg-black/85 motion-reduce:hidden sm:right-10 sm:bottom-6 [&_svg]:size-4"
      >
        {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        {paused ? "Play video" : "Pause video"}
      </button>
    </>
  );
}
