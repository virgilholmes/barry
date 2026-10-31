"use client";

import { useRef, useState } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDictation } from "../_lib/use-dictation";

type ComposerProps = {
  streaming: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
  autoFocus?: boolean;
};

export function Composer({ streaming, onSubmit, onStop, autoFocus }: ComposerProps) {
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
      onClick={() => textarea.current?.focus()}
      className="flex w-full cursor-text flex-col gap-1 rounded-[28px] border bg-background p-2.5 shadow-[0_2px_16px_-4px_rgb(0_0_0/0.08)] transition-[border-color,box-shadow] focus-within:border-orange-300 focus-within:shadow-[0_0_0_4px_rgb(249_115_22/0.08),0_4px_24px_-6px_rgb(0_0_0/0.12)]"
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

      <div className="flex items-center justify-end gap-1">
        {dictation.supported && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={dictation.listening ? "Stop dictation" : "Dictate"}
            aria-pressed={dictation.listening}
            onClick={() => (dictation.listening ? dictation.stop() : dictation.start(value))}
            className={cn(
              "rounded-full text-muted-foreground",
              dictation.listening && "bg-orange-500/10 text-orange-600 hover:bg-orange-500/15 hover:text-orange-600",
            )}
          >
            <Mic className={cn("size-[18px]", dictation.listening && "animate-pulse")} />
          </Button>
        )}

        {streaming ? (
          <Button type="button" size="icon-lg" aria-label="Stop generating" onClick={onStop} className="rounded-full bg-orange-500 text-white hover:bg-orange-600">
            <Square className="size-3 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon-lg"
            aria-label="Send message"
            disabled={!canSend}
            className="rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
          >
            <ArrowUp className="size-[18px]" strokeWidth={2.25} />
          </Button>
        )}
      </div>
    </form>
  );
}
