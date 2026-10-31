"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, AudioLines, PanelLeft, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
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
import { useModel } from "../_lib/models";
import { countDetails } from "@/lib/profile";
import { getProfile, useOnboarded, useProfile } from "../_lib/profile-store";
import { useVisits } from "../_lib/visits-store";
import { useGreeting } from "../_lib/use-greeting";
import { useVoiceSession } from "../_lib/use-voice-session";
import { Composer } from "./composer";
import { ProfileView } from "./profile-view";
import { RoomView } from "./room-view";
import { VisitView } from "./visit-view";
import { VoiceView } from "./voice-view";
import { MessageList } from "./message-list";
import { Onboarding } from "./onboarding";
import { Sidebar } from "./sidebar";
import { useLockControls } from "./barry";

export function ChatApp() {
  const chats = useChats();
  const model = useModel();
  const greeting = useGreeting();
  const { user, isLoaded } = useUser();
  const profile = useProfile();
  const onboarded = useOnboarded();
  const emailName = user?.primaryEmailAddress?.emailAddress.split("@")[0].split(/[._+-]/)[0];
  const name =
    profile.name.trim() ||
    user?.firstName ||
    user?.username ||
    (emailName ? emailName.charAt(0).toUpperCase() + emailName.slice(1) : null);
  const visits = useVisits();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "profile" | "room" | "visit">("chat");
  const [visitId, setVisitId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const { setVisiting } = useLockControls();

  // A visit can run quietly for a long time, so Barry waits longer before locking during one.
  useEffect(() => setVisiting(view === "room"), [view, setVisiting]);

  const activeChat = view === "chat" ? (chats.find((chat) => chat.id === activeId) ?? null) : null;
  const activeVisit = view === "visit" ? (visits.find((visit) => visit.id === visitId) ?? null) : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        abort.current?.abort();
        setActiveId(null);
        setView("chat");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openChat(id: string | null) {
    voice.end();
    abort.current?.abort();
    setActiveId(id);
    setView("chat");
    setMobileOpen(false);
  }

  function openRoom() {
    voice.end();
    abort.current?.abort();
    setView("room");
    setMobileOpen(false);
  }

  function openVisit(id: string) {
    voice.end();
    abort.current?.abort();
    setVisitId(id);
    setView("visit");
    setMobileOpen(false);
  }

  function openProfile() {
    voice.end();
    abort.current?.abort();
    setView("profile");
    setMobileOpen(false);
  }

  function removeChat(id: string) {
    if (id === activeId) openChat(null);
    deleteChat(id);
  }

  async function send(text: string) {
    if (streaming) return "";

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
      for await (const chunk of streamReply({ messages, profile: getProfile(), model, signal: controller.signal })) {
        reply += chunk;
        updateMessage(chatId, replyId, reply);
      }
      if (!reply && !controller.signal.aborted) throw new Error("Please try again in a moment.");
    } catch (error) {
      if (!controller.signal.aborted) {
        const reason = error instanceof Error ? error.message : "Please try again in a moment.";
        reply = reply ? `${reply}\n\n(${reason})` : `Sorry, I couldn't answer that. ${reason}`;
        updateMessage(chatId, replyId, reply);
      }
    } finally {
      if (!reply) removeMessage(chatId, replyId);
      if (abort.current === controller) abort.current = null;
      setStreaming(false);
    }
    return reply;
  }

  const voice = useVoiceSession(send);
  const voiceActive = voice.status !== "idle";

  const voiceError = voice.error && (
    <p role="alert" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {voice.error}
    </p>
  );

  const composer = (
    <Composer
      key={activeId ?? "new"}
      streaming={streaming}
      onSubmit={send}
      onStop={() => abort.current?.abort()}
      onVoice={voice.supported ? voice.start : undefined}
      autoFocus
    />
  );

  return (
    <div className="app-surface flex h-dvh w-full overflow-hidden bg-stone-100 text-foreground selection:bg-orange-200">
      <Sidebar
        chats={chats}
        activeId={view === "chat" ? activeId : null}
        visits={visits}
        activeVisitId={activeVisit?.id ?? null}
        profileActive={view === "profile"}
        roomActive={view === "room"}
        profileCount={countDetails(profile)}
        open={sidebarOpen}
        mobileOpen={mobileOpen}
        onCollapse={() => setSidebarOpen(false)}
        onCloseMobile={() => setMobileOpen(false)}
        onNewChat={() => openChat(null)}
        onOpenProfile={openProfile}
        onOpenRoom={openRoom}
        onOpenVisit={openVisit}
        onSelect={openChat}
        onDelete={removeChat}
      />

      <main className="flex min-w-0 flex-1 flex-col bg-background">
        <header
          className={cn("flex h-14 shrink-0 items-center gap-1 px-3", view === "room" && sidebarOpen && "md:hidden")}
        >
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
            className={cn("ml-auto text-muted-foreground", !activeChat && view === "chat" ? "hidden" : sidebarOpen && "md:hidden")}
            onClick={() => openChat(null)}
          >
            <SquarePen className="size-[18px]" />
          </Button>
        </header>

        {voiceActive ? (
          <VoiceView status={voice.status} caption={voice.caption} onTap={voice.tap} onEnd={voice.end} />
        ) : view === "room" ? (
          <RoomView onFinish={openVisit} onEditProfile={openProfile} />
        ) : view === "profile" ? (
          <ProfileView />
        ) : activeVisit ? (
          <VisitView visit={activeVisit} onDeleted={() => openChat(null)} />
        ) : activeChat ? (
          <>
            <MessageList messages={activeChat.messages} streaming={streaming} />
            <div className="mx-auto w-full max-w-3xl px-4 pb-3">
              {voiceError}
              {composer}
              <p className="pt-2.5 text-center text-xs text-muted-foreground">
                Barry can make mistakes. Check important details with your care team.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-5 pt-10 sm:pt-16">
              <h1
                className={cn(
                  "text-[32px] leading-tight font-semibold tracking-tight text-balance transition-opacity duration-300 sm:text-[40px]",
                  greeting && isLoaded ? "opacity-100" : "opacity-0",
                )}
              >
                {greeting}
                {name && <span className="text-stone-400">, {name}</span>}
              </h1>
              <button
                onClick={openRoom}
                className="group mt-6 flex w-full max-w-md items-center gap-3 rounded-2xl bg-orange-500 py-3 pr-4 pl-3 text-left text-white shadow-[0_1px_2px_rgb(194_65_12/0.25)] transition-colors hover:bg-orange-600"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20">
                  <AudioLines className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg leading-snug font-semibold">Are you in the room?</span>
                  <span className="block text-sm text-white/85">Start your appointment and Barry will help.</span>
                </span>
                <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
              <p className="mt-4 text-muted-foreground">
                {voice.supported
                  ? "Or talk or type to Barry below."
                  : "Or type to Barry below. Voice works in Chrome, Edge and Safari."}
              </p>
            </div>
            <div className="mx-auto w-full max-w-3xl px-4 pb-3">
              {voiceError}
              {composer}
              <p className="pt-2.5 text-center text-xs text-muted-foreground">
                Barry can make mistakes. Check important details with your care team.
              </p>
            </div>
          </>
        )}
      </main>
      {onboarded === false && (
        <Onboarding
          onFinish={(next) => (next === "profile" ? openProfile() : next === "room" ? openRoom() : openChat(null))}
        />
      )}
    </div>
  );
}
