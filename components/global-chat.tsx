"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Radio } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type ChatMessage = {
  id: number;
  user_id: string;
  sender_name: string;
  sender_username: string | null;
  body: string;
  created_at: string;
};

export function GlobalChat() {
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let alive = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (alive) {
        setUserId(data.user?.id ?? null);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        setUserId(session?.user?.id ?? null);
        if (!session?.user) {
          setMessages([]);
          setOpen(false);
        }
      }
    });

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId) return;

    let alive = true;
    setLoading(true);
    setError("");

    void supabase
      .from("global_chat_messages")
      .select("id,user_id,sender_name,sender_username,body,created_at")
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data, error: fetchError }) => {
        if (!alive) return;
        if (fetchError) setError("Chat belum bisa dimuat. Coba buka ulang.");
        else setMessages(((data ?? []) as ChatMessage[]).reverse());
        setLoading(false);
      });

    const channel = supabase
      .channel("global-chat-live")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "global_chat_messages",
      }, (payload) => {
        const incoming = payload.new as ChatMessage;
        if (!alive) return;
        setMessages((current) => {
          if (current.some((message) => message.id === incoming.id)) return current;
          return [...current, incoming].slice(-60);
        });
      })
      .subscribe((status) => {
        if (alive) setConnected(status === "SUBSCRIBED");
      });

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > 500 || sending || !userId) return;

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    setSending(true);
    setError("");
    const { data, error: sendError } = await supabase
      .from("global_chat_messages")
      .insert({ user_id: userId, body })
      .select("id,user_id,sender_name,sender_username,body,created_at")
      .single();

    if (sendError) {
      setError(sendError.message.includes("Authentication")
        ? "Sesi login berakhir. Silakan login kembali."
        : sendError.message.includes("Please wait")
          ? "Tunggu 2 detik sebelum mengirim pesan lagi."
          : "Pesan gagal dikirim. Coba lagi sebentar.");
    } else if (data) {
      const sent = data as ChatMessage;
      setMessages((current) => current.some((message) => message.id === sent.id)
        ? current
        : [...current, sent].slice(-60));
      setDraft("");
    }
    setSending(false);
  }

  if (loading || !userId) return null;

  return (
    <div className="global-chat-root">
      {open && (
        <section className="global-chat-panel" aria-label="Global chat">
          <header className="global-chat-head">
            <div className="global-chat-title">
              <span className="global-chat-icon"><MessageCircle size={18}/></span>
              <div><strong>GLOBAL CHAT</strong><small><i className={connected ? "chat-status-on" : "chat-status-off"}/>{connected ? "LIVE ROOM" : "CONNECTING..."}</small></div>
            </div>
            <button className="global-chat-close" type="button" onClick={() => setOpen(false)} aria-label="Close chat"><X size={19}/></button>
          </header>
          <div className="global-chat-notice"><Radio size={13}/> Pesan terlihat oleh semua player yang login.</div>
          <div className="global-chat-messages" ref={listRef} aria-live="polite">
            {loading ? <div className="global-chat-empty">Loading messages...</div> : messages.length === 0 ? (
              <div className="global-chat-empty"><b>ROOM IS QUIET.</b><span>Jadi yang pertama memulai obrolan!</span></div>
            ) : messages.map((message) => (
              <article className={message.user_id === userId ? "global-chat-message mine" : "global-chat-message"} key={message.id}>
                <div className="global-chat-meta">
                  <strong>{message.sender_name || "Player"}{message.user_id === userId && <em>YOU</em>}</strong>
                  <time>{new Date(message.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
                <p>{message.body}</p>
              </article>
            ))}
          </div>
          {error && <p className="global-chat-error" role="alert">{error}</p>}
          <form className="global-chat-compose" onSubmit={sendMessage}>
            <input value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 500))} placeholder="Tulis pesan..." maxLength={500} aria-label="Write a message" />
            <span className="global-chat-count">{draft.length}/500</span>
            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message"><Send size={17}/></button>
          </form>
        </section>
      )}
      <button className={open ? "global-chat-launcher active" : "global-chat-launcher"} type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close global chat" : "Open global chat"}>
        {open ? <X size={22}/> : <><MessageCircle size={21}/><span>GLOBAL CHAT</span><i/></>}
      </button>
    </div>
  );
}
