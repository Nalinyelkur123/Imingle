import { useSyncExternalStore } from "react";

let interestsListeners: Array<() => void> = [];

function subscribeInterests(callback: () => void) {
  interestsListeners.push(callback);
  window.addEventListener("storage", callback);
  return () => {
    interestsListeners = interestsListeners.filter((cb) => cb !== callback);
    window.removeEventListener("storage", callback);
  };
}

const DEFAULT_INTERESTS: string[] = ["telugu", "data"];

let cachedInterestsRaw: string | null = null;
let cachedInterests: string[] = DEFAULT_INTERESTS;

function getInterestsSnapshot(): string[] {
  if (typeof window === "undefined") return DEFAULT_INTERESTS;
  const raw = localStorage.getItem("umingle_interests");
  if (raw === null) return DEFAULT_INTERESTS;
  if (raw !== cachedInterestsRaw) {
    cachedInterestsRaw = raw;
    try {
      cachedInterests = JSON.parse(raw);
    } catch {
      cachedInterests = DEFAULT_INTERESTS;
    }
  }
  return cachedInterests;
}

function getInterestsServerSnapshot(): string[] {
  return DEFAULT_INTERESTS;
}

export function saveInterests(newInterests: string[]) {
  try {
    localStorage.setItem("umingle_interests", JSON.stringify(newInterests));
  } catch {
    // ignore
  }
  interestsListeners.forEach((cb) => cb());
}

export function useInterests(): [string[], (newInterests: string[]) => void] {
  const interests = useSyncExternalStore(
    subscribeInterests,
    getInterestsSnapshot,
    getInterestsServerSnapshot
  );

  return [interests, saveInterests];
}
