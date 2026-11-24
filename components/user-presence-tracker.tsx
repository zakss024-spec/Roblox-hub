"use client";
import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function UserPresenceTracker() {
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    let disposed = false;
    let userId: string | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    const publish = async (online: boolean) => {
      if (!userId || disposed) return;
      const result = await sb.from("hub_user_presence").upsert({
        user_id: userId,
        is_online: online,
        last_seen: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (result.error && process.env.NODE_ENV !== "production") {
        console.warn("Presence update unavailable:", result.error.message);
      }
    };

    const start = async () => {
      const { data } = await sb.auth.getUser();
      if (disposed) return;
      userId = data.user?.id ?? null;
      if (!userId) {
        if (timer) clearInterval(timer);
        timer = null;
        return;
      }
      await publish(true);
      if (timer) clearInterval(timer);
      timer = setInterval(() => { void publish(true); }, 30_000);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void publish(true);
    };
    const onPageHide = () => { void publish(false); };

    void start();
    const { data: authListener } = sb.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        const nextUserId = session?.user?.id ?? null;
        if (userId && userId !== nextUserId) void publish(false);
        userId = nextUserId;
        if (!userId) {
          if (timer) clearInterval(timer);
          timer = null;
          return;
        }
        void publish(true);
        if (timer) clearInterval(timer);
        timer = setInterval(() => { void publish(true); }, 30_000);
      }, 0);
    });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      authListener.subscription.unsubscribe();
      if (userId) {
        void sb.from("hub_user_presence").update({
          is_online: false,
          last_seen: new Date().toISOString(),
        }).eq("user_id", userId);
      }
    };
  }, []);

  return null;
}
