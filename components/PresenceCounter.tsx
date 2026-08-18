"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function PresenceCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let active = true;

    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date().toISOString();
      await supabase.from("presence_sessions").upsert({ user_id: user.id, last_seen: now }, { onConflict: "user_id" });
      const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { count: online } = await supabase.from("presence_sessions").select("user_id", { count: "exact", head: true }).gte("last_seen", since);
      if (active) setCount(online ?? 0);
    };

    run();
    timer = setInterval(run, 45000);
    return () => { active = false; if (timer) clearInterval(timer); };
  }, []);

  if (count === null) return null;
  return <span className="online-counter"><i className="online-dot" />{count} online</span>;
}
