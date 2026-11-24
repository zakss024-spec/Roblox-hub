"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Gamepad2, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) router.replace("/account");
    });
    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Konfigurasi Supabase belum tersedia. Periksa environment Vercel.");
      setBusy(false);
      return;
    }
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      if (!data.user) throw new Error("Sesi login tidak berhasil dibuat. Coba lagi.");
      const metadata = data.user.user_metadata ?? {};
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: String(metadata.display_name ?? metadata.username ?? "Player"),
        username: typeof metadata.username === "string" ? metadata.username : null,
      }, { onConflict: "id", ignoreDuplicates: true });
      if (profileError) throw profileError;
      router.replace("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message.toLowerCase().includes("invalid login")
        ? "Email atau password salah. Periksa kembali atau buat akun baru."
        : err instanceof Error ? err.message : "Login gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-top">
        <Link className="brand" href="/">
          <span className="brand-mark"><Gamepad2 size={22}/></span>
          <span className="brand-type">ROBLOX<span>HUB</span><small>PLAY YOUR NEXT STORY</small></span>
        </Link>
        <Link className="auth-back" href="/"><ArrowLeft size={15}/> HOME</Link>
      </div>
      <div className="auth-stage">
        <div className="auth-art">
          <div className="auth-art-orbit"/><div className="auth-art-orbit orbit-small"/>
          <div className="auth-game-tile"><Gamepad2 size={76}/></div>
          <span className="auth-burst">WELCOME<br/>BACK!</span>
          <span className="auth-art-label">PLAYER ACCESS / LOGIN</span>
        </div>
        <section className="auth-card">
          <div className="eyebrow dark-eyebrow"><Sparkles size={14}/> PLAYER GATEWAY</div>
          <h1>WELCOME<br/><span>BACK.</span></h1>
          <p className="auth-subtitle">Masuk dengan akun ROBLOX HUB yang sudah kamu daftarkan.</p>
          <form className="auth-form" onSubmit={submit}>
            <label><span>EMAIL ADDRESS</span><div className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></div></label>
            <label><span>PASSWORD</span><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your account password" autoComplete="current-password" required/></div></label>
            {error && <p className="auth-feedback error" role="alert">{error}</p>}
            {notice && <p className="auth-feedback success" role="status">{notice}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy?"SIGNING IN...":"ENTER ROBLOX HUB"} <ArrowRight size={17}/></button>
          </form>
          <p className="auth-legal">Gunakan akun ROBLOX HUB kamu untuk melanjutkan. Jangan pernah bagikan password Roblox atau cookie akunmu.</p>
        </section>
      </div>
      <footer className="auth-footer"><span>ROBLOX HUB / PLAYER GATEWAY</span><span>© 2026 — ALL WORLDS WELCOME</span></footer>
    </main>
  );
}
