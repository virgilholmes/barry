import Link from "next/link";
import type { ReactNode } from "react";
import {
  legalPolicies,
  legalUpdatedAt,
  legalUpdatedLabel,
} from "@/lib/legal";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalDocumentProps = {
  policy: keyof typeof legalPolicies;
  summary: readonly string[];
  sections: readonly LegalSection[];
};

export function LegalDocument({
  policy,
  summary,
  sections,
}: LegalDocumentProps) {
  const document = legalPolicies[policy];
  const contactEmail = process.env.BARRY_LEGAL_CONTACT_EMAIL?.trim();
  const documentSections: LegalSection[] = [
    ...sections,
    {
      id: "contact",
      title: "Questions and accessible formats",
      content: (
        <>
          <p>
            {contactEmail ? (
              <>
                For questions about this policy or to request an accessible
                format, email the Barry team at{" "}
                <a className="break-words" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
                .
              </>
            ) : (
              <>
                For questions about this policy or to request an accessible
                format, contact the Barry team through the person or organization
                that provided your access to Barry.
              </>
            )}
          </p>
          <p>
            Include the policy title and the section you are asking about so we
            can help you find the right information.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="flex-1 bg-zinc-50 font-sans text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 print:bg-white print:text-black">
      <a
        href="#policy-content"
        className="sr-only rounded-lg bg-emerald-800 px-4 py-3 font-medium text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 print:hidden"
      >
        Skip to policy content
      </a>

      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600"
          >
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-xl bg-emerald-800 text-2xl text-white dark:bg-emerald-300 dark:text-emerald-950"
            >
              b
            </span>
            Barry
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-300 px-5 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Open Barry <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8 sm:py-16 print:max-w-none print:p-0">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold tracking-widest text-emerald-800 uppercase dark:text-emerald-300 print:text-black">
            Barry / Legal
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            {document.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600 dark:text-zinc-400 print:text-black">
            {document.description}
          </p>
          <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400 print:text-black">
            Last updated: <time dateTime={legalUpdatedAt}>{legalUpdatedLabel}</time>
          </p>
        </header>

        <nav
          aria-label="Policy navigation"
          className="mt-8 border-b border-zinc-200 pb-6 dark:border-zinc-800 print:hidden"
        >
          <ul className="flex flex-wrap gap-2">
            {Object.values(legalPolicies).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.href === document.href ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 ${
                    item.href === document.href
                      ? "bg-emerald-800 text-white dark:bg-emerald-300 dark:text-emerald-950"
                      : "text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                  }`}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14 print:block">
          <aside className="lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto print:hidden">
            <details
              open
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <summary className="cursor-pointer rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">
                On this page
              </summary>
              <nav aria-label="Table of contents" className="mt-4">
                <ol className="space-y-1">
                  {documentSections.map((section, index) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="flex gap-2 rounded-sm py-2 text-sm leading-5 text-zinc-600 hover:text-emerald-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-300"
                      >
                        <span aria-hidden="true" className="w-5 shrink-0 tabular-nums">
                          {index + 1}.
                        </span>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </details>
          </aside>

          <article
            id="policy-content"
            aria-label={document.title}
            tabIndex={-1}
            className="min-w-0 scroll-mt-8"
          >
            <section
              aria-labelledby="policy-summary"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8 dark:border-emerald-900 dark:bg-emerald-950/40 print:break-inside-avoid print:border-zinc-300 print:bg-white"
            >
              <h2
                id="policy-summary"
                className="text-lg font-semibold text-emerald-950 dark:text-emerald-100 print:text-black"
              >
                In plain language
              </h2>
              <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-emerald-950 dark:text-emerald-100 print:text-black">
                {summary.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-6 text-emerald-800 dark:text-emerald-300 print:text-black">
                These highlights are a guide. The full policy below applies.
              </p>
            </section>

            <div className="mt-10 space-y-10">
              {documentSections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-heading`}
                  tabIndex={-1}
                  className="scroll-mt-8 border-b border-zinc-200 pb-10 last:border-0 last:pb-0 dark:border-zinc-800 print:border-zinc-300"
                >
                  <h2
                    id={`${section.id}-heading`}
                    className="text-xl leading-8 font-semibold tracking-tight print:break-after-avoid"
                  >
                    {index + 1}. {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-base leading-7 text-zinc-700 dark:text-zinc-300 print:text-black [&_a]:rounded-sm [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-emerald-600 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
