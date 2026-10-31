"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  COMMUNICATION_PREFERENCES,
  SECTION_TITLES,
  sharedDetails,
  type Allergy,
  type Condition,
  type Medication,
  type Profile,
  type ShareSection,
  type Supporter,
} from "@/lib/profile";
import { setOnboarded, updateProfile, useProfile } from "../_lib/profile-store";

type Field<T> = {
  key: keyof T & string;
  label: string;
  placeholder?: string;
  required?: boolean;
  kind?: "text" | "tel" | "severity" | "checkbox";
};

export function ProfileView() {
  const profile = useProfile();

  function setList<K extends "medications" | "allergies" | "conditions" | "support">(key: K) {
    return {
      save: (item: Profile[K][number]) =>
        updateProfile((current) => {
          const list = current[key] as { id: string }[];
          const exists = list.some((entry) => entry.id === item.id);
          return {
            ...current,
            [key]: exists ? list.map((entry) => (entry.id === item.id ? item : entry)) : [...list, item],
          };
        }),
      remove: (id: string) =>
        updateProfile((current) => ({
          ...current,
          [key]: (current[key] as { id: string }[]).filter((entry) => entry.id !== id),
        })),
    };
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 pt-8 pb-24 sm:pt-14">
        <h1 className="text-2xl font-semibold tracking-tight">What Barry Knows</h1>
        <p className="mt-1.5 max-w-xl text-[15px] text-pretty text-muted-foreground">
          Your profile. Tell Barry once, and he uses it to speak up for you in appointments, so you don&apos;t have
          to repeat your story.
        </p>
        <button
          onClick={() => setOnboarded(false)}
          className="mt-4 text-sm font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
        >
          Set up with Barry again
        </button>

        <div className="mt-10 divide-y divide-stone-200/70 border-t border-stone-200/70 dark:divide-stone-800 dark:border-stone-800">
          <Section title="Your name" description="What Barry calls you, and how he introduces you.">
            <input
              value={profile.name}
              onChange={(event) => updateProfile((current) => ({ ...current, name: event.target.value }))}
              placeholder="Your name"
              aria-label="Your name"
              className="h-10 w-full max-w-xs rounded-lg border border-stone-200 bg-transparent px-3 text-[15px] outline-none placeholder:text-stone-400 focus:border-stone-400 dark:border-stone-500 dark:focus:border-white"
            />
          </Section>
          <ListSection<Medication>
            title="Medications"
            description="What you take, how much, and when."
            noun="medication"
            items={profile.medications}
            blank={{ id: "", name: "", dose: "", schedule: "", reason: "" }}
            fields={[
              { key: "name", label: "Name", placeholder: "Metformin", required: true },
              { key: "dose", label: "Dose", placeholder: "500 mg" },
              { key: "schedule", label: "When", placeholder: "Twice a day, with food" },
              { key: "reason", label: "What it's for", placeholder: "Diabetes" },
            ]}
            primary={(m) => m.name}
            secondary={(m) => [[m.dose, m.schedule].filter(Boolean).join(" · "), m.reason && `For ${m.reason}`]}
            {...setList("medications")}
          />

          <ListSection<Allergy>
            title="Allergies"
            description="Medicines, foods, or anything else to avoid."
            noun="allergy"
            items={profile.allergies}
            blank={{ id: "", substance: "", reaction: "", severity: "" }}
            fields={[
              { key: "substance", label: "Allergic to", placeholder: "Penicillin", required: true },
              { key: "reaction", label: "What happens", placeholder: "Hives, trouble breathing" },
              { key: "severity", label: "How serious", kind: "severity" },
            ]}
            primary={(a) => a.substance}
            secondary={(a) => [a.reaction]}
            badge={(a) =>
              a.severity && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    a.severity === "severe" ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-white",
                  )}
                >
                  {a.severity}
                </span>
              )
            }
            {...setList("allergies")}
          />

          <ListSection<Condition>
            title="Conditions"
            description="Diagnoses and ongoing health conditions."
            noun="condition"
            items={profile.conditions}
            blank={{ id: "", name: "", notes: "" }}
            fields={[
              { key: "name", label: "Condition", placeholder: "Cerebral palsy", required: true },
              { key: "notes", label: "Anything to know", placeholder: "Affects my speech and hand movement" },
            ]}
            primary={(c) => c.name}
            secondary={(c) => [c.notes]}
            {...setList("conditions")}
          />

          <CommunicationSection profile={profile} />

          <ListSection<Supporter>
            title="People who help me"
            description="Family, carers, or advocates who come with you or help you decide."
            noun="person"
            items={profile.support}
            blank={{ id: "", name: "", relationship: "", phone: "", decides: false }}
            fields={[
              { key: "name", label: "Name", placeholder: "Jane", required: true },
              { key: "relationship", label: "Who they are", placeholder: "Mom" },
              { key: "phone", label: "Phone", placeholder: "555-0100", kind: "tel" },
              { key: "decides", label: "Helps me make decisions", kind: "checkbox" },
            ]}
            primary={(s) => s.name}
            secondary={(s) => [[s.relationship, s.phone].filter(Boolean).join(" · ")]}
            badge={(s) =>
              s.decides && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  Helps decide
                </span>
              )
            }
            {...setList("support")}
          />

          <ShareSection profile={profile} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 py-8 sm:grid-cols-[13rem_1fr] sm:gap-10">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ListSection<T extends { id: string }>({
  title,
  description,
  noun,
  items,
  blank,
  fields,
  primary,
  secondary,
  badge,
  save,
  remove,
}: {
  title: string;
  description: string;
  noun: string;
  items: T[];
  blank: T;
  fields: Field<T>[];
  primary: (item: T) => string;
  secondary: (item: T) => (string | false | undefined)[];
  badge?: (item: T) => React.ReactNode;
  save: (item: T) => void;
  remove: (id: string) => void;
}) {
  const [draft, setDraft] = useState<T | null>(null);

  const form = draft && (
    <ItemForm
      fields={fields}
      draft={draft}
      onChange={setDraft}
      onCancel={() => setDraft(null)}
      onSave={() => {
        save({ ...draft, id: draft.id || crypto.randomUUID() });
        setDraft(null);
      }}
    />
  );

  return (
    <Section title={title} description={description}>
      {items.length > 0 && (
        <ul className="-mt-2 mb-2 divide-y divide-stone-100 dark:divide-stone-800">
          {items.map((item) =>
            draft?.id === item.id ? (
              <li key={item.id} className="py-3">
                {form}
              </li>
            ) : (
              <li key={item.id} className="group/item flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
                    {primary(item)}
                    {badge?.(item)}
                  </p>
                  {secondary(item)
                    .filter(Boolean)
                    .map((text) => (
                      <p key={String(text)} className="text-sm text-muted-foreground">
                        {text}
                      </p>
                    ))}
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100 max-md:opacity-100">
                  <IconButton label={`Edit ${primary(item)}`} onClick={() => setDraft(item)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label={`Remove ${primary(item)}`} onClick={() => remove(item.id)}>
                    <X className="size-4" />
                  </IconButton>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {draft && !draft.id ? (
        form
      ) : (
        <button
          onClick={() => setDraft({ ...blank })}
          className="-ml-1 flex h-9 items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-4" />
          Add {noun}
        </button>
      )}
    </Section>
  );
}

function ItemForm<T extends { id: string }>({
  fields,
  draft,
  onChange,
  onCancel,
  onSave,
}: {
  fields: Field<T>[];
  draft: T;
  onChange: (draft: T) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const valid = fields.every((field) => !field.required || String(draft[field.key] ?? "").trim());
  const set = (key: keyof T, value: unknown) => onChange({ ...draft, [key]: value });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSave();
      }}
      onKeyDown={(event) => event.key === "Escape" && onCancel()}
      className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field, index) =>
          field.kind === "checkbox" ? (
            <label key={field.key} className="flex items-center gap-2.5 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(draft[field.key])}
                onChange={(event) => set(field.key, event.target.checked)}
                className="size-4 accent-orange-500"
              />
              {field.label}
            </label>
          ) : (
            <label key={field.key} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                {field.label}
                {field.required && <span className="text-stone-400"> (required)</span>}
              </span>
              {field.kind === "severity" ? (
                <select
                  value={String(draft[field.key] ?? "")}
                  onChange={(event) => set(field.key, event.target.value)}
                  className="h-10 rounded-lg border border-stone-200 bg-transparent px-2.5 text-[15px] outline-none focus:border-stone-400 dark:border-stone-500 dark:focus:border-white"
                >
                  <option value="">Not sure</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              ) : (
                <input
                  autoFocus={index === 0}
                  type={field.kind === "tel" ? "tel" : "text"}
                  value={String(draft[field.key] ?? "")}
                  onChange={(event) => set(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="h-10 rounded-lg border border-stone-200 bg-transparent px-3 text-[15px] outline-none placeholder:text-stone-400 focus:border-stone-400 dark:border-stone-500 dark:focus:border-white"
                />
              )}
            </label>
          ),
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="h-9 rounded-lg px-3">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!valid}
          className="h-9 rounded-lg bg-orange-500 px-4 text-white hover:bg-orange-600 disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function CommunicationSection({ profile }: { profile: Profile }) {
  const selected = profile.communication.preferences;

  function toggle(id: string) {
    updateProfile((current) => ({
      ...current,
      communication: {
        ...current.communication,
        preferences: current.communication.preferences.includes(id)
          ? current.communication.preferences.filter((p) => p !== id)
          : [...current.communication.preferences, id],
      },
    }));
  }

  return (
    <Section title="How I communicate" description="Barry follows these, and shares them so your care team can too.">
      <div className="-mt-1 flex flex-col">
        {COMMUNICATION_PREFERENCES.map((preference) => (
          <label key={preference.id} className="flex cursor-pointer items-center gap-3 py-2 text-[15px]">
            <input
              type="checkbox"
              checked={selected.includes(preference.id)}
              onChange={() => toggle(preference.id)}
              className="size-4 shrink-0 accent-orange-500"
            />
            {preference.label}
          </label>
        ))}
      </div>
      <TextArea
        label="Anything else about how you communicate"
        placeholder="e.g. I use a letter board. Yes is a thumbs up."
        value={profile.communication.notes}
        onChange={(notes) => updateProfile((current) => ({ ...current, communication: { ...current.communication, notes } }))}
      />
    </Section>
  );
}

function ShareSection({ profile }: { profile: Profile }) {
  const preview = sharedDetails(profile);

  return (
    <Section
      title="What Barry can share"
      description="In appointments, Barry only says what you allow here. He never shares anything else."
    >
      <div className="-mt-1 flex flex-col">
        {(Object.keys(SECTION_TITLES) as ShareSection[]).map((section) => (
          <label key={section} className="flex cursor-pointer items-center justify-between gap-4 py-2 text-[15px]">
            {SECTION_TITLES[section]}
            <Switch
              checked={profile.share[section]}
              label={`Share ${SECTION_TITLES[section]}`}
              onChange={(value) =>
                updateProfile((current) => ({ ...current, share: { ...current.share, [section]: value } }))
              }
            />
          </label>
        ))}
      </div>
      <TextArea
        label="Anything you want your care team to know"
        placeholder="e.g. I get anxious with needles. Please tell me before you touch me."
        value={profile.share.notes}
        onChange={(notes) => updateProfile((current) => ({ ...current, share: { ...current.share, notes } }))}
      />
      {preview.length > 0 && (
        <div className="mt-5 rounded-xl bg-stone-100 px-4 py-3 dark:bg-stone-800">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Barry may share</p>
          <dl className="mt-1.5 flex flex-col gap-1 text-sm">
            {preview.map((section) => (
              <div key={section.title}>
                <dt className="inline font-medium">{section.title}: </dt>
                <dd className="inline">{section.items.join("; ")}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Section>
  );
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 flex flex-col gap-1.5">
      <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className="field-sizing-content min-h-20 resize-none rounded-lg border border-stone-200 bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-stone-400 focus:border-stone-400 dark:border-stone-500 dark:focus:border-white"
      />
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-orange-500" : "bg-stone-300")}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-foreground dark:hover:bg-stone-800"
    >
      {children}
    </button>
  );
}
