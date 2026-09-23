"use client";

import Link from "next/link";
import { useState, KeyboardEvent } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useInterests } from "@/hooks/useInterests";

const FAQ_ITEMS = [
  {
    q: "How does interest matching work?",
    a: "Add topics you enjoy—like 'tiktok', 'youtube', or 'gaming.' Our system prioritizes pairing you with people who list similar interests, increasing the chances of relevant, engaging conversations.",
  },
  {
    q: "How does Umingle help keep chats safer?",
    a: "We combine automated systems with human moderation to detect and reduce rule-breaking behavior according to our Community Rules. Reporting tools are always available. While we work hard to foster a positive space, please use your own judgment in online interactions.",
  },
  {
    q: "Why choose Umingle to chat with strangers online?",
    a: "We're built for better conversations. Our focus on interest matching, a strong moderation approach, and a clean user experience on any device are all designed to help you make quality connections.",
  },
  {
    q: "Can I use Umingle on my phone?",
    a: "Yes. Umingle runs in any modern browser on phones, tablets, and desktops—no app is required. Just open your browser and start chatting.",
  },
];

export default function HomePage() {
  const [interests, saveInterests] = useInterests();
  const [inputValue, setInputValue] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCurrentTag();
    } else if (e.key === "Backspace" && inputValue === "" && interests.length > 0) {
      saveInterests(interests.slice(0, -1));
    }
  };

  const addCurrentTag = () => {
    const trimmed = inputValue.trim().replace(/^,+|,+$/g, "");
    if (trimmed && !interests.includes(trimmed)) {
      const updated = [...interests, trimmed];
      saveInterests(updated);
      setInputValue("");
    }
  };

  const removeInterest = (tagToRemove: string) => {
    const updated = interests.filter((t) => t !== tagToRemove);
    saveInterests(updated);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-between bg-white dark:bg-[#0e0d14] overflow-x-hidden">
      {/* Background Organic Blob in top-right */}
      <div className="ambient-blob-tr" />

      {/* Full-width Sticky Header */}
      <Header />

      {/* Main Content Area - Seamless full page flow matching reference */}
      <main className="relative z-10 flex w-full max-w-5xl lg:max-w-6xl flex-col items-center px-4 sm:px-8 py-10 sm:py-16 md:py-20 gap-10 sm:gap-14 md:gap-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white sm:text-5xl md:text-6xl lg:text-[56px]">
            Chat with Strangers
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#4b5563] dark:text-gray-300 sm:text-lg md:text-xl">
            Ready to meet someone new? Umingle makes it easy to chat with strangers in
            random video or text chats. It&apos;s simple, fast, and time to start mingling!
          </p>
        </div>

        {/* Action Choice Buttons matching Screenshot 1 */}
        <div className="flex flex-col items-center gap-6 sm:gap-8 w-full max-w-full">
          <div className="flex items-center justify-center gap-3 sm:gap-5 max-w-full">
            <Link
              href="/text"
              className="flex h-[52px] sm:h-[60px] w-[125px] sm:w-[150px] md:w-[160px] items-center justify-center rounded-xl border-2 border-[#673ddc] bg-white text-xl sm:text-2xl font-bold text-[#673ddc] shadow-xs transition-all hover:bg-[#f6f3ff] active:scale-95 dark:bg-transparent dark:border-[#7c3aed] dark:text-[#a78bfa] dark:hover:bg-[#7c3aed]/10 cursor-pointer"
              id="start-text-btn"
            >
              Text
            </Link>
            <span className="text-sm sm:text-base font-medium text-gray-400 select-none">
              or
            </span>
            <Link
              href="/video"
              className="flex h-[52px] sm:h-[60px] w-[125px] sm:w-[150px] md:w-[160px] items-center justify-center rounded-xl bg-[#673ddc] text-xl sm:text-2xl font-bold text-white shadow-[0_4px_16px_rgba(103,61,220,0.3)] transition-all hover:bg-[#5b34c9] active:scale-95 dark:bg-[#7c3aed] dark:hover:bg-[#6d28d9] cursor-pointer"
              id="start-video-btn"
            >
              Video
            </Link>
          </div>

          {/* Interest Input Area */}
          <div className="flex w-full max-w-[520px] flex-col items-center gap-2.5 px-1 sm:px-0">
            <div className="text-sm sm:text-base md:text-lg font-semibold text-[#18181b] dark:text-gray-200 text-center">
              What do you want to talk about?
            </div>

            <div
              className="relative flex min-h-[48px] sm:min-h-[50px] w-full flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 sm:p-2.5 shadow-xs transition-colors focus-within:border-[#673ddc] focus-within:ring-2 focus-within:ring-[#673ddc]/10 dark:border-gray-700 dark:bg-[#161520] cursor-text"
              onClick={() => document.getElementById("interest-input")?.focus()}
            >
              {/* Render Tag Chips matching reference Screenshot 1 */}
              {interests.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#f0ecfe] px-2.5 sm:px-3.5 py-1 text-xs sm:text-sm font-semibold text-[#5b34c9] dark:bg-[#282142] dark:text-[#c4b5fd]"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeInterest(tag);
                  }}
                >
                  <span className="break-all">{tag}</span>
                  <button
                    type="button"
                    className="ml-0.5 text-base font-bold leading-none text-[#673ddc] opacity-60 hover:opacity-100 cursor-pointer dark:text-[#c4b5fd]"
                    aria-label={`Remove interest ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}

              {/* Input for new tag */}
              <input
                id="interest-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addCurrentTag}
                placeholder={interests.length === 0 ? "Add your interests (optional)" : "Add more..."}
                className="flex-1 bg-transparent px-2 text-sm sm:text-base text-gray-800 placeholder-gray-400 outline-none min-w-[85px] sm:min-w-[120px] dark:text-gray-200"
              />
            </div>
          </div>

          {/* Moderation Pill matching reference Screenshot 1 */}
          <div className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-[#ece7fe] bg-[#f4f1fd] px-3.5 sm:px-6 py-2 sm:py-2.5 text-center text-xs sm:text-sm md:text-base font-semibold text-[#4f46e5] dark:border-[#342758] dark:bg-[#231b40] dark:text-[#c4b5fd]">
            <span className="text-sm sm:text-base select-none">💬</span>
            <span className="leading-snug">Chats are moderated. Please keep it respectful</span>
          </div>
        </div>

        {/* 4 Feature Cards matching reference Screenshot 1 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 w-full">
          {/* Card 1: Interest-Based Matching */}
          <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-[0_4px_25px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1 dark:border-gray-800 dark:bg-[#161520]">
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4f0ff] text-[#7c3aed] dark:bg-[#282142] dark:text-[#c4b5fd]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              Interest-Based Matching
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6b7280] dark:text-gray-400">
              Add topics you love and get paired with people who share them.
            </p>
          </div>

          {/* Card 2: Active Moderation */}
          <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-[0_4px_25px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1 dark:border-gray-800 dark:bg-[#161520]">
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4f0ff] text-[#7c3aed] dark:bg-[#282142] dark:text-[#c4b5fd]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              Active Moderation
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6b7280] dark:text-gray-400">
              Automated systems and human mods work to keep chats in check.
            </p>
          </div>

          {/* Card 3: Global Community */}
          <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-[0_4px_25px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1 dark:border-gray-800 dark:bg-[#161520]">
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4f0ff] text-[#7c3aed] dark:bg-[#282142] dark:text-[#c4b5fd]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              Global Community
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6b7280] dark:text-gray-400">
              Thousands of people online around the world, day and night.
            </p>
          </div>

          {/* Card 4: Instant & Anonymous */}
          <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-[0_4px_25px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1 dark:border-gray-800 dark:bg-[#161520]">
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4f0ff] text-[#7c3aed] dark:bg-[#282142] dark:text-[#c4b5fd]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              Instant &amp; Anonymous
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6b7280] dark:text-gray-400">
              No sign-up needed. Click once and you&apos;re chatting.
            </p>
          </div>
        </div>

        {/* FAQ Accordion Section matching reference Screenshot 2 */}
        <div className="w-full pt-4 max-w-4xl mx-auto flex flex-col gap-6 sm:gap-8">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[#111827] dark:text-white">
            Frequently Asked Questions
          </h2>

          <div className="flex flex-col gap-3.5">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs transition-all dark:border-gray-800 dark:bg-[#161520]"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-5 sm:p-6 text-left font-semibold text-[#18181b] bg-white transition-colors dark:bg-[#161520] dark:text-gray-200 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base sm:text-lg font-semibold">{item.q}</span>
                    <span className="ml-4 text-xl font-light text-gray-400 select-none">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 bg-white p-5 sm:p-6 text-sm sm:text-base leading-relaxed text-[#4b5563] dark:border-gray-800 dark:bg-[#161520] dark:text-gray-300">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Full-width Integrated Footer matching Screenshot 2 */}
      <Footer />
    </div>
  );
}
