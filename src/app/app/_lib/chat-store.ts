import { useSyncExternalStore } from "react";

export type Role = "user" | "assistant";

export type Message = {
  id: string;
  role: Role;
  content: string;
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

const STORAGE_KEY = "barry:chats";
const EMPTY: Chat[] = [];

let chats: Chat[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(parsed)) chats = parsed as Chat[];
  } catch {
    chats = EMPTY;
  }
}

function commit(next: Chat[]) {
  chats = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch {
    // Storage can be unavailable (private mode, quota). Chats still live in memory.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  load();
  return chats;
}

export function useChats() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function getChat(id: string) {
  load();
  return chats.find((chat) => chat.id === id);
}

function titleFrom(content: string) {
  const line = content.trim().split("\n")[0];
  return line.length > 48 ? `${line.slice(0, 48).trimEnd()}…` : line;
}

export function createChat(content: string) {
  load();
  const chat: Chat = {
    id: crypto.randomUUID(),
    title: titleFrom(content),
    messages: [{ id: crypto.randomUUID(), role: "user", content }],
    updatedAt: Date.now(),
  };
  commit([chat, ...chats]);
  return chat.id;
}

export function saveChat(title: string, messages: { role: Role; content: string }[]) {
  load();
  const chat: Chat = {
    id: crypto.randomUUID(),
    title,
    messages: messages.map((message) => ({ id: crypto.randomUUID(), ...message })),
    updatedAt: Date.now(),
  };
  commit([chat, ...chats]);
  return chat.id;
}

function updateChat(id: string, update: (chat: Chat) => Chat) {
  commit(chats.map((chat) => (chat.id === id ? update(chat) : chat)));
}

export function addMessage(chatId: string, role: Role, content: string) {
  const id = crypto.randomUUID();
  updateChat(chatId, (chat) => ({
    ...chat,
    messages: [...chat.messages, { id, role, content }],
    updatedAt: Date.now(),
  }));
  return id;
}

export function updateMessage(chatId: string, messageId: string, content: string) {
  updateChat(chatId, (chat) => ({
    ...chat,
    messages: chat.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
  }));
}

export function removeMessage(chatId: string, messageId: string) {
  updateChat(chatId, (chat) => ({
    ...chat,
    messages: chat.messages.filter((m) => m.id !== messageId),
  }));
}

export function deleteChat(id: string) {
  commit(chats.filter((chat) => chat.id !== id));
}
