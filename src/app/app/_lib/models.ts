import { useSyncExternalStore } from "react";

export const models = [
  { id: "auto", name: "Auto", label: "Auto", description: "Picks the right model for each message" },
  { id: "one", name: "Barry One", label: "One", description: "Quick answers for everyday questions" },
  { id: "pro", name: "Barry Pro", label: "Pro", description: "Thinks longer for complex medical details" },
] as const;

export type ModelId = (typeof models)[number]["id"];

const STORAGE_KEY = "barry:model";
const DEFAULT_MODEL: ModelId = "auto";
const listeners = new Set<() => void>();

function isModelId(value: unknown): value is ModelId {
  return models.some((model) => model.id === value);
}

function getSnapshot(): ModelId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isModelId(saved) ? saved : DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useModel() {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_MODEL);
}

export function setModel(id: ModelId) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage unavailable; the choice just won't persist.
  }
  listeners.forEach((listener) => listener());
}

export function getModel(id: ModelId) {
  return models.find((model) => model.id === id) ?? models[0];
}
