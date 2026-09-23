"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatRoom } from "@/components/ChatRoom";

function ChatQueryHandler() {
  const searchParams = useSearchParams();
  const mode = searchParams?.get("mode") === "text" ? "text" : "video";
  return <ChatRoom initialMode={mode} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#f8f8fb]">Loading...</div>}>
      <ChatQueryHandler />
    </Suspense>
  );
}
