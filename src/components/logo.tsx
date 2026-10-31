import Image from "next/image";
import { cn } from "@/lib/utils";
import barry from "@/assets/barry.png";

export function Logo({ className }: { className?: string }) {
  // The wordmark is black; invert it on dark backgrounds.
  return (
    <Image src={barry} alt="Barry" loading="eager" className={cn("h-5 w-auto select-none dark:invert", className)} />
  );
}
