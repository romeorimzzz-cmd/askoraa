"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type N = {
  id: string;
  type: string;
  title: string;
  message: string;
  post_id: string | null;
  room_id: string | null;
  connection_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: { display_name: string | null; avatar_url?: string | null }[] | null;
};

export default function NotificationsBell() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load(u: any) {
    const { data, error } = await supabase
      .from("notifications")
      .select(`
        id,type,title,message,post_id,room_id,connection_id,is_read,created_at,
        actor:actor_id(display_name,avatar_url)
      `)
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error) setItems((data || []) as unknown as N[]);
  }

  useEffect(() => {
    let ch: any;
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (!u) return;
      await load(u);

      ch = supabase
        .channel(`notif-${u.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${u.id}` },
          async (p) => {
            const incoming = p.new as N;
            // Fetch the actor name once for a richer notification without
            // blocking the realtime insert.
            let actor: N["actor"] = null;
            if (incoming.actor_id) {
              const { data } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", (incoming as any).actor_id).maybeSingle();
              if (data) actor = [data];
            }
            setItems(x => [{ ...incoming, actor }, ...x.filter(n => n.id !== incoming.id)].slice(0, 30));
          }
        )
        .subscribe();
    })();

    return () => { if (ch) supabase.removeChannel(ch); };
  }, []);

  async function read(n: N) {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setItems(x => x.map(i => i.id === n.id ? { ...i, is_read: true } : i));
    }
  }

  async function accept(n: N) {
    if (!user || !n.connection_id || busy) return;
    setBusy(n.id);
    try {
      const { data, error } = await supabase.rpc("accept_help_request", { p_application_id: n.connection_id });
      if (error) throw new Error(error.message);
      if (!data?.room_id) throw new Error("Solve Room could not be created.");
      await read(n);
      setOpen(false);
      router.push(`/room/${data.room_id}`);
    } catch (e: any) {
      alert(e?.message || "Could not accept help request.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(n: N) {
    if (!n.connection_id || busy) return;
    setBusy(n.id);
    const { error } = await supabase
      .from("post_applications")
      .update({ status: "REJECTED", responded_at: new Date().toISOString() })
      .eq("id", n.connection_id)
      .eq("status", "PENDING");
    if (error) alert(error.message);
    else {
      await read(n);
      setItems(x => x.filter(i => i.id !== n.id));
    }
    setBusy(null);
  }

  async function click(n: N) {
    await read(n);
    // A help request first takes the owner to the problem/application screen,
    // where the requester is visible and can be accepted.
    if (n.type === "HELP_REQUEST" && n.post_id) {
      setOpen(false);
      router.push(`/post/${n.post_id}`);
      return;
    }
    setOpen(false);
    if (n.room_id) router.push(`/room/${n.room_id}`);
    else if (n.post_id) router.push(`/post/${n.post_id}`);
  }

  const unread = useMemo(() => items.filter(i => !i.is_read).length, [items]);

  if (!user) return null;

  return (
    <div className="notification-wrap">
      <button className="icon-btn" onClick={() => setOpen(v => !v)} aria-label="Notifications">
        <span className="bell-glyph">🔔</span>
        {unread > 0 && <span className="notification-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-head">
            <div><strong>Notifications</strong><span>{unread ? `${unread} unread` : "All caught up"}</span></div>
            {unread > 0 && <button className="link-btn" onClick={async () => {
              await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
              setItems(x => x.map(i => ({ ...i, is_read: true })));
            }}>Mark all read</button>}
          </div>

          {items.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🔔</div><strong>No notifications</strong><p>New help requests and room events will appear here.</p></div>
          ) : items.map(n => {
            const help = n.type === "HELP_REQUEST" && !!n.connection_id;
            const b = busy === n.id;
            const actorName = n.actor?.[0]?.display_name || "Someone";
            return (
              <div className={`notification-item ${n.is_read ? "read" : "unread"}`} key={n.id}>
                <button className="notification-main" onClick={() => click(n)}>
                  <div className="notification-icon">{help ? "🤝" : n.type === "PROBLEM_SOLVED" ? "✓" : "💬"}</div>
                  <div className="notification-copy">
                    <strong>{help ? `${actorName} wants to help you` : n.title}</strong>
                    <p>{n.message}</p>
                    <time>{new Date(n.created_at).toLocaleString()}</time>
                  </div>
                </button>
                {help && (
                  <div className="notification-actions">
                    <button className="btn btn-sm" disabled={b} onClick={(e) => { e.stopPropagation(); accept(n); }}>{b ? "Opening…" : "Accept & Solve"}</button>
                    <button className="btn secondary btn-sm" disabled={b} onClick={(e) => { e.stopPropagation(); reject(n); }}>Not now</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
