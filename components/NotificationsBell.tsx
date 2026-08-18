"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  post_id: string | null;
  room_id: string | null;
  connection_id: string | null;
  is_read: boolean;
  created_at: string;
};

type Application = {
  id: string;
  post_id: string;
  applicant_id: string;
  status: string;
};

type Post = {
  id: string;
  author_id: string;
  title: string;
  category: string;
};

export default function NotificationsBell() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadNotifications(currentUser: any) {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("id,type,title,message,post_id,room_id,connection_id,is_read,created_at")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error) setNotifications((data || []) as Notification[]);
  }

  useEffect(() => {
    let channel: any = null;

    (async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (!currentUser) return;

      await loadNotifications(currentUser);

      channel = supabase
        .channel(`notifications-${currentUser.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUser.id}`,
          },
          (payload) => {
            const item = payload.new as Notification;
            setNotifications((current) => {
              if (current.some((n) => n.id === item.id)) return current;
              return [item, ...current].slice(0, 30);
            });
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function markRead(notification: Notification) {
    if (notification.is_read) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
    setNotifications((current) => current.map((item) =>
      item.id === notification.id ? { ...item, is_read: true } : item
    ));
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  async function createRoomFromApplication(applicationId: string) {
    if (!user) return null;

    const { data: application, error: appError } = await supabase
      .from("post_applications")
      .select("id,post_id,applicant_id,status")
      .eq("id", applicationId)
      .single();

    if (appError || !application) throw new Error(appError?.message || "Help request not found.");
    const app = application as Application;

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id,author_id,title,category")
      .eq("id", app.post_id)
      .single();

    if (postError || !post) throw new Error(postError?.message || "Problem not found.");
    const problem = post as Post;

    if (problem.author_id !== user.id) throw new Error("Only the problem owner can accept this request.");
    if (app.status !== "PENDING") {
      const { data: existing } = await supabase
        .from("rooms")
        .select("id")
        .eq("post_id", app.post_id)
        .eq("status", "ACTIVE")
        .maybeSingle();
      return existing?.id || null;
    }

    const { error: updateError } = await supabase
      .from("post_applications")
      .update({ status: "ACCEPTED", responded_at: new Date().toISOString() })
      .eq("id", app.id)
      .eq("status", "PENDING");

    if (updateError) throw new Error(updateError.message);

    const { data: existingRoom } = await supabase
      .from("rooms")
      .select("id")
      .eq("post_id", app.post_id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    let roomId = existingRoom?.id || null;

    if (!roomId) {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({
          post_id: problem.id,
          problem_owner_id: problem.author_id,
          solver_id: app.applicant_id,
          title: problem.title,
          category: problem.category,
          status: "ACTIVE",
        })
        .select("id")
        .single();

      if (roomError || !room) {
        const { data: retryRoom } = await supabase
          .from("rooms")
          .select("id")
          .eq("post_id", app.post_id)
          .eq("status", "ACTIVE")
          .maybeSingle();
        if (!retryRoom) throw new Error(roomError?.message || "Could not create Solve Room.");
        roomId = retryRoom.id;
      } else {
        roomId = room.id;
      }

      const { error: membersError } = await supabase.from("room_members").insert([
        { room_id: roomId, user_id: problem.author_id, role: "OWNER" },
        { room_id: roomId, user_id: app.applicant_id, role: "SOLVER" },
      ]);

      if (membersError && !membersError.message.toLowerCase().includes("duplicate")) {
        throw new Error(membersError.message);
      }
    }

    await supabase.from("posts").update({ status: "IN_PROGRESS" }).eq("id", problem.id).eq("author_id", user.id);

    await supabase
      .from("post_applications")
      .update({ status: "REJECTED", responded_at: new Date().toISOString() })
      .eq("post_id", problem.id)
      .eq("status", "PENDING")
      .neq("id", app.id);

    return roomId;
  }

  async function acceptHelp(notification: Notification) {
    if (!notification.connection_id || busyId) return;
    setBusyId(notification.id);
    try {
      await markRead(notification);
      const roomId = await createRoomFromApplication(notification.connection_id);
      if (!roomId) throw new Error("Solve Room could not be opened.");
      setOpen(false);
      router.push(`/room/${roomId}`);
    } catch (error: any) {
      alert(error?.message || "Could not accept the help request.");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectHelp(notification: Notification) {
    if (!notification.connection_id || busyId || !user) return;
    setBusyId(notification.id);
    try {
      const { error } = await supabase
        .from("post_applications")
        .update({ status: "REJECTED", responded_at: new Date().toISOString() })
        .eq("id", notification.connection_id)
        .eq("status", "PENDING");

      if (error) throw new Error(error.message);
      await markRead(notification);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch (error: any) {
      alert(error?.message || "Could not decline the request.");
    } finally {
      setBusyId(null);
    }
  }

  async function openNotification(notification: Notification) {
    if (notification.type === "HELP_REQUEST" && notification.connection_id) {
      await markRead(notification);
      return;
    }

    await markRead(notification);
    setOpen(false);

    if (notification.room_id) {
      router.push(`/room/${notification.room_id}`);
    } else if (notification.post_id) {
      router.push(`/post/${notification.post_id}`);
    }
  }

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  if (!user) return null;

  return (
    <div className="notification-wrap">
      <button className="icon-btn" onClick={() => setOpen((value) => !value)} aria-label="Notifications">
        <span>🔔</span>
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-head">
            <div><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread` : "All caught up"}</span></div>
            {unreadCount > 0 && <button className="link-btn" onClick={markAllRead}>Mark all read</button>}
          </div>

          {notifications.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🔔</div><strong>No notifications</strong><p>You&apos;re all caught up.</p></div>
          ) : notifications.map((notification) => {
            const isHelp = notification.type === "HELP_REQUEST" && !!notification.connection_id;
            const busy = busyId === notification.id;
            return (
              <div key={notification.id} className={`notification-item ${notification.is_read ? "read" : "unread"}`}>
                <button className="notification-main" onClick={() => openNotification(notification)}>
                  <div className="notification-icon">{isHelp ? "🤝" : notification.type === "PROBLEM_SOLVED" ? "✓" : "💬"}</div>
                  <div className="notification-copy">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <time>{new Date(notification.created_at).toLocaleString()}</time>
                  </div>
                </button>
                {isHelp && (
                  <div className="notification-actions">
                    <button className="btn btn-sm" disabled={busy} onClick={() => acceptHelp(notification)}>{busy ? "Opening…" : "Accept & Solve"}</button>
                    <button className="btn secondary btn-sm" disabled={busy} onClick={() => rejectHelp(notification)}>Not now</button>
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
