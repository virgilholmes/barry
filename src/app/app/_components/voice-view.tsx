"use client";

import { useEffect } from "react";
import { AudioLines, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceStatus } from "../_lib/use-voice-session";

const copy: Record<Exclude<VoiceStatus, "idle">, { label: string; hint: string }> = {
  listening: { label: "Listening", hint: "Tap the circle when you're done" },
  thinking: { label: "Thinking", hint: "" },
  speaking: { label: "Speaking", hint: "Tap the circle to interrupt" },
};

export function VoiceView({
  status,
  caption,
  onTap,
  onEnd,
}: {
  status: VoiceStatus;
  caption: string;
  onTap: () => void;
  onEnd: () => void;
}) {
  const state = copy[status === "idle" ? "listening" : status];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onEnd();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEnd]);

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-8">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <button
          onClick={onTap}
          disabled={status === "thinking"}
          aria-label={state.hint || state.label}
          className="relative grid size-44 place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-stone-300"
        >
          {status !== "thinking" && (
            <span
              aria-hidden
              className={cn(
                "absolute inset-4 animate-ping rounded-full bg-orange-500/15 motion-reduce:hidden",
                status === "listening" ? "[animation-duration:2s]" : "[animation-duration:1.2s]",
              )}
            />
          )}
          <span
            className={cn(
              "relative grid size-32 place-items-center rounded-full text-white transition-colors duration-300",
              status === "thinking" ? "animate-pulse bg-stone-300" : "bg-orange-500",
            )}
          >
            {status === "speaking" ? <AudioLines className="size-10" /> : <Mic className="size-10" />}
          </span>
        </button>

        <p role="status" className="mt-8 text-sm font-medium text-stone-500">
          {state.label}
          {status === "thinking" && "…"}
        </p>
        <p
          aria-live="polite"
          className={cn(
            "mt-3 min-h-16 max-w-xl text-center text-xl leading-relaxed text-balance",
            status === "speaking" ? "text-foreground" : "text-stone-500",
          )}
        >
          {caption}
        </p>
      </div>

      <p className="mb-4 h-5 text-sm text-muted-foreground">{state.hint}</p>
      <button
        onClick={onEnd}
        className="flex h-11 items-center gap-2 rounded-full bg-stone-100 px-5 text-sm font-medium transition-colors hover:bg-stone-200"
      >
        <X className="size-4" />
        End
      </button>
    </div>
  );
}
