import Link from "next/link";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={
        className ??
        "flex w-full min-h-[64px] flex-col items-center justify-between border-t border-gray-200/70 bg-white px-6 sm:px-12 lg:px-16 py-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-[#0e0d14] dark:text-gray-400 sm:flex-row gap-4 z-10"
      }
    >
      <div>© 2026 Umingle.com</div>

      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm font-medium">
        <Link href="/blog" className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Blog
        </Link>
        <Link href="/rules" className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Rules
        </Link>
        <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
