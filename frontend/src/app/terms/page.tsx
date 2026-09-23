import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Umingle",
  description: "Review the Umingle terms of service, user agreements, and legal disclaimers for using our anonymous chat platform.",
};

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content:
        "By accessing or using Umingle ('the Service'), including all related web domains, interfaces, and real-time chat facilities, you agree to be bound by these Terms of Service ('Terms'). If you do not agree to these Terms, you must immediately discontinue use of the Service.",
    },
    {
      title: "2. Eligibility & Age Restriction (18+)",
      content:
        "You must be at least 18 years of age to access or use Umingle. We do not knowingly permit minors to use this service. By using Umingle, you affirm that you are 18 years of age or older and possess the legal capacity to enter into these Terms. Any unauthorized use by minors will result in immediate termination and referral to protective agencies where appropriate.",
    },
    {
      title: "3. Anonymous Nature of the Platform",
      content:
        "Umingle operates on an anonymous-first architecture. We do not require registration, usernames, email addresses, or phone numbers. Video and audio streams are transmitted peer-to-peer using WebSockets and WebRTC standards directly between clients whenever possible. Umingle does not record, archive, or monitor private video feeds.",
    },
    {
      title: "4. User Conduct & Acceptable Use",
      content:
        "You agree not to use the Service to: (a) broadcast or transmit sexually explicit, obscene, violent, or illegal content; (b) harass, threaten, stalk, intimidate, or demean any person; (c) record, screenshot, download, or distribute audio, video, or chat logs of other users without explicit consent; (d) deploy automated scripts, bots, spiders, or scrapers; (e) solicit money, sell commercial goods/services, or distribute malware/spam.",
    },
    {
      title: "5. Peer-to-Peer Interaction Disclaimer",
      content:
        "All conversations, audio, video, and text messages exchanged between users are the sole responsibility of the individuals transmitting them. Umingle has no control over the conduct of strangers you may encounter. You interact with strangers at your own discretion and risk. You should never disclose sensitive personal, residential, or financial information to anyone on the platform.",
    },
    {
      title: "6. Moderation, Reporting & Account Restrictions",
      content:
        "Umingle provides built-in reporting tools that allow users to report abusive or inappropriate behavior in real time. We reserve the absolute right to terminate, suspend, or block access (via ephemeral session termination and network rate-limiting) to any user who violates these Terms or our Community Rules, without notice or liability.",
    },
    {
      title: "7. Intellectual Property",
      content:
        "The Umingle software, brand, logo, design system, illustrations, and source code are the exclusive property of Umingle and its licensors. You may not copy, reverse engineer, decompile, modify, or distribute any part of the Service without prior written authorization.",
    },
    {
      title: "8. Disclaimer of Warranties",
      content:
        "THE SERVICE IS PROVIDED ON AN 'AS IS' AND 'AS AVAILABLE' BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED, SECURE, OR ERROR-FREE OPERATION.",
    },
    {
      title: "9. Limitation of Liability",
      content:
        "TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, UMINGLE AND ITS OPERATORS, DIRECTORS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF OR INABILITY TO USE THE SERVICE, OR THE CONDUCT OF OTHER USERS.",
    },
    {
      title: "10. Changes to Terms",
      content:
        "We reserve the right to modify these Terms at any time. Any changes will be posted on this page with an updated revision date. Your continued use of the platform following the posting of updated Terms constitutes your acceptance of those changes.",
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#673ddc]/10 text-[#673ddc] dark:bg-[#673ddc]/20 dark:text-[#a78bfa] text-xs font-bold mb-3">
            <span>📜</span> Legal Terms & Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Last Updated: September 23, 2026 • Please read carefully before using Umingle.
          </p>
        </div>

        {/* Terms Sections */}
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

        {/* Summary Footer Box */}
        <div className="mt-10 p-5 rounded-2xl bg-[#673ddc]/5 dark:bg-[#673ddc]/10 border border-[#673ddc]/20 text-center">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            Questions regarding our Terms? Review our{" "}
            <Link href="/privacy" className="text-[#673ddc] dark:text-[#a78bfa] font-bold hover:underline">
              Privacy Policy
            </Link>{" "}
            or check our{" "}
            <Link href="/rules" className="text-[#673ddc] dark:text-[#a78bfa] font-bold hover:underline">
              Community Rules
            </Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
