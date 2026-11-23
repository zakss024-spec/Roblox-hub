import Link from "next/link";
import { ArrowLeft, Compass, Gamepad2, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
export default function DiscoverPage() {
 return <main><SiteHeader/><section className="discover-page">
  <Link className="back-link" href="/"><ArrowLeft size={15}/> BACK TO HOME</Link>
  <div className="discover-intro"><div className="eyebrow dark-eyebrow"><Compass size={14}/> THE DISCOVERY ZONE</div><h1>FIND YOUR<br/><span>NEXT WORLD.</span></h1><p>The game catalog is not connected yet. Once the dedicated Supabase project and catalog tables are ready, real Roblox experiences will appear here.</p></div>
  <div className="empty-comic"><div className="empty-stamp"><Sparkles size={27}/><span>COMING<br/>INTO FOCUS</span></div><div className="empty-portal"><div className="portal-ring ring-one"/><div className="portal-ring ring-two"/><Gamepad2 size={66}/></div><div className="empty-note"><span>ISSUE 001</span><strong>THE NEXT ADVENTURE IS LOADING.</strong><p>No sample games or invented ratings. This space will show verified catalog data only.</p></div></div>
  <Link className="button-primary discover-home" href="/">Return to the universe <ArrowLeft size={17}/></Link>
 </section><footer className="site-footer"><Link className="footer-brand" href="/">ROBLOX<span>HUB</span></Link><span>AN UNIVERSE OF EXPERIENCES.</span><span>© 2026 ROBLOX HUB</span></footer></main>;
}