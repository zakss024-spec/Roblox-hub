import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Compass, Gamepad2, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
const pillars = [
  {icon:Compass,number:"01",title:"Discover worlds",copy:"Explore Roblox experiences by genre, mood, and the kind of adventure you want today."},
  {icon:Sparkles,number:"02",title:"Build your collection",copy:"Keep the experiences you love close. Your personal collection belongs to you."},
  {icon:ShieldCheck,number:"03",title:"Creator command",copy:"A private control space for game owners and people they explicitly authorize."}
];
export default function Home() {
 return <main>
  <SiteHeader/>
  <section className="hero-shell">
   <div className="hero-grid" aria-hidden="true"/>
   <div className="hero-copy">
    <div className="eyebrow"><span className="live-dot"/> YOUR NEXT OBSESSION STARTS HERE</div>
    <h1>ENTER A WORLD<br/>OF <span className="comic-word">PLAY.</span></h1>
    <p className="hero-description">A universe of Roblox experiences, made for your next great story. Find a new world worth getting lost in.</p>
    <div className="hero-buttons"><Link className="button-primary" href="/discover">Explore experiences <ArrowUpRight size={18}/></Link><a className="button-quiet" href="#universe">See what’s inside <ArrowDownRight size={17}/></a></div>
    <div className="hero-footnote"><span className="footline"/> MADE FOR THE CURIOUS. BUILT FOR THE PLAYERS.</div>
   </div>
   <div className="hero-art" aria-label="Comic-inspired portal illustration">
    <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
    <div className="burst">WOW!</div><div className="comic-panel panel-back">LEVEL UP</div>
    <div className="comic-cube"><div className="cube-top"/><div className="cube-front"><Gamepad2 size={82}/></div><div className="cube-side"/></div>
    <div className="comic-panel panel-front">YOUR<br/>NEXT<br/>WORLD <i>↗</i></div>
    <div className="spark spark-a">✳</div><div className="spark spark-b">✦</div><div className="art-caption">FIG. 001 — THE PORTAL</div>
   </div>
   <div className="hero-index"><span>01</span><span className="index-line"/><span>03</span></div>
  </section>
  <section className="ticker"><div>DISCOVER <b>✳</b> EXPLORE <b>✳</b> COLLECT <b>✳</b> REPEAT <b>✳</b> DISCOVER <b>✳</b> EXPLORE <b>✳</b> COLLECT <b>✳</b> REPEAT <b>✳</b></div></section>
  <section className="universe-section" id="universe">
   <div className="section-heading"><div><div className="eyebrow dark-eyebrow">THE UNIVERSE IS YOURS</div><h2>MORE THAN A<br/><span>GAME DIRECTORY.</span></h2></div><p>Every great adventure starts with a little curiosity. ROBLOX HUB brings discovery, personal collections, and authorized creator tools into one playful universe.</p></div>
   <div className="pillar-grid">{pillars.map(item=><article className="pillar" key={item.number}><div className="pillar-top"><span>{item.number} / 03</span><item.icon size={23}/></div><h3>{item.title}</h3><p>{item.copy}</p><div className="pillar-arrow">↗</div></article>)}</div>
  </section>
  <section className="owner-strip"><div className="owner-symbol"><Globe2 size={27}/></div><div className="owner-copy"><span className="eyebrow">FOR GAME OWNERS & CREATORS</span><h2>YOUR WORLD.<br/>YOUR RULES.</h2><p>Private owner tools will only become available after secure account and server-side permission verification.</p></div><div className="owner-cta"><span>PRIVATE ACCESS</span><span className="owner-locked">ACCESS CONTROLLED <ShieldCheck size={16}/></span></div></section>
  <footer className="site-footer"><Link className="footer-brand" href="/">ROBLOX<span>HUB</span></Link><span>AN UNIVERSE OF EXPERIENCES.</span><span>© 2026 ROBLOX HUB</span></footer>
 </main>;
}