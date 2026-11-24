"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, RadioTower, UserPlus, UserMinus, Square, Play, RefreshCw, Send, Sparkles } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { SiteHeader } from "@/components/site-header";

type Role = "owner" | "admin" | null;
type EventType = "taco_rain";
const EVENTS: { id: EventType; name: string; emoji: string; description: string }[] = [
  { id: "taco_rain", name: "Taco Rain", emoji: "🌮", description: "Hujan taco yang ramai dan lucu" },
];

export default function ControlRoomPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [eventTime, setEventTime] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventType>("taco_rain");

  async function refresh() {
    const sb = getBrowserSupabase();
    if (!sb) { setError("Konfigurasi Supabase belum tersedia."); setLoading(false); return; }
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const [{ data: myRole }, { data: event }] = await Promise.all([
      sb.rpc("get_my_site_role"), sb.from("site_admin_abuse").select("active,started_at,event_type,beam_angle").eq("id", true).maybeSingle()
    ]);
    setRole(myRole === "owner" || myRole === "admin" ? myRole : null);
    if (event) {
      setActive(Boolean(event.active));
      setEventTime(event.started_at);
      if (EVENTS.some(item => item.id === event.event_type)) setSelectedEvent(event.event_type as EventType);
    }
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);
  async function toggleEvent(next: boolean) {
    const sb = getBrowserSupabase(); if (!sb) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await sb.rpc("set_site_admin_abuse", { is_active: next, selected_event: selectedEvent });
    if (rpcError) setError(rpcError.message);
    else {
      setNotice(next ? `${EVENTS.find(item => item.id === selectedEvent)?.name} dimulai untuk pengunjung online.` : "STOP ALL berhasil. Event dan musik dihentikan untuk semua pengunjung.");
      await refresh();
    }
    setBusy(false);
  }
  async function manageAdmin(e: FormEvent<HTMLFormElement>, makeAdmin: boolean) {
    e.preventDefault(); const sb = getBrowserSupabase(); if (!sb) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await sb.rpc("manage_site_admin", { target_identifier: identifier.trim(), make_admin: makeAdmin });
    if (rpcError) setError(rpcError.message.includes("USER_NOT_FOUND") ? "Akun tidak ditemukan. Pastikan pengguna sudah terdaftar dan profilnya tersedia." : rpcError.message);
    else { setNotice(makeAdmin ? "Akun berhasil diangkat menjadi Admin." : "Hak Admin berhasil dicabut."); setIdentifier(""); }
    setBusy(false);
  }
  async function sendAnnouncement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const sb = getBrowserSupabase();
    if (!sb) return;
    const message = announcementText.trim();
    if (!message || message.length > 280) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await sb.rpc("send_site_announcement", { announcement_text: message });
    if (rpcError) {
      const msg = rpcError.message;
      setError(msg.includes("PLEASE_WAIT") ? "Tunggu beberapa detik sebelum mengirim pengumuman berikutnya." : msg.includes("FORBIDDEN") ? "Akses ditolak." : msg);
    } else {
      setNotice("Pengumuman berhasil dikirim ke pengunjung yang sedang online.");
      setAnnouncementText("");
    }
    setBusy(false);
  }

  return <main className="control-room"><SiteHeader/><section className="control-wrap">
    <Link href="/" className="back-link"><ArrowLeft size={15}/> BACK TO UNIVERSE</Link>
    {loading ? <div className="control-loading">VERIFYING ACCESS...</div> : !role ? <div className="control-denied"><ShieldCheck size={38}/><h1>ACCESS RESTRICTED.</h1><p>Akun ini belum memiliki akses Owner atau Admin.</p><Link href="/account">Kembali ke akun</Link></div> :
    <>
      <div className="control-heading"><div><div className="eyebrow dark-eyebrow"><ShieldCheck size={14}/> PRIVATE COMMAND / ROBLOX HUB</div><h1>CONTROL<br/><span>ROOM.</span></h1><p>Kelola fitur utama dan event website secara realtime. Admin Abuse Intro adalah fitur utama, terpisah dari 20 menu Owner dan 5 menu Admin.</p></div><div className="role-stamp"><span>ACCESS LEVEL</span><strong>{role.toUpperCase()}</strong><small>{role === "owner" ? "20 OWNER MENUS" : "5 ADMIN MENUS"}</small></div></div>
      <section className="abuse-console">
        <div className="console-title"><div><span>LIVE EVENT CONTROL</span><h2>⚡ ADMIN ABUSE</h2></div><span className={active ? "event-status is-live" : "event-status"}>{active ? "● LIVE" : "○ INACTIVE"}</span></div>
        <p>Taco Rain adalah satu-satunya event Admin Abuse yang tersedia. Pengunjung online menerima intro, animasi hujan taco, dan soundtrack event. STOP ALL menghentikan semuanya.</p>
        <div className="abuse-event-picker">
          <div className="abuse-event-option selected" aria-current="true">
            <span className="abuse-event-option-emoji">🌮</span><span className="abuse-event-option-copy"><strong>Taco Rain</strong><small>Hujan taco yang ramai dan lucu</small></span><span className="abuse-event-option-check">✓</span>
          </div>
        </div>
        <div className="console-actions"><button disabled={busy || active} onClick={() => void toggleEvent(true)} className="start-event"><Play size={17} fill="currentColor"/> START {EVENTS.find(item => item.id === selectedEvent)?.name.toUpperCase()}</button><button disabled={busy || !active} onClick={() => void toggleEvent(false)} className="stop-event"><Square size={16} fill="currentColor"/> STOP ALL</button><button disabled={busy} onClick={() => void refresh()} className="refresh-event"><RefreshCw size={16}/></button></div>
        {eventTime && active && <small className="event-time">Started: {new Date(eventTime).toLocaleString()}</small>}
        <div className="event-sound-note"><Sparkles size={16}/> Setiap event memiliki soundtrack sintetis berbeda. Pengunjung mungkin perlu mengetuk layar sekali agar browser mengizinkan audio.</div>
      </section>
      <section className="announcement-console">
        <div className="announcement-heading"><div><span>LIVE MESSAGE SYSTEM</span><h2>GLOBAL ANNOUNCEMENT</h2></div><span className="announcement-live">● REALTIME</span></div>
        <p>Kirim pesan ke semua pengunjung yang sedang membuka ROBLOX HUB. Nama pengirim diambil otomatis dari profil akun.</p>
        <form onSubmit={e => void sendAnnouncement(e)} className="announcement-form">
          <label htmlFor="announcement-message">MASUKKAN TEKS PENGUMUMAN</label>
          <textarea id="announcement-message" value={announcementText} onChange={e=>setAnnouncementText(e.target.value.slice(0,280))} placeholder="Tulis pengumuman di sini..." maxLength={280} rows={3} required />
          <div className="announcement-form-bottom"><small>{announcementText.length}/280 karakter · jeda 8 detik antar pesan</small><button disabled={busy || !announcementText.trim()}><Send size={16}/> KIRIM TEXT PENGUMUMAN</button></div>
        </form>
      </section>
      {role === "owner" && <section className="admin-manage"><div className="manage-icon"><UserPlus size={22}/></div><div className="manage-copy"><span>OWNER ONLY</span><h2>MANAGE ADMIN</h2><p>Masukkan username atau ID publik pengguna yang sudah terdaftar.</p><form onSubmit={e => void manageAdmin(e,true)}><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Username atau RH-000001" required/><button disabled={busy}><UserPlus size={16}/> ADD ADMIN</button></form><form onSubmit={e=>void manageAdmin(e,false)}><button className="remove-admin" disabled={busy || !identifier.trim()}><UserMinus size={16}/> REMOVE ADMIN</button></form></div></section>}
      {error && <p className="control-feedback error">{error}</p>}{notice && <p className="control-feedback success">{notice}</p>}
      <div className="control-note"><RadioTower size={18}/><span>Role diverifikasi melalui fungsi database. Pengguna biasa tidak dapat memicu event, mengirim pengumuman, atau mengangkat Admin.</span></div>
    </>}
  </section><footer className="site-footer"><Link className="footer-brand" href="/">ROBLOX<span>HUB</span></Link><span>PRIVATE COMMAND CENTER</span><span>© 2026 ROBLOX HUB</span></footer></main>;
}
