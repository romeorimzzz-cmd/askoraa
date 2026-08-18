"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import NotificationsBell from "./NotificationsBell";

export default function AuthNav() {
  const [user, setUser] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function refreshOnlineCount() {
    const cutoff = new Date(
      Date.now() - 90 * 1000
    ).toISOString();

    const { count } = await supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("is_online", true)
      .gte("last_seen", cutoff);

    setOnlineCount(count || 0);
  }

  async function setOnlineStatus(currentUser: any) {
    if (!currentUser) return;

    await supabase
      .from("profiles")
      .update({
        is_online: true,
        last_seen: new Date().toISOString()
      })
      .eq("id", currentUser.id);
  }

  async function setOfflineStatus(currentUser: any) {
    if (!currentUser) return;

    await supabase
      .from("profiles")
      .update({
        is_online: false,
        last_seen: new Date().toISOString()
      })
      .eq("id", currentUser.id);
  }

  useEffect(() => {
    let heartbeat:
      | ReturnType<typeof setInterval>
      | null = null;

    async function init() {
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();

      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        await setOnlineStatus(currentUser);
      }

      await refreshOnlineCount();

      if (currentUser) {
        heartbeat = setInterval(async () => {
          await setOnlineStatus(currentUser);
          await refreshOnlineCount();
        }, 30000);
      }
    }

    init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser =
          session?.user || null;

        setUser(nextUser);

        if (nextUser) {
          await setOnlineStatus(nextUser);
        }

        await refreshOnlineCount();
      }
    );

    const handleVisibility = async () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        const {
          data: { user: currentUser }
        } = await supabase.auth.getUser();

        if (currentUser) {
          await setOnlineStatus(
            currentUser
          );
        }

        await refreshOnlineCount();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      subscription.unsubscribe();

      if (heartbeat) {
        clearInterval(heartbeat);
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  async function logout() {
    if (user) {
      await setOfflineStatus(user);
    }

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="navlinks">
        <Link href="/home">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="navlinks">

      <Link href="/home">
        Home
      </Link>

      {user ? (
        <>
          <Link href="/create">
            Ask
          </Link>

          <Link href="/my">
            My
          </Link>

          <Link href="/profile">
            Profile
          </Link>

          <NotificationsBell />

          <span className="online-counter">
            <span className="online-dot">
              ●
            </span>{" "}
            {onlineCount} online
          </span>

          <button
            className="btn secondary"
            onClick={logout}
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link href="/login">
            Login
          </Link>

          <Link
            href="/register"
            className="btn secondary"
          >
            Register
          </Link>
        </>
      )}

    </div>
  );
}