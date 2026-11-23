"use client";
import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type EventState = { active: boolean; started_at: string | null };
const tacos = Array.from({ length: 22 }, (_, i) => i);

export function AdminAbuseOverlay() {
  const [event, setEvent] = useState<EventState>({ active: false, started_at: null });
  const audioRef = useRef<{ ctx: AudioContext; timer: ReturnType<typeof setInterval> } | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    let alive = true;
    void sb.from("site_admin_abuse").select("active,started_at").eq("id", true).maybeSingle()
      .then(({ data }) => { if (alive && data) setEvent(data as EventState); });
    const channel = sb.channel("roblox-hub-admin-abuse")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_admin_abuse", filter: "id=eq.true" },
        (payload) => { if (alive) setEvent(payload.new as EventState); })
      .subscribe();
    return () => { alive = false; void sb.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!event.active || typeof window === "undefined") return;
    let disposed = false;
    let ctx: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let step = 0;
    const notes = [392, 494, 587, 494, 440, 523, 659, 523];
    const play = () => {
      if (!ctx || ctx.state !== "running") return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = notes[step++ % notes.length];
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    };
    const tryStartSound = async () => {
      if (disposed) return;
      try {
        ctx ??= new window.AudioContext();
        if (ctx.state !== "running") await ctx.resume();
        if (!disposed && ctx.state === "running" && !timer) {
          play();
          timer = setInterval(play, 260);
          audioRef.current = { ctx, timer };
          window.removeEventListener("pointerdown", tryStartSound);
          window.removeEventListener("keydown", tryStartSound);
          window.removeEventListener("touchstart", tryStartSound);
        }
      } catch {
        // Browser may require a user gesture; listeners below retry silently.
      }
    };

    // Attempt autoplay. If blocked, any ordinary page interaction retries audio.
    window.addEventListener("pointerdown", tryStartSound);
    window.addEventListener("keydown", tryStartSound);
    window.addEventListener("touchstart", tryStartSound, { passive: true });
    void tryStartSound();

    return () => {
      disposed = true;
      window.removeEventListener("pointerdown", tryStartSound);
      window.removeEventListener("keydown", tryStartSound);
      window.removeEventListener("touchstart", tryStartSound);
      if (timer) clearInterval(timer);
      if (ctx) void ctx.close();
      audioRef.current = null;
    };
  }, [event.active]);

  if (!event.active) return null;
  return <div className="abuse-event" aria-live="polite">
    <div className="taco-rain" aria-hidden="true">{tacos.map((n) =>
      <span key={n} style={{ left: `${(n * 47 + 3) % 100}%`, animationDelay: `${(n % 9) * -0.73}s`, animationDuration: `${5 + (n % 5) * 0.7}s`, fontSize: `${25 + (n % 4) * 9}px` }}>🌮</span>)}</div>
  </div>;
}
