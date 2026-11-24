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

    setState((current) => ({ ...current, checking: true }));
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
  if (state.checking) return <>{children}</>;
  if (!state.maintenance || state.owner) return <>{children}</>;

  return (
    <main className="maintenance-screen">
      <div className="maintenance-grid" aria-hidden="true"/>
      <div className="maintenance-topline"><span>ROBLOX HUB <b>/</b> SERVICE NOTICE</span><span>NO. 001 — WORK IN PROGRESS</span></div>
      <section className="maintenance-card">
        <header className="maintenance-card-head">
          <div className="maintenance-brand"><i>RH</i><span>ROBLOX<br/>HUB</span></div>
          <span className="maintenance-stamp">OWNER<br/>INITIATED</span>
        </header>
        <div className="maintenance-poster-body">
          <div className="maintenance-copy">
            <span className="maintenance-kicker">PERHATIAN, PLAYER!</span>
            <h1>WEB-NYA<br/>LAGI <em>DIBENAHIN.</em></h1>
            <p>Zakss sedang memperbaiki web agar ROBLOX HUB terus berkembang. Beberapa bagian lagi dirapikan supaya pengalaman menjelajah jadi makin nyaman dan seru.</p>
          </div>
          <div className="maintenance-art" aria-hidden="true">
            <div className="maintenance-art-rays"/>
            <div className="maintenance-art-disc"><span>WIP</span><i>✳</i></div>
            <div className="maintenance-art-tag">UNDER<br/>CONSTRUCTION</div>
            <div className="maintenance-art-spark spark-one">✦</div><div className="maintenance-art-spark spark-two">✳</div>
          </div>
        </div>
        <footer className="maintenance-card-foot">
          <div className="maintenance-status"><span/> SEDANG DALAM PERBAIKAN <small>— coba mampir lagi nanti.</small></div>
          <Link className="maintenance-owner-link" href="/auth">AKSES DEVELOPER / OWNER <b>↗</b></Link>
        </footer>
      </section>
      <footer className="maintenance-footer"><span>BUILT FOR PLAYERS.</span><span>ROBLOX HUB © 2026</span></footer>
    </main>
  );
}
