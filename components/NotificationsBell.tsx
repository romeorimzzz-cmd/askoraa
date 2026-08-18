"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function NotificationsBell() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] =
    useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  async function loadNotifications(
    currentUser: any
  ) {
    if (!currentUser) return;

    const { data } = await supabase
      .from("notifications")
      .select(`
        id,
        type,
        title,
        message,
        post_id,
        room_id,
        connection_id,
        is_read,
        created_at
      `)
      .eq("user_id", currentUser.id)
      .order("created_at", {
        ascending: false
      })
      .limit(20);

    setNotifications(
      (data as Notification[]) || []
    );
  }

  useEffect(() => {
    let channel: any = null;

    async function init() {
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (!currentUser) return;

      await loadNotifications(currentUser);

      channel = supabase
        .channel(
          `notifications-${currentUser.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUser.id}`
          },
          (payload) => {
            const newNotification =
              payload.new as Notification;

            setNotifications((current) => [
              newNotification,
              ...current
            ]);
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function markRead(
    notification: Notification
  ) {
    if (!notification.is_read) {
      await supabase
        .from("notifications")
        .update({
          is_read: true
        })
        .eq("id", notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true
              }
            : item
        )
      );
    }
  }

  async function openNotification(
    notification: Notification
  ) {
    await markRead(notification);

    setOpen(false);

    if (notification.room_id) {
      window.location.href =
        `/room/${notification.room_id}`;
      return;
    }

    if (notification.post_id) {
      window.location.href =
        `/post/${notification.post_id}`;
    }
  }

  async function markAllRead() {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({
        is_read: true
      })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        is_read: true
      }))
    );
  }

  if (!user) {
    return null;
  }

  const unreadCount =
    notifications.filter(
      (item) => !item.is_read
    ).length;

  return (
    <div
      style={{
        position: "relative"
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        style={{
          position: "relative",
          width: 40,
          height: 40,
          border: "1px solid #e5e9f2",
          borderRadius: 11,
          background: "#ffffff",
          color: "#344054",
          fontSize: 18
        }}
      >
        🔔

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: "0 4px",
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "#dc4c64",
              color: "#ffffff",
              fontSize: 9,
              fontWeight: 900,
              border:
                "2px solid white"
            }}
          >
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 0,
            width: "min(360px, 92vw)",
            maxHeight: 500,
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #e5e9f2",
            borderRadius: 16,
            boxShadow:
              "0 18px 45px rgba(30,40,70,0.16)",
            zIndex: 100
          }}
        >
          <div
            style={{
              padding: "14px 15px",
              borderBottom:
                "1px solid #eef0f4",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center"
            }}
          >
            <strong>
              Notifications
            </strong>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#5b5ce2",
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div
              style={{
                padding: 30,
                textAlign: "center"
              }}
            >
              <div
                style={{
                  fontSize: 25,
                  marginBottom: 8
                }}
              >
                🔔
              </div>

              <strong>
                No notifications
              </strong>

              <p
                className="muted"
                style={{
                  fontSize: 12,
                  marginBottom: 0
                }}
              >
                You're all caught up.
              </p>
            </div>
          ) : (
            notifications.map(
              (notification) => (
                <button
                  key={notification.id}
                  onClick={() =>
                    openNotification(
                      notification
                    )
                  }
                  style={{
                    width: "100%",
                    padding: 14,
                    border: 0,
                    borderBottom:
                      "1px solid #f0f2f5",
                    background:
                      notification.is_read
                        ? "#ffffff"
                        : "#f4f4ff",
                    textAlign: "left"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 10,
                        background:
                          notification.type ===
                          "HELP_REQUEST"
                            ? "#e8faf7"
                            : "#eeeeff"
                      }}
                    >
                      {notification.type ===
                      "HELP_REQUEST"
                        ? "🤝"
                        : "💬"}
                    </div>

                    <div
                      style={{
                        minWidth: 0
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          fontSize: 13,
                          color: "#172033"
                        }}
                      >
                        {notification.title}
                      </strong>

                      <div
                        style={{
                          marginTop: 3,
                          color: "#667085",
                          fontSize: 12,
                          lineHeight: 1.45
                        }}
                      >
                        {notification.message}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color: "#98a2b3",
                          fontSize: 10
                        }}
                      >
                        {new Date(
                          notification.created_at
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </button>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}