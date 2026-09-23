import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Rules & Guidelines — Umingle",
  description: "Read the Umingle community rules and safety guidelines for random 1-on-1 video and text chat.",
};

export default function RulesPage() {
  const rules = [
    {
      num: "01",
      title: "Be Respectful & Civil",
      desc: "Treat everyone with courtesy. Harassment, hate speech, bullying, discrimination based on race, ethnicity, religion, disability, sexual orientation, or gender will result in an immediate and permanent ban.",
      icon: "🤝",
    },
    {
      num: "02",
      title: "Strictly 18+ Community",
      desc: "Umingle is exclusively intended for adults aged 18 and older. Any user under the age of 18 or anyone depicting minors in any form will be permanently banned and reported to relevant authorities.",
      icon: "🔞",
    },
    {
      num: "03",
      title: "No Inappropriate or Explicit Content",
      desc: "Public feeds must remain safe and respectful. Unsolicited nudity, sexually suggestive behavior, violence, gore, or illegal activities are strictly forbidden.",
      icon: "🛡️",
    },
    {
      num: "04",
      title: "No Recording or Screenshotting",
      desc: "Respect the privacy of others. You must never record, screenshot, broadcast, or republish another user's video, audio, or messages without their explicit consent.",
      icon: "🚫",
    },
    {
      num: "05",
      title: "No Spam, Bots, or Commercial Promotion",
      desc: "Automated scripts, repetitive promotional messages, advertising links, solicitations, scams, or selling of goods/services are prohibited and filtered out automatically.",
      icon: "⚡",
    },
    {
      num: "06",
      title: "Protect Your Personal Identity",
      desc: "For your safety, never share your full legal name, physical address, financial details, passwords, or personal social media handles with strangers.",
      icon: "🔒",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f9] text-[#18181b] dark:bg-[#0c0b12] dark:text-[#f4f4f7] transition-colors">
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#673ddc] hover:underline"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#673ddc]/10 text-[#673ddc] dark:bg-[#673ddc]/20 dark:text-[#a78bfa] text-xs font-bold mb-3">
            <span>🛡️</span> Safety & Conduct Guidelines
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Community Rules
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Umingle is built on trust, respect, and anonymity. Please adhere to these guidelines to ensure a welcoming and safe environment for everyone.
          </p>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-12">
          {rules.map((rule) => (
            <div
              key={rule.num}
              className="relative flex flex-col p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#151421] border border-gray-200/80 dark:border-white/10 shadow-xs hover:border-[#673ddc]/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{rule.icon}</span>
                <span className="text-xs font-mono font-bold text-[#673ddc] dark:text-[#a78bfa] bg-[#673ddc]/10 dark:bg-[#673ddc]/20 px-2 py-0.5 rounded-md">
                  RULE {rule.num}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">
                {rule.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {rule.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Reporting & Enforcement Box */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/15 p-6 sm:p-8 mb-12">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-300">
                Reporting & Rapid Safety Enforcement
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                If you encounter a user violating our rules, click the <strong>Report</strong> button immediately in the video room. Our system automatically disconnects the offending peer, logs the incident for moderator review, and applies temporary or permanent IP restrictions to safeguard the community.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Card */}
        <div className="rounded-2xl bg-gradient-to-tr from-[#673ddc] to-indigo-600 text-white p-6 sm:p-10 text-center shadow-lg">
          <h3 className="text-xl sm:text-2xl font-black">Ready to connect safely?</h3>
          <p className="mt-2 text-xs sm:text-sm text-indigo-100 max-w-xl mx-auto">
            Join thousands of users having friendly, anonymous conversations right now.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/video"
              className="px-6 py-2.5 rounded-xl bg-white text-[#673ddc] font-bold text-sm shadow-md hover:bg-gray-100 transition-all"
            >
              Start Video Chat
            </Link>
            <Link
              href="/text"
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20"
            >
              Start Text Chat
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
