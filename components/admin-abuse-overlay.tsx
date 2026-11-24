"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type EventType = "taco_rain" | "rainbow_party" | "emoji_invasion" | "pet_parade" | "candy_storm" | "disco_takeover" | "zakss_jumpscare";
type EventState = { active: boolean; started_at: string | null; event_type?: EventType; beam_angle?: number };
type Announcement = { id: number; sender_name: string; message: string; created_at: string };

const INTRO_DURATION = 5000;
const particles = Array.from({ length: 38 }, (_, i) => i);
const EVENT_CONFIG: Record<EventType, { title: string; subtitle: string; kicker: string; symbols: string[]; className: string }> = {
  taco_rain: { title: "TACO RAIN", subtitle: "THE TACO STORM IS HERE!", kicker: "CRUNCH TIME", symbols: ["🌮", "🌮", "🌮", "✨"], className: "taco" },
  rainbow_party: { title: "RAINBOW PARTY", subtitle: "LET THE COLORS TAKE OVER!", kicker: "COLOR EXPLOSION", symbols: ["🌈", "🎉", "⭐", "🪅"], className: "rainbow" },
  emoji_invasion: { title: "EMOJI INVASION", subtitle: "EMOJIS ARE EVERYWHERE!", kicker: "REACTION OVERLOAD", symbols: ["😂", "😎", "🤩", "🥳", "👾"], className: "emoji" },
  pet_parade: { title: "PET PARADE", subtitle: "THE CUTEST PARADE HAS ARRIVED!", kicker: "PAWS ON PARADE", symbols: ["🐶", "🐱", "🐰", "🐼", "🐸"], className: "pet" },
  candy_storm: { title: "CANDY STORM", subtitle: "SWEET TREATS ARE FALLING!", kicker: "SUGAR RUSH", symbols: ["🍬", "🍭", "🍩", "🍡", "🍫"], className: "candy" },
  disco_takeover: { title: "DISCO TAKEOVER", subtitle: "LIGHTS UP. LET'S DANCE!", kicker: "DANCE FLOOR OPEN", symbols: ["🪩", "💿", "✨", "🕺", "💃"], className: "disco" },
  zakss_jumpscare: { title: "ZAKSS", subtitle: "YOU HAVE BEEN NOTICED", kicker: "SYSTEM TAKEOVER", symbols: [], className: "zakss" },
};

const MUSIC: Record<EventType, number[]> = {
  taco_rain: [392, 494, 587, 494, 440, 523, 659, 523],
  rainbow_party: [523, 659, 784, 659, 587, 698, 880, 698],
  emoji_invasion: [330, 392, 494, 392, 370, 440, 554, 440],
  pet_parade: [392, 440, 523, 587, 523, 440, 392, 330],
  candy_storm: [659, 784, 988, 784, 698, 880, 1046, 880],
  disco_takeover: [440, 554, 659, 554, 494, 622, 740, 622],
  zakss_jumpscare: [110, 220, 880, 440],
};

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

function startEventMusic(type: EventType, onReady: () => void) {
  if (type === "taco_rain") {
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
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return () => {};
  const context = new AudioContextClass();
  let beat = 0;
  let timer: number | undefined;
  let disposed = false;
  const playNote = (frequency: number, duration: number, wave: OscillatorType, volume: number) => {
    if (disposed || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  };
  const tick = () => {
    const notes = MUSIC[type];
    if (type === "zakss_jumpscare") {
      if (beat % 4 === 0) { playNote(72, 0.8, "sawtooth", 0.055); playNote(880, 0.18, "square", 0.025); }
      if (beat % 4 === 1) playNote(660, 0.24, "square", 0.022);
      if (beat % 4 === 2) playNote(110, 0.55, "sawtooth", 0.045);
      if (beat % 4 === 3) playNote(440, 0.15, "triangle", 0.018);
      beat += 1;
      return;
    }
    playNote(notes[beat % notes.length], 0.22, type === "disco_takeover" ? "square" : "triangle", 0.045);
    if (beat % 2 === 0) playNote(notes[(beat + 4) % notes.length] / 2, 0.3, "sine", 0.025);
    if (type === "emoji_invasion" && beat % 2 === 1) playNote(740, 0.06, "square", 0.012);
    if (type === "pet_parade" && beat % 4 === 0) playNote(1046, 0.09, "sine", 0.015);
    if (type === "candy_storm" && beat % 4 === 3) playNote(1318, 0.08, "triangle", 0.014);
    beat += 1;
  };
  const unlock = async () => {
    if (disposed) return;
    try {
      await context.resume();
      if (context.state === "running" && timer === undefined) {
        tick();
        timer = window.setInterval(tick, type === "disco_takeover" ? 260 : 340);
        onReady();
      }
    } catch {
      // The browser may require another user gesture before audio can start.
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
    if (timer !== undefined) window.clearInterval(timer);
    void context.close();
  };
}

export function AdminAbuseOverlay() {
  const [event, setEvent] = useState<EventState>({ active: false, started_at: null, event_type: "taco_rain" });
  const [clock, setClock] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [soundReady, setSoundReady] = useState(false);
  const announcementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    let alive = true;
    void sb.from("site_admin_abuse").select("active,started_at,event_type,beam_angle").eq("id", true).maybeSingle()
      .then(({ data }) => { if (alive && data) setEvent(data as EventState); });
    const channel = sb.channel("roblox-hub-admin-abuse")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_admin_abuse", filter: "id=eq.true" },
        (payload) => { if (alive) setEvent(payload.new as EventState); })
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
  const eventType = event.event_type && EVENT_CONFIG[event.event_type] ? event.event_type : "taco_rain";
  const config = EVENT_CONFIG[eventType];

  useEffect(() => {
    setSoundReady(false);
    if (!showEventEffects || typeof window === "undefined") return;
    return startEventMusic(eventType, () => setSoundReady(true));
  }, [showEventEffects, eventType]);

  if (!event.active && !announcement) return null;
  return <>
    {event.active && <>
      {showEventEffects && <div className={"abuse-event abuse-event--" + config.className} aria-hidden="true">
        {eventType === "rainbow_party" && <><div className="abuse-rainbow-wash"/><div className="abuse-indonesia-beams" aria-hidden="true"><div className="abuse-beam-corner abuse-beam-left" style={{ transform: `rotate(${event.beam_angle ?? 0}deg)` }}><i className="beam-red beam-one"/><i className="beam-white beam-two"/><i className="beam-red beam-three"/><i className="beam-white beam-four"/></div><div className="abuse-beam-corner abuse-beam-right" style={{ transform: `scaleX(-1) rotate(${-(event.beam_angle ?? 0)}deg)` }}><i className="beam-red beam-one"/><i className="beam-white beam-two"/><i className="beam-red beam-three"/><i className="beam-white beam-four"/></div></div></>}
        {eventType === "disco_takeover" && <><div className="abuse-disco-lights"/><div className="abuse-disco-ball">🪩</div></>}
        {eventType !== "zakss_jumpscare" && <div className="abuse-particle-layer">{particles.map((n) =>
          <span className="abuse-particle" key={n} style={{
            left: `${(n * 47 + 3) % 100}%`,
            animationDelay: `${(n % 11) * -0.61}s`,
            animationDuration: `${4.5 + (n % 6) * 0.62}s`,
            fontSize: `${24 + (n % 5) * 8}px`,
          }}>{config.symbols[n % config.symbols.length]}</span>)}</div>}
      </div>}
      {showEventEffects && eventType === "zakss_jumpscare" && <div className={"abuse-zakss-stage " + (elapsed < INTRO_DURATION + 2400 ? "impact" : "settled")} aria-hidden="true"><div className="abuse-zakss-scanlines"/><div className="abuse-zakss-word" data-text="ZAKSS"><span>ZAKSS</span></div><small>ROBLOX HUB // SYSTEM TAKEOVER</small></div>}
      {isIntro ? <div className={"abuse-intro abuse-intro--" + config.className} role="status" aria-live="assertive">
        <div className="abuse-intro-content">
          <span className="abuse-intro-kicker">ROBLOX HUB PRESENTS · {config.kicker}</span>
          <strong>{config.title}</strong>
          <span className="abuse-countdown" key={countdown}>{countdown}</span>
          <span className="abuse-intro-caption">{config.subtitle}</span>
        </div>
      </div> : elapsed < INTRO_DURATION + 1250 ? <div className="abuse-opening" aria-hidden="true">
        <div className="abuse-curtain abuse-curtain-left"/>
        <div className="abuse-curtain abuse-curtain-right"/>
      </div> : null}
      {showEventEffects && !soundReady && <div className="abuse-sound-hint" aria-live="polite">TAP ANYWHERE TO ENABLE EVENT SOUND</div>}
    </>}
    {announcement && <div className="global-announcement" role="status" aria-live="polite">
      <div className="global-announcement-tag">ROBLOX HUB <span>· GLOBAL ANNOUNCEMENT</span></div>
      <p><strong>{announcement.sender_name}:</strong> {announcement.message}</p>
    </div>}
  </>;
}
