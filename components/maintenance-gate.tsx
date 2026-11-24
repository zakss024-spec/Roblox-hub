"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type GateState = { checking: boolean; maintenance: boolean; owner: boolean };

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<GateState>({ checking: true, maintenance: false, owner: false });

  useEffect(() => {
    if (pathname === "/auth" || pathname === "/login") {
      setState({ checking: false, maintenance: false, owner: false });
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setState({ checking: false, maintenance: false, owner: false });
      return;
    }

    let active = true;
    const refresh = async () => {
      const [{ data: userData }, { data: setting, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("hub_site_maintenance").select("is_active").eq("id", true).maybeSingle(),
      ]);
      if (!active) return;
      if (error) {
        setState({ checking: false, maintenance: false, owner: false });
        return;
      }
      let owner = false;
      if (userData.user) {
        const { data: role } = await supabase.rpc("get_my_site_role");
        owner = role === "owner";
      }
      if (active) setState({ checking: false, maintenance: Boolean(setting?.is_active), owner });
    };

    void refresh();
    const channel = supabase
      .channel("hub-maintenance-gate")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "hub_site_maintenance" }, (payload) => {
        const next = payload.new as { is_active?: boolean };
        setState((current) => ({ ...current, maintenance: Boolean(next.is_active) }));
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [pathname]);

  if (pathname === "/auth" || pathname === "/login") return <>{children}</>;
  if (state.checking) {
    return <main className="maintenance-screen"><div className="maintenance-card"><span className="maintenance-kicker">ROBLOX HUB / SYSTEM CHECK</span><div className="maintenance-spinner"/><h1>CHECKING<br/><span>THE HUB.</span></h1><p>Memeriksa status layanan...</p></div></main>;
  }
  if (!state.maintenance || state.owner) return <>{children}</>;

  return (
    <main className="maintenance-screen">
      <div className="maintenance-grid" aria-hidden="true"/>
      <section className="maintenance-card">
        <div className="maintenance-brand">ROBLOX<span>HUB</span></div>
        <div className="maintenance-symbol">⚙</div>
        <span className="maintenance-kicker">TEMPORARILY OFFLINE / SYSTEM CARE</span>
        <h1>WE’LL BE<br/><span>RIGHT BACK.</span></h1>
        <p>ROBLOX HUB sedang menjalani perbaikan sementara agar pengalaman bermain dan menjelajah tetap nyaman.</p>
        <div className="maintenance-status"><span/> MAINTENANCE MODE ACTIVE</div>
        <small>Silakan coba lagi beberapa saat lagi.</small>
        <Link className="maintenance-owner-link" href="/auth">Akses Developer / Owner</Link>
      </section>
      <footer className="maintenance-footer">ROBLOX HUB · THANK YOU FOR YOUR PATIENCE</footer>
    </main>
  );
}
