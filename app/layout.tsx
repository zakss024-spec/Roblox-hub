import type { Metadata } from "next";
import "./globals.css";
import "./catalog.css";
import "./auth.css";
import "./admin-abuse.css";
import "./global-chat.css";
import "./zakss-ai.css";
import "./platform.css";
import "./presence.css";
import "./maintenance.css";
import { AdminAbuseOverlay } from "@/components/admin-abuse-overlay";
import { GlobalChat } from "@/components/global-chat";
import { UserPresenceTracker } from "@/components/user-presence-tracker";
import { MaintenanceGate } from "@/components/maintenance-gate";
export const metadata: Metadata = {title:"ROBLOX HUB — Enter the universe",description:"Discover your next Roblox experience in a comic-inspired universe.",applicationName:"ROBLOX HUB",themeColor:"#f4f0e6"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><MaintenanceGate>{<>{children}<AdminAbuseOverlay/><GlobalChat/></>}</MaintenanceGate><UserPresenceTracker/></body></html>}
