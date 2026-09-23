import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog & Engineering Insights — Umingle",
  description: "Read the latest engineering articles, security insights, and product updates from the Umingle team.",
};

export default function BlogPage() {
  const articles = [
    {
      id: "privacy-safe-session-continuity",
      title: "Building Privacy-Safe Video Chat: Zero Biometrics & Anonymous Continuity",
      excerpt:
        "How we architected an anonymous-first session continuity system using HMAC-SHA256 tokens and tab-isolated storage without collecting facial biometrics, gender classifications, or user profiles.",
      category: "Engineering & Privacy",
      date: "September 23, 2026",
      readTime: "5 min read",
      featured: true,
    },
    {
      id: "webrtc-p2p-encryption",
      title: "Under the Hood: How Direct WebRTC P2P Encryption Protects Your Calls",
      excerpt:
        "A deep dive into DTLS-SRTP key exchanges, STUN/TURN signaling mechanics, and why decentralized media pipelines ensure your video feed never touches a recording server.",
      category: "Security",
      date: "September 18, 2026",
      readTime: "4 min read",
      featured: false,
    },
    {
      id: "community-safety-moderation",
      title: "Community Safety at Scale: Real-Time Reporting and Abuse Throttling",
      excerpt:
        "Balancing complete user anonymity with proactive community safety. How our 15-second grace timers, rapid disconnects, and report triage protect callers from harassment.",
      category: "Trust & Safety",
      date: "September 12, 2026",
      readTime: "4 min read",
      featured: false,
    },
    {
      id: "responsive-mobile-video-ux",
      title: "Designing Fluid Mobile UX: PiP vs Split View in Real-Time Video Apps",
      excerpt:
        "How we solved video viewport constraints on mobile screens with responsive PiP/split toggling, dynamic safe-area insets, and zero horizontal scroll.",
      category: "Design & UX",
      date: "September 05, 2026",
      readTime: "3 min read",
      featured: false,
    },
    {
      id: "why-true-anonymity-matters",
      title: "Why Spontaneous, Account-Free Conversations Matter More Than Ever",
      excerpt:
        "In an era dominated by algorithmic feeds, profile tracking, and social credit scores, spontaneous 1-on-1 human connection offers a refreshing return to the early open web.",
      category: "Culture",
      date: "August 28, 2026",
      readTime: "3 min read",
      featured: false,
    },
  ];

  const featured = articles[0];
  const regularArticles = articles.slice(1);

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

        {/* Hero Header */}
        <div className="mb-10 sm:mb-14 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#673ddc]/10 text-[#673ddc] dark:bg-[#673ddc]/20 dark:text-[#a78bfa] text-xs font-bold mb-3">
            <span>✨</span> Umingle Engineering & Stories
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Latest Articles & Updates
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Insights on real-time WebRTC architecture, privacy engineering, community safety, and building the future of anonymous human connection.
          </p>
        </div>

        {/* Featured Article Card */}
        <div className="mb-12 rounded-3xl bg-white dark:bg-[#151421] border border-gray-200/80 dark:border-white/10 p-6 sm:p-10 shadow-sm hover:border-[#673ddc]/50 transition-colors">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-[#673ddc] text-white font-bold uppercase tracking-wider text-[10px]">
              Featured
            </span>
            <span className="font-semibold text-[#673ddc] dark:text-[#a78bfa]">
              {featured.category}
            </span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="text-gray-500 dark:text-gray-400">{featured.date}</span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="text-gray-500 dark:text-gray-400">{featured.readTime}</span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
            {featured.title}
          </h2>

          <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            {featured.excerpt}
          </p>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#673ddc] to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                U
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Umingle Engineering Team
              </span>
            </div>
            <Link
              href="/video"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#673ddc] dark:text-[#a78bfa] hover:underline"
            >
              Try Umingle Video →
            </Link>
          </div>
        </div>

        {/* Regular Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {regularArticles.map((article) => (
            <article
              key={article.id}
              className="flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-[#151421] border border-gray-200/80 dark:border-white/10 shadow-xs hover:border-[#673ddc]/40 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 text-xs mb-2.5">
                  <span className="font-semibold text-[#673ddc] dark:text-[#a78bfa]">
                    {article.category}
                  </span>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <span className="text-gray-500 dark:text-gray-400">{article.readTime}</span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                  {article.title}
                </h3>

                <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {article.excerpt}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{article.date}</span>
                <span className="font-semibold text-[#673ddc] dark:text-[#a78bfa]">
                  Engineering
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* CTA Card */}
        <div className="rounded-3xl bg-gradient-to-tr from-[#673ddc] to-indigo-600 text-white p-8 sm:p-12 text-center shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-black">
            Experience the new standard in random video chat
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-indigo-100 max-w-lg mx-auto">
            Zero registrations, instant connections, and robust privacy protection.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/video"
              className="px-6 py-2.5 rounded-xl bg-white text-[#673ddc] font-bold text-sm shadow-md hover:bg-gray-100 transition-all"
            >
              Start Video Chat
            </Link>
            <Link
              href="/rules"
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20"
            >
              Read Community Rules
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
