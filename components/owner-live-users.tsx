"use client";
import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, Users } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type PresenceRow = {
  user_id: string;
  display_name: string;
  is_online: boolean;
  last_seen: string;
};

const STALE_AFTER_MS = 90_000;

export function OwnerLiveUsers() {
  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) {
      setError("Koneksi database belum tersedia.");
      setLoading(false);
      return;
    }
    let active = true;
    let channel: ReturnType<typeof sb.channel> | null = null;

    const load = async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Sesi Owner tidak ditemukan.");
      const { data: role, error: roleError } = await sb.rpc("get_my_site_role");
      if (roleError) throw roleError;
      if (role !== "owner") throw new Error("Monitor ini khusus akun Owner.");
      const { data, error: queryError } = await sb
        .from("hub_user_presence")
        .select("user_id,display_name,is_online,last_seen")
        .order("last_seen", { ascending: false })
        .limit(500);
      if (queryError) throw queryError;
      if (active) setRows((data ?? []) as PresenceRow[]);
    };

    const init = async () => {
      try {
        await load();
        if (!active) return;
        channel = sb.channel("owner-live-user-presence")
          .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "hub_user_presence",
          }, () => { void load().catch((e) => {
            if (active) setError(e instanceof Error ? e.message : "Gagal memperbarui daftar.");
          }); })
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR" && active) {
              setError("Koneksi realtime terputus. Coba muat ulang monitor.");
            }
          });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Monitor tidak dapat dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();
    return () => {
      active = false;
      if (channel) void sb.removeChannel(channel);
    };
  }, []);

  const users = useMemo(() => rows.map((row) => ({
    ...row,
    online: row.is_online && clock - new Date(row.last_seen).getTime() < STALE_AFTER_MS,
  })), [rows, clock]);
  const onlineCount = users.filter((u) => u.online).length;

  return <section className="owner-live-monitor">
    <header className="owner-live-heading">
      <div><span><Activity size={14}/> OWNER ONLY / LIVE PRESENCE</span><h2><Users size={21}/> LIVE USER MONITOR</h2><p>Daftar nama dan status koneksi pengguna. Tidak ada email atau data login yang dimuat.</p></div>
      <div className="owner-live-count"><strong>{onlineCount}</strong><small>ONLINE NOW</small></div>
    </header>
    {loading ? <div className="owner-live-empty"><RefreshCw size={17}/> CONNECTING TO LIVE PRESENCE...</div>
      : error ? <div className="owner-live-error">{error}</div>
      : users.length ? <div className="owner-live-list">{users.map((user) => <div className="owner-live-row" key={user.user_id}>
        <span className={user.online ? "owner-live-dot online" : "owner-live-dot"} />
        <strong>{user.display_name || "Player"}</strong>
        <span className={user.online ? "owner-live-status online" : "owner-live-status"}>{user.online ? "ONLINE" : "OFFLINE"}</span>
      </div>)}</div>
      : <div className="owner-live-empty">Belum ada aktivitas akun yang tercatat. Pengguna login akan muncul di sini.</div>}
    <footer>Realtime via Supabase · status offline setelah koneksi hilang lebih dari 90 detik</footer>
  </section>;
}
