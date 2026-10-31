"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteVisit, toggleDone, visitTitle, type Visit } from "../_lib/visits-store";

export function VisitView({ visit, onDeleted }: { visit: Visit; onDeleted: () => void }) {
  const [copied, setCopied] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const summary = visit.summary;
  const minutes = Math.max(1, Math.round((visit.endedAt - visit.startedAt) / 60_000));
  const date = new Date(visit.startedAt).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function copy() {
    await navigator.clipboard.writeText(asText(visit));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 pt-8 pb-24 sm:pt-14">
        <p className="text-sm text-muted-foreground">
          {date} · {minutes} min
        </p>
        <h1 className="mt-1 text-[32px] leading-tight font-semibold tracking-tight">{visitTitle(visit)}</h1>
        {summary?.overview && <p className="mt-3 text-lg text-pretty text-stone-600">{summary.overview}</p>}

        <div className="mt-6 flex gap-2">
          <Button variant="outline" onClick={copy} className="h-9 rounded-full px-3.5">
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy summary"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              deleteVisit(visit.id);
              onDeleted();
            }}
            className="h-9 rounded-full px-3.5 text-muted-foreground"
          >
            <Trash2 />
            Delete
          </Button>
        </div>

        {!summary && (
          <p className="mt-10 rounded-xl bg-stone-100 px-4 py-3 text-sm">
            {visit.transcript.length > 0
              ? "Barry couldn't organize this visit, but the full transcript is below."
              : "Nothing was picked up during this appointment."}
          </p>
        )}

        {summary && summary.unclear.length > 0 && (
          <section className="mt-10 rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
            <h2 className="font-semibold">Things to ask about</h2>
            <p className="mt-0.5 text-sm text-stone-600">You weren&apos;t sure about these. Ask your care team next time.</p>
            <ul className="mt-3 flex flex-col gap-2">
              {summary.unclear.map((item) => (
                <li key={item} className="flex gap-3 text-[15px]">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-orange-500" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary && summary.instructions.length > 0 && (
          <Section title="What to do">
            <ul className="flex flex-col">
              {summary.instructions.map((item) => {
                const done = visit.done.includes(item);
                return (
                  <li key={item}>
                    <label className="flex cursor-pointer items-start gap-3 py-2 text-[15px]">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleDone(visit.id, item)}
                        className="mt-0.5 size-5 shrink-0 accent-orange-500"
                      />
                      <span className={cn(done && "text-muted-foreground line-through")}>{item}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {summary && <List title="Medicine changes" items={summary.medicines} />}
        {summary && <List title="Follow-ups" items={summary.followUps} />}

        {summary && summary.questions.length > 0 && (
          <Section title="Questions you were asked">
            <dl className="flex flex-col divide-y divide-stone-100">
              {summary.questions.map((q) => (
                <div key={q.question} className="py-3 first:pt-0">
                  <dt className="text-[15px] font-medium">{q.question}</dt>
                  <dd className="mt-0.5 text-[15px] text-stone-600">{q.answer}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {visit.transcript.length > 0 && (
          <div className="mt-10 border-t border-stone-200/70 pt-6">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              aria-expanded={showTranscript}
              className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-foreground"
            >
              <ChevronDown className={cn("size-4 transition-transform", showTranscript && "rotate-180")} />
              Full transcript
            </button>
            {showTranscript && (
              <div className="mt-4 flex flex-col gap-2 text-[15px] leading-relaxed text-stone-600">
                {visit.transcript.map((line, index) => (
                  <p key={index} className={cn(/^(Barry|Me):/.test(line) && "text-foreground")}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[15px]">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-stone-300" />
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function asText(visit: Visit) {
  const s = visit.summary;
  const date = new Date(visit.startedAt).toLocaleDateString();
  if (!s) return `${visitTitle(visit)} (${date})\n\n${visit.transcript.join("\n")}`;
  const block = (title: string, items: string[]) =>
    items.length > 0 ? `\n\n${title}\n${items.map((i) => `- ${i}`).join("\n")}` : "";
  return (
    `${s.title} (${date})\n\n${s.overview}` +
    block("Things to ask about", s.unclear) +
    block("What to do", s.instructions) +
    block("Medicine changes", s.medicines) +
    block("Follow-ups", s.followUps) +
    block(
      "Questions you were asked",
      s.questions.map((q) => `${q.question} ${q.answer}`),
    )
  );
}
