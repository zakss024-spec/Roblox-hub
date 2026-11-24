"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type EventType = "taco_rain" | "disco_takeover";
type GlobalEffect = { id: string; effect_type: "confetti" | "firework"; created_at: string };
type EventState = { active: boolean; started_at: string | null; event_type?: EventType; beam_angle?: number };
type Announcement = { id: number; sender_name: string; message: string; created_at: string };

const INTRO_DURATION = 5000;
const particles = Array.from({ length: 38 }, (_, i) => i);
let globalEffectAudioContext: AudioContext | null = null;
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

function playGlobalEffectSound(type: "confetti" | "firework") {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = globalEffectAudioContext ?? (globalEffectAudioContext = new AudioContextClass());
  void context.resume().then(() => {
    if (context.state !== "running") { void context.close(); return; }
    const now = context.currentTime;
    if (type === "confetti") {
      [659.25, 783.99, 987.77, 1318.51].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + index * 0.075;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.085, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(start); oscillator.stop(start + 0.44);
      });
    } else {
      const length = Math.floor(context.sampleRate * 1.25);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) channel[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      noise.buffer = buffer; filter.type = "lowpass";
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.62);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      noise.connect(filter); filter.connect(gain); gain.connect(context.destination);
      noise.start(now); noise.stop(now + 1.22);
      const pop = context.createOscillator();
      const popGain = context.createGain();
      pop.type = "sine"; pop.frequency.setValueAtTime(180, now + 0.72);
      pop.frequency.exponentialRampToValueAtTime(48, now + 1.12);
      popGain.gain.setValueAtTime(0.0001, now + 0.72);
      popGain.gain.exponentialRampToValueAtTime(0.22, now + 0.75);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.18);
      pop.connect(popGain); popGain.connect(context.destination);
      pop.start(now + 0.72); pop.stop(now + 1.2);
    }
  }).catch(() => { /* The visitor can unlock audio from the sound control. */ });
}

function startEventMusic(_type: EventType, onReady: () => void) {
  const audioUrl = _type === "disco_takeover"
    ? "https://github.com/zakss024-spec/Roblox-hub/releases/download/disco-audio-v1/garam-madu.mp3"
    : "https://quicksounds.com/uploads/tracks/1219935113_1051071961_1597840749.mp3";
  const audio = new Audio(audioUrl);
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
  const [remixActive, setRemixActive] = useState(false);
  const [globalEffect, setGlobalEffect] = useState<GlobalEffect | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const effectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remixKey, setRemixKey] = useState(0);
  const announcementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remixTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "site_effect_triggers" },
        (payload) => {
          if (!alive) return;
          const next = payload.new as GlobalEffect;
          if (next.effect_type !== "confetti" && next.effect_type !== "firework") return;
          setGlobalEffect(next);
          if (effectTimer.current) clearTimeout(effectTimer.current);
          effectTimer.current = setTimeout(() => setGlobalEffect(null), 4200);
          if (soundEnabledRef.current) playGlobalEffectSound(next.effect_type);
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
      if (remixTimer.current) clearTimeout(remixTimer.current);
      if (effectTimer.current) clearTimeout(effectTimer.current);
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
  const eventType: EventType = event.event_type === "disco_takeover" ? "disco_takeover" : "taco_rain";
  const isIntro = event.active && eventType === "taco_rain" && elapsed < INTRO_DURATION;
  const countdown = Math.max(1, 5 - Math.floor(elapsed / 1000));
  const showEventEffects = event.active && (eventType === "disco_takeover" || elapsed >= INTRO_DURATION);

  useEffect(() => {
    setSoundReady(false);
    if (!showEventEffects || typeof window === "undefined") return;
    return startEventMusic(eventType, () => setSoundReady(true));
  }, [showEventEffects, eventType]);


  return <>
    {event.active && <>
      {showEventEffects && (eventType === "disco_takeover" ? <><div className="abuse-event abuse-event--disco" aria-hidden="true"><div className="abuse-disco-lights"/><div className="abuse-disco-rig"><span className="abuse-disco-lamp abuse-disco-lamp--left"/><span className="abuse-disco-lamp abuse-disco-lamp--right"/></div><div className="abuse-disco-ball">🪩</div>{remixActive && <div className="abuse-remix-fx" key={remixKey} aria-hidden="true"><div className="abuse-remix-rockets">{Array.from({length:7},(_,i)=><span key={i} style={{left:`${9+i*13}%`,animationDelay:`${i*.11}s`}}>✦</span>)}</div><div className="abuse-remix-confetti">{Array.from({length:44},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`${(i%11)*.045}s`,rotate:`${(i*29)%160}deg`}}/>)}</div><div className="abuse-remix-flares"><i/><i/><i/></div></div>}</div><button type="button" className="abuse-remix-button" onClick={()=>{setRemixKey((v)=>v+1);setRemixActive(true);if(remixTimer.current)clearTimeout(remixTimer.current);remixTimer.current=setTimeout(()=>setRemixActive(false),2600);}} aria-label="Trigger Disco Remix effects"><span>✦</span> REMIX <span>✦</span></button></> : <div className="abuse-event abuse-event--taco" aria-hidden="true">
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
          <strong>TACO RAIN</strong>
          <span className="abuse-countdown" key={countdown}>{countdown}</span>
          <span className="abuse-intro-caption">THE TACO STORM IS HERE!</span>
        </div>
      </div> : eventType === "taco_rain" && elapsed < INTRO_DURATION + 1250 ? <div className="abuse-opening" aria-hidden="true">
        <div className="abuse-curtain abuse-curtain-left"/>
        <div className="abuse-curtain abuse-curtain-right"/>
      </div> : null}
      {showEventEffects && eventType === "taco_rain" && !soundReady && <div className="abuse-sound-hint" aria-live="polite">TAP ANYWHERE TO ENABLE EVENT SOUND</div>}
    </>}
    {globalEffect && <div className={`global-owner-effect global-owner-effect--${globalEffect.effect_type}`} key={globalEffect.id} aria-hidden="true">
      {globalEffect.effect_type === "confetti" ? <><div className="global-confetti-corner global-confetti-corner--left">{Array.from({length:30},(_,i)=><i key={i} style={{left:`${(i*31)%100}%`,"--i":i,"--delay":`${(i%10)*.045}s`} as React.CSSProperties}/>)}</div><div className="global-confetti-corner global-confetti-corner--right">{Array.from({length:30},(_,i)=><i key={i} style={{left:`${(i*31)%100}%`,"--i":i+30,"--delay":`${(i%10)*.045}s`} as React.CSSProperties}/>)}</div></> : <div className="global-firework-launches">{Array.from({length:5},(_,i)=><span key={i} style={{"--i":i,"--delay":`${i*.14}s`} as React.CSSProperties}><i/></span>)}</div>}
    </div>}
    <button type="button" className="global-effect-sound-enable" aria-label={soundEnabled ? "Matikan suara efek" : "Aktifkan suara efek"} onClick={()=>{const next=!soundEnabled; soundEnabledRef.current=next; setSoundEnabled(next); if(next){const AudioContextClass=window.AudioContext;if(AudioContextClass){globalEffectAudioContext??=new AudioContextClass();void globalEffectAudioContext.resume();} if(globalEffect)playGlobalEffectSound(globalEffect.effect_type);}}}>{soundEnabled ? "🔊 SOUND ON" : "🔇 SOUND OFF"}</button>
    {announcement && <div className="global-announcement" role="status" aria-live="polite">
      <div className="global-announcement-tag">ROBLOX HUB <span>· GLOBAL ANNOUNCEMENT</span></div>
      <p><strong>{announcement.sender_name}:</strong> {announcement.message}</p>
    </div>}
  </>;
}
