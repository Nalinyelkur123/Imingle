import { ChatRoom } from "@/components/ChatRoom";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Umingle: Video Chat with Strangers",
  description: "Connect via 1-on-1 random video chat on Umingle. Simple, fast, and anonymous.",
};

export default function VideoPage() {
  return <ChatRoom initialMode="video" />;
}
