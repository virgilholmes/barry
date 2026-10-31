import Image from "next/image";
import { cn } from "@/lib/utils";
import barry from "@/assets/barry.png";

export function Logo({ className }: { className?: string }) {
  return <Image src={barry} alt="Barry" priority className={cn("h-5 w-auto select-none", className)} />;
}
