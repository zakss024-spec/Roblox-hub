"use client";
import Link from "next/link";
import { useCallback,useEffect,useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft,ArrowUpRight,Check,Gamepad2,LogOut,Save,ShieldCheck,UserRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { SiteHeader } from "@/components/site-header";
type Profile={username:string;display_name:string;bio:string;public_id:string};
export default function AccountPage(){
 const router=useRouter();const [user,setUser]=useState<User|null>(null);const [role,setRole]=useState<"owner"|"admin"|null>(null);const [profile,setProfile]=useState<Profile>({username:"",display_name:"Player",bio:"",public_id:""});
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [notice,setNotice]=useState("");const [problem,setProblem]=useState("");
 const load=useCallback(async()=>{const sb=getBrowserSupabase();if(!sb){setProblem("Konfigurasi Supabase belum tersedia.");setLoading(false);return;}
 const {data:{user:u},error}=await sb.auth.getUser();if(error||!u){router.replace("/auth");return;}setUser(u);const {data:myRole}=await sb.rpc("get_my_site_role");setRole(myRole==="owner"||myRole==="admin"?myRole:null);
 const {data,error:profileError}=await sb.from("profiles").select("username,display_name,bio,public_id").eq("id",u.id).maybeSingle();if(profileError)setProblem(profileError.message);
 if(data)setProfile({username:data.username??"",display_name:data.display_name??"Player",bio:data.bio??"",public_id:data.public_id??""});else setProfile({username:typeof u.user_metadata?.username==="string"?u.user_metadata.username:"",display_name:String(u.user_metadata?.display_name??u.user_metadata?.username??"Player"),bio:"",public_id:""});
 setLoading(false);},[router]);
 useEffect(()=>{void load();},[load]);
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setNotice("");setProblem("");const sb=getBrowserSupabase();if(!sb||!user){setProblem("Sesi tidak ditemukan. Masuk kembali.");setSaving(false);return;}
 const handle=profile.username.trim().toLowerCase()||null;if(handle&&!/^[a-z0-9_]{3,24}$/.test(handle)){setProblem("Username harus 3–24 karakter: huruf kecil, angka, atau underscore.");setSaving(false);return;}
 const {error}=await sb.from("profiles").upsert({id:user.id,username:handle,display_name:profile.display_name.trim()||"Player",bio:profile.bio.trim(),updated_at:new Date().toISOString()},{onConflict:"id"});
 if(error)setProblem(error.code==="23505"?"Username ini sudah dipakai. Pilih username lain.":error.message);else setNotice("Profil berhasil disimpan.");setSaving(false);}
 async function logout(){const sb=getBrowserSupabase();if(!sb){setProblem("Konfigurasi sesi tidak tersedia. Muat ulang halaman lalu coba lagi.");return;}const {error}=await sb.auth.signOut({scope:"local"});if(error){setProblem("Logout gagal: "+error.message);return;}window.location.replace("/login");}
 return <main><SiteHeader/><section className="account-page"><Link href="/" className="back-link"><ArrowLeft size={15}/> BACK TO UNIVERSE</Link>
 {loading?<div className="account-loading">LOADING PLAYER DATA...</div>:user&&<><div className="account-heading"><div><div className="eyebrow dark-eyebrow"><UserRound size={14}/> PLAYER PROFILE / 001</div><h1>YOUR PLAYER<br/><span>CARD.</span></h1></div><div className="account-stamp"><ShieldCheck size={23}/><span>ACCOUNT<br/>CONNECTED</span></div></div>
 <div className="account-layout"><aside className="player-card"><div className="player-card-top"><span>ROBLOX HUB / PLAYER</span><span>NO. 001</span></div><div className="player-avatar"><UserRound size={64}/><span>✦</span></div><h2>{profile.display_name||"Player"}</h2><p>@{profile.username||"new_player"}</p><div className="player-public-id">PLAYER ID · {profile.public_id||"ASSIGNING..."}</div><div className="player-card-line"/><div className="player-card-meta"><span>IDENTITY STATUS</span><strong><i/> ACCOUNT ACTIVE</strong></div><div className="player-card-foot">YOUR STORY STARTS HERE <Gamepad2 size={16}/></div></aside>
 <section className="profile-editor"><div className="profile-editor-head"><div><span>PLAYER SETTINGS</span><h2>EDIT YOUR PROFILE</h2></div><span className="profile-edition">EDITION 01</span></div>
 <form onSubmit={save} className="profile-form"><label>DISPLAY NAME<input value={profile.display_name} maxLength={40} onChange={e=>setProfile(p=>({...p,display_name:e.target.value}))} required/></label><label>USERNAME<input value={profile.username} maxLength={24} onChange={e=>setProfile(p=>({...p,username:e.target.value}))} placeholder="your_player_name"/></label><label>ABOUT YOU<textarea value={profile.bio} maxLength={240} rows={4} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} placeholder="Tell the universe a little about yourself..."/></label><label>EMAIL ADDRESS<input value={user.email??""} disabled/></label>
 {problem&&<p className="auth-feedback error" role="alert">{problem}</p>}{notice&&<p className="auth-feedback success" role="status"><Check size={15}/>{notice}</p>}<button className="auth-submit" type="submit" disabled={saving}>{saving?"SAVING...":"SAVE PROFILE"} <Save size={16}/></button></form></section></div>
 <div className="account-links">{role&&<Link href="/control-room" className="account-control-link" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 16px",border:"2px solid #171a20",background:"#f8d34d",color:"#171a20",fontWeight:900,fontSize:11,textDecoration:"none",boxShadow:"3px 3px 0 #171a20"}}><ShieldCheck size={15}/> CONTROL PANEL · {role.toUpperCase()}</Link>}<Link href="/discover">Explore experiences <ArrowUpRight size={15}/></Link><button onClick={logout}><LogOut size={15}/> SIGN OUT</button></div></>}
 </section><footer className="site-footer"><Link className="footer-brand" href="/">ROBLOX<span>HUB</span></Link><span>YOUR STORY. YOUR UNIVERSE.</span><span>© 2026 ROBLOX HUB</span></footer></main>;
}