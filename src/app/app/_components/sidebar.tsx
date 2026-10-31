"use client";

import { useEffect, useRef, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { AudioLines, ChevronRight, Lock, PanelLeft, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useLockControls } from "./barry";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { Chat } from "../_lib/chat-store";
import { visitTitle, type Visit } from "../_lib/visits-store";

type SidebarProps = {
  chats: Chat[];
  activeId: string | null;
  visits: Visit[];
  activeVisitId: string | null;
  profileActive: boolean;
  profileCount: number;
  roomActive: boolean;
  open: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onCloseMobile: () => void;
  onNewChat: () => void;
  onOpenProfile: () => void;
  onOpenRoom: () => void;
  onOpenVisit: (id: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export function Sidebar({
  chats,
  activeId,
  visits,
  activeVisitId,
  profileActive,
  profileCount,
  roomActive,
  open,
  mobileOpen,
  onCollapse,
  onCloseMobile,
  onNewChat,
  onOpenProfile,
  onOpenRoom,
  onOpenVisit,
  onSelect,
  onDelete,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const controls = useLockControls();

  const filtered = query
    ? chats.filter((chat) => chat.title.toLowerCase().includes(query.toLowerCase()))
    : chats;
  const times = relativeTimes(filtered);
  const matchingVisits = query
    ? visits.filter((visit) => visitTitle(visit).toLowerCase().includes(query.toLowerCase()))
    : visits;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <div
        aria-hidden
        onClick={onCloseMobile}
        className={cn(
          "fixed inset-0 z-40 bg-black/25 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 overflow-hidden border-r border-stone-200 bg-stone-100 text-foreground transition-[translate,width] duration-200 ease-out",
          "md:relative md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          open ? "md:w-64" : "md:w-0 md:border-r-0",
        )}
      >
        <div className="flex h-full w-72 flex-col md:w-64">
          <div className="flex h-14 shrink-0 items-center gap-0.5 pr-2 pl-4">
            <Logo className="mr-auto" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="New chat"
              title="New chat (⇧⌘O)"
              className="text-stone-500 hover:bg-stone-200/70"
              onClick={onNewChat}
            >
              <Plus className="size-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close sidebar"
              className="text-stone-500 hover:bg-stone-200/70"
              onClick={() => (mobileOpen ? onCloseMobile() : onCollapse())}
            >
              <PanelLeft className="size-[18px]" />
            </Button>
          </div>

          <div className="px-3">
            <label className="flex h-9 items-center gap-2 rounded-lg bg-stone-200/50 px-2.5 text-stone-500 transition-colors focus-within:bg-white focus-within:ring-1 focus-within:ring-stone-300">
              <Search className="size-4 shrink-0" />
              <input
                ref={search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setQuery("");
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Search"
                aria-label="Search appointments and conversations"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-stone-500"
              />
              <kbd className="font-sans text-xs text-stone-400">⌘K</kbd>
            </label>

            <button
              onClick={onOpenRoom}
              aria-current={roomActive ? "page" : undefined}
              className={cn(
                "mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white shadow-[0_1px_2px_rgb(194_65_12/0.25)] transition-colors",
                roomActive ? "bg-orange-600" : "bg-orange-500 hover:bg-orange-600",
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20">
                <AudioLines className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">In the room</span>
                <span className="block truncate text-xs text-white/80">Start an appointment</span>
              </span>
            </button>

            <button
              onClick={onOpenProfile}
              aria-current={profileActive ? "page" : undefined}
              className={cn(
                "group mt-2 flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors",
                profileActive ? "border-stone-300" : "border-stone-200/80 hover:border-stone-300",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">What Barry Knows</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {profileCount === 0
                    ? "Set up your profile"
                    : `Your profile · ${profileCount} ${profileCount === 1 ? "detail" : "details"}`}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto px-3 pb-3">
            {matchingVisits.length > 0 && (
              <section className="mb-5">
                <h2 className="px-2 pb-1.5 text-xs font-medium text-stone-500">Appointments</h2>
                <ul className="flex flex-col gap-px">
                  {matchingVisits.map((visit) => {
                    const active = visit.id === activeVisitId;
                    return (
                      <li key={visit.id}>
                        <button
                          onClick={() => onOpenVisit(visit.id)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm",
                            active ? "bg-stone-200/70 text-foreground" : "text-stone-700 hover:bg-stone-200/50",
                          )}
                        >
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-orange-500" />
                          <span className="min-w-0 flex-1 truncate">{visitTitle(visit)}</span>
                          <span className="shrink-0 text-xs text-stone-400">
                            {new Date(visit.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {(chats.length > 0 || query) && (
              <h2 className="px-2 pb-1.5 text-xs font-medium text-stone-500">Conversations</h2>
            )}
            {query && filtered.length === 0 && matchingVisits.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Nothing matches “{query}”</p>
            )}
            <ul className="flex flex-col gap-px">
              {filtered.map((chat) => {
                const active = chat.id === activeId;
                return (
                  <li
                    key={chat.id}
                    className={cn(
                      "group/chat relative flex h-9 items-center rounded-lg",
                      active ? "bg-stone-200/70" : "hover:bg-stone-200/50",
                    )}
                  >
                    <button
                      onClick={() => onSelect(chat.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "h-full min-w-0 flex-1 truncate rounded-lg pr-12 pl-2 text-left text-sm outline-none",
                        active ? "text-foreground" : "text-stone-700",
                      )}
                    >
                      {chat.title}
                    </button>
                    <span className="pointer-events-none absolute right-2 text-xs text-stone-400 tabular-nums group-hover/chat:opacity-0 max-md:hidden">
                      {times.get(chat.id)}
                    </span>
                    <button
                      aria-label={`Delete “${chat.title}”`}
                      onClick={() => onDelete(chat.id)}
                      className="absolute right-1.5 grid size-6 place-items-center rounded-md text-stone-400 opacity-0 transition-opacity group-hover/chat:opacity-100 hover:text-foreground focus-visible:opacity-100 max-md:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex shrink-0 gap-1 px-3 pt-2">
            <button
              onClick={controls.openPrivacy}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm text-stone-700 hover:bg-stone-200/50"
            >
              <ShieldCheck className="size-4" />
              Privacy
            </button>
            <button
              onClick={controls.lock}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm text-stone-700 hover:bg-stone-200/50"
            >
              <Lock className="size-4" />
              Lock
            </button>
          </div>
          <div className="flex h-16 shrink-0 items-center gap-3 px-5">
            <UserButton />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{user?.fullName || user?.username || "Your account"}</p>
              {user?.primaryEmailAddress && (
                <p className="truncate text-xs text-muted-foreground">{user.primaryEmailAddress.emailAddress}</p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function relativeTimes(chats: Chat[]) {
  const times = new Map<string, string>();
  // Chats only exist on the client, so this also keeps the clock out of prerendering.
  if (chats.length === 0) return times;
  const now = Date.now();
  for (const chat of chats) {
    const age = now - chat.updatedAt;
    times.set(
      chat.id,
      age < MINUTE
        ? "now"
        : age < HOUR
          ? `${Math.floor(age / MINUTE)}m`
          : age < DAY
            ? `${Math.floor(age / HOUR)}h`
            : age < 7 * DAY
              ? `${Math.floor(age / DAY)}d`
              : new Date(chat.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    );
  }
  return times;
}
