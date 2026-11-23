import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Compass, Gamepad2, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getPublishedExperiences } from "@/lib/supabase";

export const revalidate = 60;

export default async function DiscoverPage() {
 const experiences = await getPublishedExperiences();
 return <main><SiteHeader/><section className="discover-page">
  <Link className="back-link" href="/"><ArrowLeft size={15}/> BACK TO HOME</Link>
  <div className="discover-intro"><div className="eyebrow dark-eyebrow"><Compass size={14}/> THE DISCOVERY ZONE</div><h1>FIND YOUR<br/><span>NEXT WORLD.</span></h1><p>Explore experiences published in the ROBLOX HUB catalog. New worlds appear here when they are verified and approved.</p></div>
  {experiences.length > 0 ? <div className="experience-grid">{experiences.map((game) => <article className="experience-card" key={game.id}>
    <div className="experience-art" style={game.thumbnail_url ? {backgroundImage: `linear-gradient(180deg,transparent,#171a2066),url("${game.thumbnail_url}")`} : undefined}>
      {!game.thumbnail_url && <Gamepad2 size={48}/>}
      {game.featured && <span className="featured-sticker">FEATURED ✦</span>}
      {game.genre && <span className="genre-sticker">{game.genre}</span>}
    </div>
    <div className="experience-info"><h2>{game.name}</h2><p>{game.description || "A new experience is waiting to be explored."}</p><span className="experience-open">EXPERIENCE DETAILS <ArrowUpRight size={14}/></span></div>
  </article>)}</div> : <div className="empty-comic"><div className="empty-stamp"><Sparkles size={27}/><span>COMING<br/>INTO FOCUS</span></div><div className="empty-portal"><div className="portal-ring ring-one"/><div className="portal-ring ring-two"/><Gamepad2 size={66}/></div><div className="empty-note"><span>ISSUE 001</span><strong>THE NEXT ADVENTURE IS LOADING.</strong><p>No sample games or invented ratings. Published catalog entries will appear here when the public database API is enabled and real experiences are added.</p></div></div>}
  <Link className="button-primary discover-home" href="/">Return to the universe <ArrowLeft size={17}/></Link>
 </section><footer className="site-footer"><Link className="footer-brand" href="/">ROBLOX<span>HUB</span></Link><span>AN UNIVERSE OF EXPERIENCES.</span><span>© 2026 ROBLOX HUB</span></footer></main>;
}
