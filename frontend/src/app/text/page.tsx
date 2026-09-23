import { ChatRoom } from "@/components/ChatRoom";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Umingle: Text Chat with Strangers",
  description: "Connect via 1-on-1 random text chat on Umingle. Simple, fast, and anonymous.",
};

export default function TextPage() {
  return <ChatRoom initialMode="text" />;
}
