"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, BrainCircuit, Compass, Flame, Gamepad2, Newspaper, Bookmark, Sparkles, UserRound, Users } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function SiteHeader(){
 const [signedIn,setSignedIn]=useState(false);
 const [sessionChecked,setSessionChecked]=useState(false);
 useEffect(()=>{
  const supabase=getBrowserSupabase();
  if(!supabase){setSessionChecked(true);return;}
  let active=true;
  void supabase.auth.getUser().then(({data})=>{if(active){setSignedIn(Boolean(data.user));setSessionChecked(true);}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(active){setSignedIn(Boolean(session?.user));setSessionChecked(true);}
  });
  return()=>{active=false;subscription.unsubscribe();};
 },[]);
 return <header className="site-header">
  <Link className="brand" href="/" aria-label="ROBLOX HUB home"><span className="brand-mark"><Gamepad2 size={22}/></span><span className="brand-type">ROBLOX<span>HUB</span><small>PLAY YOUR NEXT STORY</small></span></Link>
  <nav className="desktop-nav" aria-label="Main navigation"><Link className="nav-active" href="/"><Sparkles size={15}/> Home</Link><Link href="/discover"><Compass size={15}/> Discover</Link><Link href="/trending"><Flame size={15}/> Trending</Link><Link href="/community"><Users size={15}/> Community</Link><Link href="/zakss-ai"><BrainCircuit size={15}/> Zakss AI</Link></nav>
  <div className="header-actions"><Link className="icon-button" href="/news" aria-label="Hub news"><Newspaper size={18}/></Link><Link className="icon-button" href="/notifications" aria-label="Notifications"><Bell size={18}/></Link><Link className="icon-button" href="/collection" aria-label="My collection"><Bookmark size={18}/></Link>
   {sessionChecked&&<><Link className="icon-button mobile-player-access" href={signedIn?"/account":"/login"} aria-label={signedIn?"Player account":"Player login"}><UserRound size={18}/></Link><Link className="header-cta" href={signedIn?"/account":"/login"}>{signedIn?"My Account":"Player login"} <span>↗</span></Link></>}
  </div>
 </header>;
}
