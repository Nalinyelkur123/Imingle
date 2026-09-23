"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { connectSocket } from "@/services/socket";
import { fetchLiveStats } from "@/services/api";

let themeListeners: Array<() => void> = [];

function subscribeTheme(callback: () => void) {
  themeListeners.push(callback);
  window.addEventListener("storage", callback);
  return () => {
    themeListeners = themeListeners.filter((cb) => cb !== callback);
    window.removeEventListener("storage", callback);
  };
}

function notifyThemeChange() {
  themeListeners.forEach((cb) => cb());
}

function getThemeSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("umingle_dark");
  // Default to light mode (false) matching the reference design
  return saved === "true";
}

function getThemeServerSnapshot(): boolean {
  return false;
}

export function Header() {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const [onlineCount, setOnlineCount] = useState<string>("1");

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
  }, [isDark]);

  useEffect(() => {
    // 1. Initial live stats fetch
    fetchLiveStats().then((data) => {
      if (data?.stats?.onlineUsers !== undefined) {
        setOnlineCount(String(data.stats.onlineUsers));
      }
    });

    // 2. Real-time live update from socket
    const socket = connectSocket();
    const handleOnlineCount = (payload: { count: number }) => {
      if (payload?.count !== undefined) {
        setOnlineCount(String(payload.count));
      }
    };

    socket.on("online_count", handleOnlineCount);

    return () => {
      socket.off("online_count", handleOnlineCount);
    };
  }, []);

  const toggleDarkMode = () => {
    const current = getThemeSnapshot();
    const next = !current;
    try {
      localStorage.setItem("umingle_dark", String(next));
    } catch {
      // ignore
    }
    notifyThemeChange();
  };

  return (
    <header className="shrink-0 h-[60px] sm:h-[68px] relative z-50 flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Umingle Logo */}
      <Link href="/" className="noSelect flex items-center gap-2 sm:gap-2.5" id="umingle-logo-link">
        {/* Rounded Purple Icon */}
        <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#673ddc] shadow-sm">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-6 sm:h-6">
            <path
              d="M20 11.5C20 15.6421 16.4183 19 12 19C10.6387 19 9.35517 18.6833 8.22557 18.1251L4 19.5L5.37488 15.7744C4.50294 14.5262 4 13.0762 4 11.5C4 7.35786 7.58172 4 12 4C16.4183 4 20 7.35786 20 11.5Z"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="8.5" cy="11.5" r="1.2" fill="#ffffff" />
            <circle cx="12" cy="11.5" r="1.2" fill="#ffffff" />
            <circle cx="15.5" cy="11.5" r="1.2" fill="#ffffff" />
          </svg>
        </div>

        {/* Wordmark "umingle" in bold text matching reference */}
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18181b] dark:text-white">
          umingle
        </span>
      </Link>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Dark/Light Pill Switch matching Screenshot 1 */}
        <button
          onClick={toggleDarkMode}
          className="relative flex h-7 w-12 cursor-pointer items-center rounded-full border border-gray-200 bg-[#f4f4f7] px-1 shadow-xs transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-[#1e1d2c]"
          aria-label="Toggle dark mode"
          id="theme-toggle-btn"
        >
          {/* Thumb */}
          <span
            className={`h-5 w-5 rounded-full border border-gray-200 bg-white shadow-xs transition-transform duration-200 dark:border-gray-600 dark:bg-[#2e2c40] ${
              isDark ? "translate-x-5" : "translate-x-0"
            }`}
          />

          {/* Icon Moon or Sun */}
          <span className="absolute right-1.5 text-[11px] select-none text-gray-500 dark:hidden">
            🌙
          </span>
          <span className="absolute left-1.5 text-[11px] select-none text-amber-300 hidden dark:inline">
            ☀️
          </span>
        </button>

        {/* Online Count Pill */}
        <div className="flex items-center gap-2 rounded-full border border-gray-200/90 bg-white px-3.5 py-1.5 shadow-xs dark:border-gray-700 dark:bg-[#161520]">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
          <strong className="text-sm font-bold text-[#673ddc] dark:text-[#a78bfa]">
            {onlineCount}
          </strong>
          <span className="text-xs text-gray-600 dark:text-gray-400 font-normal">
            online
          </span>
        </div>
      </div>
    </header>
  );
}
