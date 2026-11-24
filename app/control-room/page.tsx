"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ShieldCheck, RadioTower, UserPlus, UserMinus, Square, Play, RefreshCw, Send, Sparkles } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { SiteHeader } from "@/components/site-header";
import { OwnerLiveUsers } from "@/components/owner-live-users";

type Role = "owner" | "admin" | null;
type EventType = "taco_rain" | "disco_takeover";
const EVENTS: { id: EventType; name: string; emoji: string; description: string }[] = [
  { id: "taco_rain", name: "Taco Rain", emoji: "🌮", description: "Hujan taco yang ramai dan lucu" },
  { id: "disco_takeover", name: "Disco Fever", emoji: "🪩", description: "Lampu disco berputar dan beam dari dua sisi atas" },
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
  const [selectedEvent, setSelectedEvent] = useState<EventType>("disco_takeover");
  const [eventTime, setEventTime] = useState<string | null>(null);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSummary, setNewsSummary] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsCategory, setNewsCategory] = useState("UPDATE");
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);


  async function refresh() {
    const sb = getBrowserSupabase();
    if (!sb) { setError("Konfigurasi Supabase belum tersedia."); setLoading(false); return; }
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const [{ data: myRole }, { data: event }] = await Promise.all([
      sb.rpc("get_my_site_role"), sb.from("site_admin_abuse").select("active,started_at,event_type,beam_angle").eq("id", true).maybeSingle()
    ]);
    setRole(myRole === "owner" || myRole === "admin" ? myRole : null);
    if (myRole === "owner") { const { data: maintenance } = await sb.from("hub_site_maintenance").select("is_active").eq("id", true).maybeSingle(); setMaintenanceActive(Boolean(maintenance?.is_active)); }
    if (event) {
      setActive(Boolean(event.active));
      if (event.event_type === "taco_rain" || event.event_type === "disco_takeover") setSelectedEvent(event.event_type);
      setEventTime(event.started_at);
    }
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);
  async function toggleMaintenance(next: boolean) {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError("Sesi Owner tidak ditemukan."); return; }
    setMaintenanceBusy(true); setError(""); setNotice("");
    const { error: updateError } = await sb.from("hub_site_maintenance").update({
      is_active: next,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }).eq("id", true);
    if (updateError) setError(updateError.message);
    else {
      setMaintenanceActive(next);
      setNotice(next ? "Maintenance Mode aktif. Pengunjung sekarang melihat halaman perbaikan; akun Owner tetap bisa mengakses website." : "Maintenance Mode dimatikan. Website kembali terbuka untuk semua pengguna.");
    }
    setMaintenanceBusy(false);
  }

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

  async function publishNews(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError("Sesi login tidak ditemukan."); return; }
    setBusy(true); setError(""); setNotice("");
    const { error: publishError } = await sb.from("hub_news").insert({
      author_id: user.id,
      title: newsTitle.trim(),
      summary: newsSummary.trim(),
      body: newsBody.trim(),
      category: newsCategory,
      published_at: new Date().toISOString(),
    });
    if (publishError) setError(publishError.message);
    else {
      setNotice("Berita berhasil diterbitkan ke Hub Newsroom dan Notification Center.");
      setNewsTitle(""); setNewsSummary(""); setNewsBody("");
    }
    setBusy(false);
  }

  return <main className="control-room"><SiteHeader/><section className="control-wrap">
    <Link href="/" className="back-link"><ArrowLeft size={15}/> BACK TO UNIVERSE</Link>
    {loading ? <div className="control-loading">VERIFYING ACCESS...</div> : !role ? <div className="control-denied"><ShieldCheck size={38}/><h1>ACCESS RESTRICTED.</h1><p>Akun ini belum memiliki akses Owner atau Admin.</p><Link href="/account">Kembali ke akun</Link></div> :
    <>
      <div className="control-heading"><div><div className="eyebrow dark-eyebrow"><ShieldCheck size={14}/> PRIVATE COMMAND / ROBLOX HUB</div><h1>CONTROL<br/><span>ROOM.</span></h1><p>Kelola fitur utama dan event website secara realtime. Admin Abuse Intro adalah fitur utama, terpisah dari 20 menu Owner dan 5 menu Admin.</p></div><div className="role-stamp"><span>ACCESS LEVEL</span><strong>{role.toUpperCase()}</strong><small>{role === "owner" ? "20 OWNER MENUS" : "5 ADMIN MENUS"}</small></div></div>
      {role === "owner" && <>
        <OwnerLiveUsers />
        <section className="maintenance-console">
          <div className="maintenance-console-heading"><div><span>OWNER ONLY / SITE AVAILABILITY</span><h2>🛠 MAINTENANCE MODE</h2></div><span className={maintenanceActive ? "maintenance-console-status active" : "maintenance-console-status"}>{maintenanceActive ? "● WEBSITE CLOSED" : "○ WEBSITE OPEN"}</span></div>
          <p>Tutup sementara akses halaman website untuk pengunjung saat ada perbaikan. Lu sebagai Owner tetap bisa membuka seluruh halaman dan Control Room.</p>
          <div className="maintenance-console-actions">
            <button type="button" disabled={maintenanceBusy || maintenanceActive} onClick={() => void toggleMaintenance(true)}> {maintenanceBusy ? "PLEASE WAIT..." : "CLOSE WEBSITE TEMPORARILY"} </button>
            <button type="button" className="maintenance-reopen" disabled={maintenanceBusy || !maintenanceActive} onClick={() => void toggleMaintenance(false)}> {maintenanceBusy ? "PLEASE WAIT..." : "REOPEN WEBSITE"} </button>
          </div>
          <small>Hanya role Owner yang dapat mengubah status. Admin biasa tidak memiliki kontrol ini.</small>
        </section>
      </>}
      <section className="abuse-console">
        <div className="console-title"><div><span>LIVE EVENT CONTROL</span><h2>⚡ ADMIN ABUSE</h2></div><span className={active ? "event-status is-live" : "event-status"}>{active ? "● LIVE" : "○ INACTIVE"}</span></div>
        <p>Pilih event untuk semua pengunjung online. Disco Fever menampilkan lampu sorot bergerak dari kiri dan kanan atas; STOP ALL menghentikan seluruh efek event.</p>
        <div className="abuse-event-picker">
          {EVENTS.map(item => <button type="button" key={item.id} className={selectedEvent === item.id ? "abuse-event-option selected" : "abuse-event-option"} aria-pressed={selectedEvent === item.id} disabled={busy || active} onClick={() => setSelectedEvent(item.id)}>
            <span className="abuse-event-option-emoji">{item.emoji}</span><span className="abuse-event-option-copy"><strong>{item.name}</strong><small>{item.description}</small></span>{selectedEvent === item.id && <span className="abuse-event-option-check">✓</span>}
          </button>)}
        </div>
        <div className="console-actions"><button disabled={busy || active} onClick={() => void toggleEvent(true)} className="start-event"><Play size={17} fill="currentColor"/> START {EVENTS.find(item => item.id === selectedEvent)?.name.toUpperCase()}</button><button disabled={busy || !active} onClick={() => void toggleEvent(false)} className="stop-event"><Square size={16} fill="currentColor"/> STOP ALL</button><button disabled={busy} onClick={() => void refresh()} className="refresh-event"><RefreshCw size={16}/></button></div>
        {eventTime && active && <small className="event-time">Started: {new Date(eventTime).toLocaleString()}</small>}
        <div className="event-sound-note"><Sparkles size={16}/> Efek visual Disco Fever aktif tanpa pemutar video. Musik Garam &amp; Madu belum dipasang sebagai audio langsung karena perlu file/sumber dengan izin pemutaran website.</div>
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
      <section className="announcement-console hub-news-admin">
        <div className="announcement-heading"><div><span>EDITORIAL PUBLISHING</span><h2><BookOpen size={19}/> PUBLISH HUB NEWS</h2></div><Link href="/news">VIEW NEWSROOM ↗</Link></div>
        <p>Terbitkan kabar dan update resmi ROBLOX HUB untuk semua pengunjung.</p>
        <form onSubmit={e => void publishNews(e)} className="announcement-form">
          <label>NEWS TITLE<input value={newsTitle} onChange={e=>setNewsTitle(e.target.value.slice(0,100))} maxLength={100} minLength={4} required placeholder="Judul berita"/></label>
          <label>SHORT SUMMARY<input value={newsSummary} onChange={e=>setNewsSummary(e.target.value.slice(0,240))} maxLength={240} minLength={10} required placeholder="Ringkasan singkat untuk kartu berita"/></label>
          <label>CATEGORY<select value={newsCategory} onChange={e=>setNewsCategory(e.target.value)}><option value="UPDATE">UPDATE</option><option value="ROBLOX">ROBLOX</option><option value="COMMUNITY">COMMUNITY</option><option value="EVENT">EVENT</option></select></label>
          <label>FULL STORY<textarea value={newsBody} onChange={e=>setNewsBody(e.target.value.slice(0,5000))} maxLength={5000} minLength={10} rows={5} required placeholder="Isi berita lengkap..."/></label>
          <div className="announcement-form-bottom"><small>{newsBody.length}/5000 karakter</small><button disabled={busy||newsTitle.trim().length<4||newsSummary.trim().length<10||newsBody.trim().length<10}><BookOpen size={16}/> PUBLISH NEWS</button></div>
        </form>
      </section>
      {role === "owner" && <section className="admin-manage"><div className="manage-icon"><UserPlus size={22}/></div><div className="manage-copy"><span>OWNER ONLY</span><h2>MANAGE ADMIN</h2><p>Masukkan username atau ID publik pengguna yang sudah terdaftar.</p><form onSubmit={e => void manageAdmin(e,true)}><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Username atau RH-000001" required/><button disabled={busy}><UserPlus size={16}/> ADD ADMIN</button></form><form onSubmit={e=>void manageAdmin(e,false)}><button className="remove-admin" disabled={busy || !identifier.trim()}><UserMinus size={16}/> REMOVE ADMIN</button></form></div></section>}
      {error && <p className="control-feedback error">{error}</p>}{notice && <p className="control-feedback success">{notice}</p>}
      <div className="control-note"><RadioTower size={18}/><span>Role diverifikasi melalui fungsi database. Pengguna biasa tidak dapat memicu event, mengirim pengumuman, atau mengangkat Admin.</span></div>
    </>}
  </section><footer className="site-footer"><Link className="footer-brand" href="/">ROBLOX<span>HUB</span></Link><span>PRIVATE COMMAND CENTER</span><span>© 2026 ROBLOX HUB</span></footer></main>;
}
