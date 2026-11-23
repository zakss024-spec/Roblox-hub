"use client";
import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type EventState = { active: boolean; started_at: string | null };
type Announcement = { id: number; sender_name: string; message: string; created_at: string };
const tacos = Array.from({ length: 22 }, (_, i) => i);
const INTRO_DURATION = 5000;

export function AdminAbuseOverlay() {
  const [event, setEvent] = useState<EventState>({ active: false, started_at: null });
  const [clock, setClock] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const announcementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    let alive = true;
    void sb.from("site_admin_abuse").select("active,started_at").eq("id", true).maybeSingle()
      .then(({ data }) => { if (alive && data) setEvent(data as EventState); });
    const channel = sb.channel("roblox-hub-admin-abuse")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_admin_abuse", filter: "id=eq.true" },
        (payload) => { if (alive) setEvent(payload.new as EventState); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "site_announcements" },
        (payload) => {
          if (!alive) return;
          setAnnouncement(payload.new as Announcement);
          if (announcementTimer.current) clearTimeout(announcementTimer.current);
          announcementTimer.current = setTimeout(() => setAnnouncement(null), 9000);
        })
      .subscribe();
    return () => {
      alive = false;
      if (announcementTimer.current) clearTimeout(announcementTimer.current);
      void sb.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!event.active) return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [event.active, event.started_at]);

  const startedAt = event.started_at ? new Date(event.started_at).getTime() : 0;
  const elapsed = startedAt ? Math.max(0, clock - startedAt) : INTRO_DURATION;
  const isIntro = event.active && elapsed < INTRO_DURATION;
  const countdown = Math.max(1, 5 - Math.floor(elapsed / 1000));

  useEffect(() => {
    if (!event.active || typeof window === "undefined") return;
    let disposed = false;
    let starting = false;
    const audio = new Audio("https://quicksounds.com/uploads/tracks/1219935113_1051071961_1597840749.mp3");
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.7;

    const tryStartSound = async () => {
      if (disposed || starting || !audio.paused) return;
      starting = true;
      try {
        await audio.play();
        window.removeEventListener("pointerdown", tryStartSound);
        window.removeEventListener("keydown", tryStartSound);
        window.removeEventListener("touchstart", tryStartSound);
      } catch {
        // Browser autoplay policy may require a normal visitor interaction.
      } finally {
        starting = false;
      }
    };

    window.addEventListener("pointerdown", tryStartSound);
    window.addEventListener("keydown", tryStartSound);
    window.addEventListener("touchstart", tryStartSound, { passive: true });
    void tryStartSound();

    return () => {
      disposed = true;
      window.removeEventListener("pointerdown", tryStartSound);
      window.removeEventListener("keydown", tryStartSound);
      window.removeEventListener("touchstart", tryStartSound);
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    };
  }, [event.active]);

  if (!event.active && !announcement) return null;
  return <>
    {event.active && <>
      <div className="abuse-event" aria-hidden="true">
        <div className="taco-rain">{tacos.map((n) =>
          <span key={n} style={{ left: `${(n * 47 + 3) % 100}%`, animationDelay: `${(n % 9) * -0.73}s`, animationDuration: `${5 + (n % 5) * 0.7}s`, fontSize: `${25 + (n % 4) * 9}px` }}>🌮</span>)}</div>
      </div>
      {isIntro ? <div className="abuse-intro" role="status" aria-live="assertive">
        <div className="abuse-intro-content">
          <span className="abuse-intro-kicker">ROBLOX HUB PRESENTS</span>
          <strong>ADMIN ABUSE</strong>
          <span className="abuse-countdown" key={countdown}>{countdown}</span>
          <span className="abuse-intro-caption">GET READY</span>
        </div>
      </div> : elapsed < INTRO_DURATION + 1250 ? <div className="abuse-opening" aria-hidden="true">
        <div className="abuse-curtain abuse-curtain-left"/>
        <div className="abuse-curtain abuse-curtain-right"/>
      </div> : null}
    </>}
    {announcement && <div className="global-announcement" role="status" aria-live="polite">
      <div className="global-announcement-tag">ROBLOX HUB <span>· GLOBAL ANNOUNCEMENT</span></div>
      <p><strong>{announcement.sender_name}:</strong> {announcement.message}</p>
    </div>}
  </>;
}
