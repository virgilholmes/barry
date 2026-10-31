import type { Metadata } from "next";
import { Barry } from "./_components/barry";

export const metadata: Metadata = {
  title: "Barry",
  description: "The voice agent that goes to the doctor with you.",
};

// Barry locks the app behind a PIN or password before showing anything saved.
export default function AppPage() {
  return <Barry />;
}
