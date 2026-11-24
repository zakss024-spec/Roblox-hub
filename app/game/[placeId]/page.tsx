import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {notFound} from "next/navigation";
import {SiteHeader} from "@/components/site-header";
import {GameDetail} from "@/components/game-detail";
import {getRobloxGameByPlaceId} from "@/lib/roblox-game";
export const revalidate=300;
export default async function GamePage({params}:{params:Promise<{placeId:string}>}){const {placeId}=await params;if(!/^\d{1,18}$/.test(placeId))notFound();const game=await getRobloxGameByPlaceId(Number(placeId));if(!game)notFound();return <main><SiteHeader/><section className="hub-page-shell"><Link href="/discover" className="back-link"><ArrowLeft size={15}/> BACK TO DISCOVER</Link><GameDetail game={game}/></section><footer className="site-footer"><Link className="footer-brand" href="/">ROBLOX<span>HUB</span></Link><span>EXPERIENCE DATABASE</span><span>© 2026 ROBLOX HUB</span></footer></main>;}