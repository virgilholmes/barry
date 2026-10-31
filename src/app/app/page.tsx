import type { Metadata } from "next";
import { ChatApp } from "./_components/chat-app";

export const metadata: Metadata = {
  title: "Barry",
  description: "The voice agent that goes to the doctor with you.",
};

export default function AppPage() {
  return <ChatApp />;
}
