"use client";
import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type EventState = { active: boolean; started_at: string | null };
const tacos = Array.from({ length: 22 }, (_, i) => i);

export function AdminAbuseOverlay() {
  const [event, setEvent] = useState<EventState>({ active: false, started_at: null });
  const [muted, setMuted] = useState(true);
  const [visual, setVisual] = useState(true);
  const [ready, setReady] = useState(false);
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
    if (!event.active || muted || !ready || typeof window === "undefined") return;
    const ctx = new AudioContext();
    const notes = [392, 494, 587, 494, 440, 523, 659, 523];
    let step = 0;
    const play = () => {
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = notes[step++ % notes.length];
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.19);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    };
    play();
    const timer = setInterval(play, 260);
    audioRef.current = { ctx, timer };
    return () => { clearInterval(timer); void ctx.close(); audioRef.current = null; };
  }, [event.active, muted, ready]);

  if (!event.active) return null;
  return <div className="abuse-event" aria-live="polite">
    {visual && <div className="taco-rain" aria-hidden="true">{tacos.map((n) =>
      <span key={n} style={{ left: `${(n * 47 + 3) % 100}%`, animationDelay: `${(n % 9) * -0.73}s`, animationDuration: `${5 + (n % 5) * 0.7}s`, fontSize: `${25 + (n % 4) * 9}px` }}>🌮</span>)}</div>}
    <div className="abuse-visitor-controls">
      <strong>🌮 TACO EVENT LIVE</strong>
      <button onClick={() => setVisual(v => !v)}>{visual ? "STOP TACOS" : "SHOW TACOS"}</button>
      {!ready && muted ? <button onClick={() => { setReady(true); setMuted(false); }}>ENABLE SOUND</button> :
        <button onClick={() => setMuted(v => !v)}>{muted ? "UNMUTE" : "MUTE SOUND"}</button>}
    </div>
  </div>;
}
