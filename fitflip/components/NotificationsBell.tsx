"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Props = {
  lang: "hu" | "en";
  onMobile?: boolean;
};

export default function NotificationsBell({ lang, onMobile = false }: Props) {
  const [unread, setUnread] = useState(0);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const signedIn = !!data.user;
      setAuthed(signedIn);
      if (signedIn) refresh();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const signedIn = !!session?.user;
      setAuthed(signedIn);
      if (signedIn) refresh();
    });

    // Light polling: refresh count every 5 minutes while tab is open.
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 5 * 60 * 1000);

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      sub.subscription.unsubscribe();
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const refresh = () => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { unreadCount: 0 }))
      .then((d) => setUnread(typeof d?.unreadCount === "number" ? d.unreadCount : 0))
      .catch(() => {});
  };

  if (!authed) return null;

  const label = lang === "hu" ? "Értesítések" : "Notifications";

  if (onMobile) {
    return (
      <Link
        href="/notifications"
        className="flex items-center justify-between px-4 py-3 text-sm text-ink-900 dark:text-ink-50 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
      >
        <span className="flex items-center gap-2">
          <BellIcon />
          {label}
        </span>
        {unread > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500" aria-label={`${unread} new`} />
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition"
    >
      <BellIcon />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" aria-label={`${unread} new`} />
      )}
    </Link>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
