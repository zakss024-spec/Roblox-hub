"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Gamepad2, LockKeyhole, Mail, Sparkles, UserPlus } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setConfirmPassword("");
  }

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

    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === "register") {
        if (password.length < 8) {
          throw new Error("Password harus terdiri dari minimal 8 karakter.");
        }
        if (password !== confirmPassword) {
          throw new Error("Konfirmasi password belum cocok.");
        }

        const displayName = normalizedEmail.split("@")[0] || "Player";
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { display_name: displayName },
          },
        });
        if (authError) throw authError;

        if (data.user && data.session) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: data.user.id,
            display_name: displayName,
            username: null,
          }, { onConflict: "id", ignoreDuplicates: true });
          if (profileError) throw profileError;
          router.replace("/account");
          router.refresh();
          return;
        }

        setNotice("Pendaftaran diterima. Periksa kotak masuk email kamu, lalu klik tautan konfirmasi dari ROBLOX HUB sebelum login.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
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
      setError(err instanceof Error ? err.message : mode === "register"
        ? "Pendaftaran gagal. Periksa data dan coba lagi."
        : "Login gagal. Periksa email dan password kamu.");
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === "register";

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
          <span className="auth-burst">{registering ? <>JOIN<br/>THE HUB!</> : <>WELCOME<br/>BACK!</>}</span>
          <span className="auth-art-label">PLAYER ACCESS / {registering ? "CREATE ACCOUNT" : "LOGIN"}</span>
        </div>
        <section className="auth-card">
          <div className="eyebrow dark-eyebrow"><Sparkles size={14}/> PLAYER GATEWAY</div>
          <h1>{registering ? <>CREATE<br/><span>ACCOUNT.</span></> : <>WELCOME<br/><span>BACK.</span></>}</h1>
          <p className="auth-subtitle">{registering
            ? "Buat akun ROBLOX HUB menggunakan email aktif dan password kamu."
            : "Masuk dengan akun ROBLOX HUB yang sudah kamu daftarkan."}</p>
          <form className="auth-form" onSubmit={submit}>
            <label><span>EMAIL ADDRESS</span><div className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></div></label>
            <label><span>PASSWORD</span><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={registering ? "Minimal 8 karakter" : "Your account password"} autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 8 : undefined} required/></div></label>
            {registering && <label><span>CONFIRM PASSWORD</span><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Ulangi password kamu" autoComplete="new-password" minLength={8} required/></div></label>}
            {error && <p className="auth-feedback error" role="alert">{error}</p>}
            {notice && <p className="auth-feedback success" role="status">{notice}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy
              ? (registering ? "CREATING ACCOUNT..." : "SIGNING IN...")
              : (registering ? "CREATE MY ACCOUNT" : "ENTER ROBLOX HUB")} {registering ? <UserPlus size={17}/> : <ArrowRight size={17}/>}</button>
          </form>
          <div className="auth-mode-switch">
            {registering ? "Sudah punya akun?" : "Belum punya akun?"}
            <button type="button" onClick={() => switchMode(registering ? "login" : "register")}>
              {registering ? "LOGIN DI SINI" : "BUAT AKUN"}
            </button>
          </div>
          <p className="auth-legal">Gunakan email milikmu sendiri dan jangan pernah bagikan password atau kode verifikasi kepada siapa pun.</p>
        </section>
      </div>
      <footer className="auth-footer"><span>ROBLOX HUB / PLAYER GATEWAY</span><span>© 2026 — ALL WORLDS WELCOME</span></footer>
      <style jsx>{`
        .auth-mode-switch{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:18px 0 0;font-size:11px;font-weight:700;color:#686861}
        .auth-mode-switch button{border:0;background:transparent;padding:4px;color:#e85b35;font:900 11px 'DM Sans',sans-serif;letter-spacing:.5px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
        .auth-mode-switch button:focus-visible{outline:2px solid #315fe8;outline-offset:3px}
      `}</style>
    </main>
  );
}
