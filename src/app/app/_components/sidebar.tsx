"use client";

import { useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { PanelLeft, Search, SquarePen, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Chat } from "../_lib/chat-store";
import { Logo } from "@/components/logo";

type SidebarProps = {
  chats: Chat[];
  activeId: string | null;
  open: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onCloseMobile: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export function Sidebar({
  chats,
  activeId,
  open,
  mobileOpen,
  onCollapse,
  onCloseMobile,
  onNewChat,
  onSelect,
  onDelete,
}: SidebarProps) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const { user } = useUser();

  const filtered = query
    ? chats.filter((chat) => chat.title.toLowerCase().includes(query.toLowerCase()))
    : chats;
  const groups = groupByDate(filtered);

  function closeSearch() {
    setSearching(false);
    setQuery("");
  }

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
          "fixed inset-y-0 left-0 z-50 w-72 overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[translate,width] duration-200 ease-out",
          "md:relative md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          open ? "md:w-64" : "md:w-0 md:border-r-0",
        )}
      >
        <div className="flex h-full w-72 flex-col md:w-64">
          <div className="flex h-14 shrink-0 items-center justify-between px-3">
            <Logo className="ml-1.5" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close sidebar"
              className="text-muted-foreground"
              onClick={() => (mobileOpen ? onCloseMobile() : onCollapse())}
            >
              <PanelLeft className="size-[18px]" />
            </Button>
          </div>

          <nav className="flex flex-col gap-px px-2">
            <SidebarButton icon={<SquarePen />} onClick={onNewChat}>
              New chat
            </SidebarButton>
            {searching ? (
              <div className="flex h-9 items-center gap-2.5 rounded-lg bg-sidebar-accent px-2.5">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Escape" && closeSearch()}
                  placeholder="Search chats"
                  aria-label="Search chats"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  aria-label="Clear search"
                  onClick={closeSearch}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <SidebarButton icon={<Search />} onClick={() => setSearching(true)}>
                Search chats
              </SidebarButton>
            )}
          </nav>

          <div className="mt-5 flex-1 overflow-y-auto px-2 pb-3">
            {query && filtered.length === 0 && (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">No chats found</p>
            )}
            {groups.map((group) => (
              <section key={group.label} className="mb-4">
                <h2 className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{group.label}</h2>
                <ul className="flex flex-col gap-px">
                  {group.chats.map((chat) => (
                    <li
                      key={chat.id}
                      className={cn(
                        "group/chat relative flex h-9 items-center rounded-lg hover:bg-sidebar-accent",
                        chat.id === activeId && "bg-sidebar-accent",
                      )}
                    >
                      <button
                        onClick={() => onSelect(chat.id)}
                        aria-current={chat.id === activeId ? "page" : undefined}
                        className="h-full min-w-0 flex-1 truncate rounded-lg pr-9 pl-2.5 text-left text-sm outline-none"
                      >
                        {chat.title}
                      </button>
                      <button
                        aria-label={`Delete “${chat.title}”`}
                        onClick={() => onDelete(chat.id)}
                        className="absolute right-1.5 grid size-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover/chat:opacity-100 hover:text-foreground focus-visible:opacity-100 max-md:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="flex h-16 shrink-0 items-center gap-3 border-t border-sidebar-border px-4">
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

function SidebarButton({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm hover:bg-sidebar-accent [&_svg]:size-4"
    >
      {icon}
      {children}
    </button>
  );
}

function groupByDate(chats: Chat[]) {
  // Chats only exist on the client, so this also keeps the clock out of prerendering.
  if (chats.length === 0) return [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const buckets = [
    { label: "Today", after: today },
    { label: "Yesterday", after: today - day },
    { label: "Previous 7 days", after: today - 7 * day },
    { label: "Previous 30 days", after: today - 30 * day },
    { label: "Older", after: -Infinity },
  ].map((bucket) => ({ ...bucket, chats: [] as Chat[] }));

  for (const chat of chats) {
    buckets.find((bucket) => chat.updatedAt >= bucket.after)?.chats.push(chat);
  }
  return buckets.filter((bucket) => bucket.chats.length > 0);
}
