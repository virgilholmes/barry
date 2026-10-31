import Link from "next/link";
import { Logo } from "@/components/logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center px-5 sm:h-20 sm:px-10">
        <Link href="/" aria-label="Barry home">
          <Logo className="h-6 sm:h-7" />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-[10vh]">{children}</main>
    </div>
  );
}
