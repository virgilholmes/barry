import Link from "next/link";
import { legalPolicies } from "@/lib/legal";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white font-sans dark:border-zinc-800 dark:bg-zinc-950 print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/"
            className="rounded-sm text-lg font-semibold tracking-tight text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 dark:text-zinc-50"
          >
            Barry
          </Link>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Your voice. Your care.
          </p>
        </div>
        <nav aria-label="Legal policies">
          <ul className="flex flex-col gap-x-6 gap-y-1 sm:flex-row sm:flex-wrap">
            {Object.values(legalPolicies).map((policy) => (
              <li key={policy.href}>
                <Link
                  href={policy.href}
                  className="inline-flex min-h-11 items-center rounded-sm text-sm text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  {policy.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
