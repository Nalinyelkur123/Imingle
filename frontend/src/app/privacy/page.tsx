import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Umingle",
  description: "Learn how Umingle protects your privacy with anonymous-first architecture, zero biometrics, and peer-to-peer encrypted video chat.",
};

export default function PrivacyPage() {
  const pillars = [
    {
      title: "Zero Biometrics & No Facial Recognition",
      description:
        "Umingle does not analyze, scan, classify, or store facial geometries, biometrics, gender identity, or demographic data. Your video feed is yours alone and is never processed by facial classification algorithms.",
      icon: "👁️‍🗨️",
    },
    {
      title: "No User Accounts or Profile Tracking",
      description:
        "We believe the best privacy guarantee is not collecting your data in the first place. You do not need to register, provide an email, connect a social account, or create a password to use Umingle.",
      icon: "👤",
    },
    {
      title: "Encrypted Peer-to-Peer Streaming",
      description:
        "Video and voice data are transmitted directly between peers via WebRTC using DTLS and SRTP encryption. Our servers help negotiate the connection and do not record, tap, or store your private video conversations.",
      icon: "🔒",
    },
    {
      title: "Ephemeral, Tab-Isolated Session Storage",
      description:
        "We generate a cryptographically signed anonymous session token stored solely in your browser's sessionStorage and HttpOnly session cookies. It ensures connection stability if your WiFi blips, and automatically purges when you close the tab.",
      icon: "⏱️",
    },
  ];

  const sections = [
    {
      title: "1. Information We Do NOT Collect",
      content:
        "Unlike conventional social media and video platforms, Umingle intentionally avoids collecting personal identifying information (PII). We do NOT collect or store: \n• Your name, address, email address, or phone number\n• Biometric data, facial feature coordinates, or gender categorization\n• Contacts, address books, or external social media profiles\n• Continuous browsing habits across other websites",
    },
    {
      title: "2. Technical Data Processed for Connection & Safety",
      content:
        "To deliver real-time video chat, our backend processes the minimum technical telemetry necessary: \n• Ephemeral Session Identifiers: A unique cryptographically signed UUID (e.g. sess_...) used strictly to pair users in the queue and recover temporary connection drops without mixing chats.\n• Network Routing Data: IP addresses and ICE candidates are utilized by signaling servers to establish peer connections and protect our servers against malicious DDoS and bot flooding. We never use IP addresses as a personal identity key.\n• Optional Interest Tags: Topic tags you voluntarily enter (e.g., #music, #tech) are used exclusively to match you with compatible chat partners and are discarded upon session teardown.",
    },
    {
      title: "3. Direct Peer-to-Peer Communication (WebRTC)",
      content:
        "Real-time video and audio feeds travel directly between you and your chat partner via standard WebRTC peer connections. These media streams are encrypted end-to-end between browsers using DTLS-SRTP protocols. Umingle does not record, archive, or sell any video or audio streams.",
    },
    {
      title: "4. User Reports & Moderation Safety",
      content:
        "When a user submits a report concerning inappropriate conduct or violation of our Community Rules, our safety service records: \n• The anonymous match identifier and timestamp\n• The selected category of violation (e.g., harassment, spam, illicit content)\n• Ephemeral network identifiers of the reported party for automated abuse throttling\nThis data is utilized strictly for community security, spam prevention, and legal compliance.",
    },
    {
      title: "5. Cookies & Local Browser Storage",
      content:
        "We do not use tracking cookies, retargeting pixels, or third-party advertising cookies. We only use functional session storage and a secure HttpOnly session cookie (umingle_sess) to preserve continuity during an active chat session. You can clear this data at any time by closing your browser tab or clearing browser cache.",
    },
    {
      title: "6. Children's Privacy (Under 18 Notice)",
      content:
        "Umingle is strictly intended for individuals 18 years of age or older. We do not knowingly solicit or collect information from children. If we become aware that a minor has accessed the platform, we take immediate measures to terminate their access.",
    },
    {
      title: "7. Contact & Inquiries",
      content:
        "If you have questions regarding this Privacy Policy or our anonymous safety framework, please review our Community Rules or reach out to our administration team.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f9] text-[#18181b] dark:bg-[#0c0b12] dark:text-[#f4f4f7] transition-colors">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#673ddc] hover:underline"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8 sm:mb-12 border-b border-gray-200/80 dark:border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-bold mb-3">
            <span>🛡️</span> Privacy-First Architecture
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Last Updated: September 23, 2026 • Discover how we protect your anonymity and communication.
          </p>
        </div>

        {/* Key Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {pillars.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-[#151421] border border-gray-200/80 dark:border-white/10 shadow-xs flex flex-col"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-1.5">
                {item.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Privacy Policy Articles */}
        <div className="space-y-6 sm:space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {sections.map((section, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#151421] border border-gray-200/80 dark:border-white/10 shadow-xs"
            >
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">
                {section.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-10 p-5 rounded-2xl bg-[#673ddc]/5 dark:bg-[#673ddc]/10 border border-[#673ddc]/20 text-center">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            Learn more about our standards on the{" "}
            <Link href="/rules" className="text-[#673ddc] dark:text-[#a78bfa] font-bold hover:underline">
              Community Rules
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-[#673ddc] dark:text-[#a78bfa] font-bold hover:underline">
              Terms of Service
            </Link>{" "}
            pages.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
