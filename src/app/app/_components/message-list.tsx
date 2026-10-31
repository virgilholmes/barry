"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "../_lib/chat-store";

export function MessageList({ messages, streaming }: { messages: Message[]; streaming: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const last = messages.at(-1);

  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, last?.content]);

  return (
    <div
      ref={scroller}
      onScroll={(event) => {
        const el = event.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 pb-10">
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-stone-100 px-4 py-2.5 leading-7 break-words whitespace-pre-wrap sm:max-w-[70%]">
                {message.content}
              </div>
            </div>
          ) : (
            <AssistantMessage
              key={message.id}
              content={message.content}
              pending={streaming && message.id === last?.id}
            />
          ),
        )}
      </div>
    </div>
  );
}

function AssistantMessage({ content, pending }: { content: string; pending: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-stone-400">Barry</span>
      {content ? (
        <div className="leading-7 break-words whitespace-pre-wrap">{content}</div>
      ) : (
        <span className="animate-pulse leading-7 text-muted-foreground">Thinking…</span>
      )}
      {content && !pending && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={copied ? "Copied" : "Copy message"}
          className="-ml-1.5 text-muted-foreground"
          onClick={async () => {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      )}
    </div>
  );
}
