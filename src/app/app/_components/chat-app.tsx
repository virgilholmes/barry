"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck, HandHeart, MessageCircleQuestion, PanelLeft, Pill, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { streamReply } from "../_lib/assistant";
import {
  addMessage,
  createChat,
  deleteChat,
  getChat,
  removeMessage,
  updateMessage,
  useChats,
} from "../_lib/chat-store";
import { Composer } from "./composer";
import { Logo } from "@/components/logo";
import { MessageList } from "./message-list";
import { Sidebar } from "./sidebar";

const suggestions = [
  { icon: CalendarCheck, label: "Prepare for an appointment", prompt: "Help me prepare for my next doctor's appointment." },
  { icon: Pill, label: "Update my medications", prompt: "I'd like to update my list of medications." },
  { icon: MessageCircleQuestion, label: "Explain what my doctor said", prompt: "Can you explain what my doctor told me in simple words?" },
  { icon: HandHeart, label: "How I like to communicate", prompt: "I want to tell you how I prefer to communicate during appointments." },
];

export function ChatApp() {
  const chats = useChats();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const activeChat = chats.find((chat) => chat.id === activeId) ?? null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openChat(id: string | null) {
    abort.current?.abort();
    setActiveId(id);
    setMobileOpen(false);
  }

  function removeChat(id: string) {
    if (id === activeId) openChat(null);
    deleteChat(id);
  }

  async function send(text: string) {
    if (streaming) return;

    let chatId = activeId;
    if (chatId) {
      addMessage(chatId, "user", text);
    } else {
      chatId = createChat(text);
      setActiveId(chatId);
    }

    const messages = getChat(chatId)?.messages ?? [];
    const replyId = addMessage(chatId, "assistant", "");
    const controller = new AbortController();
    abort.current = controller;
    setStreaming(true);

    let reply = "";
    try {
      for await (const chunk of streamReply({ messages, signal: controller.signal })) {
        reply += chunk;
        updateMessage(chatId, replyId, reply);
      }
    } finally {
      if (!reply) removeMessage(chatId, replyId);
      if (abort.current === controller) abort.current = null;
      setStreaming(false);
    }
  }

  const composer = (
    <Composer
      key={activeId ?? "new"}
      streaming={streaming}
      onSubmit={send}
      onStop={() => abort.current?.abort()}
      autoFocus
    />
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground selection:bg-orange-200">
      <Sidebar
        chats={chats}
        activeId={activeId}
        open={sidebarOpen}
        mobileOpen={mobileOpen}
        onCollapse={() => setSidebarOpen(false)}
        onCloseMobile={() => setMobileOpen(false)}
        onNewChat={() => openChat(null)}
        onSelect={openChat}
        onDelete={removeChat}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 px-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open sidebar"
            className={cn("text-muted-foreground md:hidden", !sidebarOpen && "md:inline-flex")}
            onClick={() => (window.matchMedia("(min-width: 48rem)").matches ? setSidebarOpen(true) : setMobileOpen(true))}
          >
            <PanelLeft className="size-[18px]" />
          </Button>
          {activeChat ? (
            <span className="truncate px-1.5 text-[15px] font-medium">{activeChat.title}</span>
          ) : (
            <Logo className={cn("ml-1.5 h-[18px]", sidebarOpen && "md:hidden")} />
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="New chat"
            className={cn("ml-auto text-muted-foreground", !activeChat ? "hidden" : sidebarOpen && "md:hidden")}
            onClick={() => openChat(null)}
          >
            <SquarePen className="size-[18px]" />
          </Button>
        </header>

        {activeChat ? (
          <>
            <MessageList messages={activeChat.messages} streaming={streaming} />
            <div className="mx-auto w-full max-w-3xl px-4 pb-3">
              {composer}
              <p className="pt-2.5 text-center text-xs text-muted-foreground">
                Barry can make mistakes. Check important details with your care team.
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-[10vh]">
            <h1 className="mb-8 text-center text-[28px] font-medium tracking-tight sm:text-[32px]">
              How can I help today?
            </h1>
            <div className="w-full max-w-3xl">{composer}</div>
            <div className="mt-5 flex w-full max-w-3xl flex-wrap justify-center gap-2">
              {suggestions.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => send(prompt)}
                  className="flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4 text-orange-500" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
