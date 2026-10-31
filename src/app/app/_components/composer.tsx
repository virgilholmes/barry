"use client";

import { useRef, useState } from "react";
import { ArrowUp, AudioLines, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDictation } from "../_lib/use-dictation";
import { ModelPicker } from "./model-picker";

type ComposerProps = {
  streaming: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
  onVoice?: () => void;
  autoFocus?: boolean;
};

export function Composer({ streaming, onSubmit, onStop, onVoice, autoFocus }: ComposerProps) {
  const [value, setValue] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dictation = useDictation(setValue);
  const canSend = value.trim().length > 0 && !streaming;

  function submit() {
    if (!canSend) return;
    dictation.stop();
    onSubmit(value.trim());
    setValue("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onClick={(event) => {
        // Clicks on controls (including the portaled model menu) shouldn't steal focus.
        if (!(event.target as HTMLElement).closest("button, [role=menu]")) textarea.current?.focus();
      }}
      className="flex w-full cursor-text flex-col gap-1 rounded-2xl border border-stone-200 bg-background p-2.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors focus-within:border-stone-300"
    >
      <textarea
        ref={textarea}
        value={value}
        autoFocus={autoFocus}
        rows={1}
        aria-label="Message Barry"
        placeholder={dictation.listening ? "Listening…" : "Ask Barry anything"}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        className="field-sizing-content max-h-52 min-h-11 w-full resize-none bg-transparent px-2.5 pt-1.5 text-base leading-6 outline-none placeholder:text-muted-foreground"
      />

      <div className="flex items-center gap-1">
        <ModelPicker />
        <div className="flex-1" />
        {dictation.supported && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={dictation.listening ? "Stop dictation" : "Dictate"}
            title={dictation.listening ? "Stop dictation" : "Dictate"}
            aria-pressed={dictation.listening}
            onClick={() => (dictation.listening ? dictation.stop() : dictation.start(value))}
            className={cn(
              "rounded-xl text-muted-foreground",
              dictation.listening && "bg-red-500/10 text-red-600 hover:bg-red-500/15 hover:text-red-600",
            )}
          >
            <Mic className={cn("size-[18px]", dictation.listening && "animate-pulse")} />
          </Button>
        )}

        {streaming ? (
          <Button type="button" size="icon-lg" aria-label="Stop generating" onClick={onStop} className="rounded-xl bg-orange-500 text-white hover:bg-orange-600">
            <Square className="size-3 fill-current" />
          </Button>
        ) : !value.trim() && onVoice ? (
          <Button
            type="button"
            size="icon-lg"
            aria-label="Talk to Barry"
            title="Talk to Barry"
            onClick={onVoice}
            className="rounded-xl bg-orange-500 text-white hover:bg-orange-600"
          >
            <AudioLines className="size-[18px]" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon-lg"
            aria-label="Send message"
            disabled={!canSend}
            className="rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
          >
            <ArrowUp className="size-[18px]" strokeWidth={2.25} />
          </Button>
        )}
      </div>
    </form>
  );
}
