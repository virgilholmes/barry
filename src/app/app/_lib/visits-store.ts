import { createLocalStore } from "./local-store";

export type VisitSummary = {
  title: string;
  overview: string;
  questions: { question: string; answer: string }[];
  instructions: string[];
  medicines: string[];
  followUps: string[];
  unclear: string[];
};

export type Visit = {
  id: string;
  startedAt: number;
  endedAt: number;
  summary: VisitSummary | null;
  transcript: string[];
  /** Instructions the patient has ticked off. */
  done: string[];
};

const store = createLocalStore<Visit[]>({
  key: "barry:visits",
  fallback: [],
  parse: (raw) => (Array.isArray(raw) ? (raw as Visit[]) : []),
});

export const useVisits = store.use;

export function startTime() {
  return Date.now();
}

export function saveVisit(visit: Omit<Visit, "id" | "done" | "endedAt">) {
  const id = crypto.randomUUID();
  store.set((visits) => [{ ...visit, id, endedAt: Date.now(), done: [] }, ...visits]);
  return id;
}

export function toggleDone(id: string, instruction: string) {
  store.set((visits) =>
    visits.map((visit) =>
      visit.id === id
        ? {
            ...visit,
            done: visit.done.includes(instruction)
              ? visit.done.filter((item) => item !== instruction)
              : [...visit.done, instruction],
          }
        : visit,
    ),
  );
}

export function deleteVisit(id: string) {
  store.set((visits) => visits.filter((visit) => visit.id !== id));
}

export function visitTitle(visit: Visit) {
  return visit.summary?.title || "Appointment";
}
