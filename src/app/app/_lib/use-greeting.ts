import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Client-only so the clock isn't read during prerendering.
export function useGreeting() {
  return useSyncExternalStore(subscribe, timeOfDay, () => null);
}
