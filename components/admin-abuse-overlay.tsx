"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type EventType = "taco_rain" | "disco_takeover";
type EventState = { active: boolean; started_at: string | null; event_type?: EventType; beam_angle?: number };
type Announcement = { id: number; sender_name: string; message: string; created_at: string };

const INTRO_DURATION = 5000;
const particles = Array.from({ length: 38 }, (_, i) => i);
function playAnnouncementSound() {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  void context.resume().then(() => {
    if (context.state !== "running") {
      void context.close();
      return;
    }
    const now = context.currentTime;
    // Short, friendly three-note notification chime.
    [784, 988, 1175].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.105;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.26);
    });
    window.setTimeout(() => { void context.close(); }, 650);
  }).catch(() => {
    void context.close();
    // Browser autoplay policies may block sound until the visitor interacts.
  });
}

function startEventMusic(_type: EventType, onReady: () => void) {
  if (_type === "disco_takeover") return () => {};
  const audio = new Audio("https://quicksounds.com/uploads/tracks/1219935113_1051071961_1597840749.mp3");
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.72;
  let disposed = false;
  let ready = false;
  const unlock = async () => {
    if (disposed || ready) return;
    try {
      await audio.play();
      if (!disposed) {
        ready = true;
        onReady();
      }
    } catch {
      // Browsers may require a visitor gesture before audio playback.
    }
  };
  void unlock();
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
  return () => {
    disposed = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
    audio.pause();
    audio.currentTime = 0;
    audio.src = "";
  };
}

export function AdminAbuseOverlay() {
  const [event, setEvent] = useState<EventState>({ active: false, started_at: null, event_type: "taco_rain" });
  const [clock, setClock] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [soundReady, setSoundReady] = useState(false);
  const announcementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoPlayerRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    let alive = true;
    void sb.from("site_admin_abuse").select("active,started_at,event_type,beam_angle").eq("id", true).maybeSingle()
      .then(({ data }) => {
        if (alive && data) {
          const next = data as EventState;
          setEvent({ ...next, active: Boolean(next.active) && (!next.event_type || next.event_type === "taco_rain" || next.event_type === "disco_takeover") });
        }
      });
    const channel = sb.channel("roblox-hub-admin-abuse")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_admin_abuse", filter: "id=eq.true" },
        (payload) => {
          if (!alive) return;
          const next = payload.new as EventState;
          setEvent({ ...next, active: Boolean(next.active) && (!next.event_type || next.event_type === "taco_rain" || next.event_type === "disco_takeover") });
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "site_announcements" },
        (payload) => {
          if (!alive) return;
          setAnnouncement(payload.new as Announcement);
          playAnnouncementSound();
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
  const showEventEffects = event.active && elapsed >= INTRO_DURATION;
  const eventType: EventType = event.event_type === "disco_takeover" ? "disco_takeover" : "taco_rain";
  const enableDiscoMusic = () => {
    const player = discoPlayerRef.current?.contentWindow;
    if (!player) return;
    player.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
    player.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [70] }), "*");
    player.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
    setSoundReady(true);
  };

  useEffect(() => {
    setSoundReady(false);
    if (!showEventEffects || typeof window === "undefined") return;
    return startEventMusic(eventType, () => setSoundReady(true));
  }, [showEventEffects, eventType]);

  if (!event.active && !announcement) return null;
  return <>
    {event.active && <>
      {showEventEffects && (eventType === "disco_takeover" ? <div className="abuse-event abuse-event--disco" aria-hidden="true"><div className="abuse-disco-lights"/><div className="abuse-disco-ball">🪩</div></div> : <div className="abuse-event abuse-event--taco" aria-hidden="true">
        <div className="abuse-particle-layer">{particles.map((n) =>
          <span className="abuse-particle" key={n} style={{
            left: `${(n * 47 + 3) % 100}%`,
            animationDelay: `${(n % 11) * -0.61}s`,
            animationDuration: `${4.5 + (n % 6) * 0.62}s`,
            fontSize: `${24 + (n % 5) * 8}px`,
          }}>🌮</span>)}</div>
      </div>)}
      {isIntro ? <div className="abuse-intro abuse-intro--taco" role="status" aria-live="assertive">
        <div className="abuse-intro-content">
          <span className="abuse-intro-kicker">ROBLOX HUB PRESENTS · CRUNCH TIME</span>
          <strong>{eventType === "disco_takeover" ? "DISCO FEVER" : "TACO RAIN"}</strong>
          <span className="abuse-countdown" key={countdown}>{countdown}</span>
          <span className="abuse-intro-caption">{eventType === "disco_takeover" ? "THE DANCE FLOOR IS OPEN!" : "THE TACO STORM IS HERE!"}</span>
        </div>
      </div> : elapsed < INTRO_DURATION + 1250 ? <div className="abuse-opening" aria-hidden="true">
        <div className="abuse-curtain abuse-curtain-left"/>
        <div className="abuse-curtain abuse-curtain-right"/>
      </div> : null}
      {showEventEffects && eventType === "disco_takeover" && <div className="abuse-disco-player"><div className="abuse-disco-player-heading"><span>DISCO FEVER SOUNDTRACK</span><strong>YOUTUBE</strong></div><iframe ref={discoPlayerRef} title="Garam & Madu - Tenxi, Naykilla, Jemsii" src="https://www.youtube-nocookie.com/embed/k0ubS6BhHu4?autoplay=1&mute=1&controls=1&playsinline=1&rel=0&enablejsapi=1" allow="autoplay; encrypted-media; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/><button type="button" onClick={enableDiscoMusic}>ENABLE MUSIC</button></div>}
      {showEventEffects && eventType === "taco_rain" && !soundReady && <div className="abuse-sound-hint" aria-live="polite">TAP ANYWHERE TO ENABLE EVENT SOUND</div>}
    </>}
    {announcement && <div className="global-announcement" role="status" aria-live="polite">
      <div className="global-announcement-tag">ROBLOX HUB <span>· GLOBAL ANNOUNCEMENT</span></div>
      <p><strong>{announcement.sender_name}:</strong> {announcement.message}</p>
    </div>}
  </>;
}
