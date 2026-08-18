"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import NotificationsBell from "./NotificationsBell";
import PresenceCounter from "./PresenceCounter";

export default function AuthNav() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <div className="desktop-nav">
        <Link href="/home">Problems</Link>
        <Link href="/solve">Solve</Link>
        {user && <Link href="/my">My ASKORAA</Link>}
        <PresenceCounter />
        {user ? <NotificationsBell /> : null}
        {user ? <Link href="/profile" className="nav-profile">Profile</Link> : <Link href="/login" className="nav-login">Login</Link>}
        {!user && <Link href="/register" className="btn btn-sm">Join free</Link>}
      </div>
      <button className="mobile-menu-btn" onClick={() => setOpen(v => !v)} aria-label="Open menu">☰</button>
      {open && <div className="mobile-menu">
        <Link href="/home" onClick={() => setOpen(false)}>Problems</Link>
        <Link href="/solve" onClick={() => setOpen(false)}>Solve Problems</Link><Link href="/archive" onClick={() => setOpen(false)}>Solved Archive</Link>
        <Link href="/create" onClick={() => setOpen(false)}>Post a Problem</Link>
        {user && <Link href="/my" onClick={() => setOpen(false)}>My ASKORAA</Link>}
        <Link href="/safety" onClick={() => setOpen(false)}>Safety & Rules</Link>
        <Link href="/support" onClick={() => setOpen(false)}>Support</Link>
        {user ? <Link href="/profile" onClick={() => setOpen(false)}>Profile</Link> : <Link href="/login" onClick={() => setOpen(false)}>Login</Link>}
      </div>}
    </>
  );
}
