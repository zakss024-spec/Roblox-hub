import type { Metadata, Viewport } from "next";
import "./studio.css";
export const metadata: Metadata = { title: "ROBLOX HUB STUDIO", description: "Build and publish worlds for ROBLOX HUB." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }
