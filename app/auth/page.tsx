"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Gamepad2, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
export default function AuthPage(){
 const router=useRouter();const [mode,setMode]=useState<"signup"|"signin">("signup");
 useEffect(()=>{let active=true;const supabase=getBrowserSupabase();if(!supabase)return;void supabase.auth.getUser().then(({data})=>{if(active&&data.user)router.replace("/account");});return()=>{active=false;};},[router]);
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [username,setUsername]=useState("");
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setMessage("");
 const supabase=getBrowserSupabase();if(!supabase){setError("Konfigurasi Supabase belum tersedia. Periksa environment Vercel.");setBusy(false);return;}
 try{if(mode==="signup"){const handle=username.trim().toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(handle))throw new Error("Username harus 3–24 karakter: huruf kecil, angka, atau underscore.");
 const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin+"/account",data:{username:handle,display_name:username.trim()}}});if(error)throw error;
 if(data.user && Array.isArray(data.user.identities) && data.user.identities.length===0){setMode("signin");setMessage("Email tersebut tidak dapat didaftarkan sebagai akun baru. Jika sudah memiliki akun, silakan masuk melalui tab SIGN IN.");return;}
 if(data.session&&data.user){await supabase.from("profiles").upsert({id:data.user.id,username:handle,display_name:username.trim()},{onConflict:"id"});router.replace("/account");router.refresh();return;}
 setMessage("Akun berhasil dibuat. Cek email untuk verifikasi, lalu masuk ke ROBLOX HUB.");
 }else{const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;if(data.user){await supabase.from("profiles").upsert({id:data.user.id,display_name:String(data.user.user_metadata?.display_name??data.user.user_metadata?.username??"Player"),username:typeof data.user.user_metadata?.username==="string"?data.user.user_metadata.username:null},{onConflict:"id",ignoreDuplicates:true});}router.replace("/account");router.refresh();return;}
 }catch(err){setError(err instanceof Error?err.message:"Terjadi kesalahan. Coba lagi.");}finally{setBusy(false);}}
 return <main className="auth-page"><div className="auth-top"><Link className="brand" href="/"><span className="brand-mark"><Gamepad2 size={22}/></span><span className="brand-type">ROBLOX<span>HUB</span><small>PLAY YOUR NEXT STORY</small></span></Link><Link className="auth-back" href="/"><ArrowLeft size={15}/> HOME</Link></div>
 <div className="auth-stage"><div className="auth-art"><div className="auth-art-orbit"/><div className="auth-art-orbit orbit-small"/><div className="auth-game-tile"><Gamepad2 size={76}/></div><span className="auth-burst">JOIN<br/>THE<br/>UNIVERSE!</span><span className="auth-art-label">PLAYER ACCESS / 001</span></div>
 <section className="auth-card"><div className="eyebrow dark-eyebrow"><Sparkles size={14}/> PLAYER IDENTITY</div><h1>{mode==="signup"?<>CREATE YOUR<br/><span>PLAYER ID.</span></>:<>WELCOME<br/><span>BACK.</span></>}</h1><p className="auth-subtitle">{mode==="signup"?"One account. A whole universe to explore.":"Your next adventure is waiting."}</p>
 <div className="auth-tabs"><button type="button" className={mode==="signup"?"selected":""} onClick={()=>{setMode("signup");setError("");setMessage("");}}>CREATE ACCOUNT</button><button type="button" className={mode==="signin"?"selected":""} onClick={()=>{setMode("signin");setError("");setMessage("");}}>SIGN IN</button></div>
 <form className="auth-form" onSubmit={submit}>{mode==="signup"&&<label><span>USERNAME</span><div className="auth-input"><UserRound size={17}/><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Your player name" minLength={3} maxLength={24} autoComplete="username" required/></div></label>}
 <label><span>EMAIL ADDRESS</span><div className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></div></label>
 <label><span>PASSWORD</span><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete={mode==="signup"?"new-password":"current-password"} required/></div></label>
 {error&&<p className="auth-feedback error" role="alert">{error}</p>}{message&&<p className="auth-feedback success" role="status">{message}</p>}
 <button className="auth-submit" type="submit" disabled={busy}>{busy?"PLEASE WAIT...":mode==="signup"?"CREATE MY ACCOUNT":"ENTER ROBLOX HUB"} <ArrowRight size={17}/></button></form>
 <p className="auth-legal">Sudah punya akun? <Link href="/login">Masuk di halaman login.</Link> Use a unique password. ROBLOX HUB will never ask for your Roblox password or account cookies.</p></section></div>
 <footer className="auth-footer"><span>ROBLOX HUB / PLAYER GATEWAY</span><span>© 2026 — ALL WORLDS WELCOME</span></footer></main>;
}