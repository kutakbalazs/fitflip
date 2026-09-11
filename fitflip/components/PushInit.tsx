"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initPush } from "@/lib/push";

/**
 * Registers the push listeners once, from the root layout.
 *
 * It never prompts — `initPush` only re-registers a permission the user has
 * already granted — so mounting it globally cannot produce a dialog on a
 * cold start. The work is deferred to an effect and the import inside it is
 * dynamic, so nothing here runs before first paint.
 */
export default function PushInit() {
  const router = useRouter();

  useEffect(() => {
    void initPush((url) => router.push(url));
  }, [router]);

  return null;
}
