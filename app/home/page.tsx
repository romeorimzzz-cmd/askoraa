"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Post = {
  id: string;
  title: string;
  body: string;
  kind: "ASK" | "HELP";
  category: string;
  created_at: string;
  author_id: string;
  profiles?: { display_name: string | null }[] | null;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,body,kind,category,created_at,author_id,profiles:author_id(display_name)")
      .eq("status", "OPEN")
      .eq("kind", "ASK")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setMsg(error.message);
    else setPosts((data || []) as unknown as Post[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function help(post: Post) {
    if (!user) { window.location.href = "/login"; return; }
    if (post.author_id === user.id) return;

    setBusy(post.id);
    setMsg("");
    const { error } = await supabase
      .from("post_applications")
      .insert({ post_id: post.id, applicant_id: user.id });

    if (error) {
      setMsg(error.code === "23505" ? "You already offered help on this problem." : error.message);
    } else {
      setMsg("I CAN HELP sent. The problem owner has been notified.");
    }
    setBusy(null);
  }

  return (
    <main className="container">
      <section className="home-hero">
        <div>
          <span className="eyebrow">ASKORAA • HUMAN PROBLEM SOLVING</span>
          <h1>One problem. One useful conversation.</h1>
          <p>Post something you genuinely need help with, or find a problem where your experience can make a difference.</p>
        </div>
        <div className="hero-actions">
          <Link href="/create" className="btn">+ Post Your Problem</Link>
          <a href="#problems" className="btn secondary">Solve Someone&apos;s Problem</a>
        </div>
      </section>

      {msg && <div className="success">{msg}</div>}

      <section className="action-grid">
        <Link href="/create" className="action-card action-primary"><span>✦</span><div><strong>My problem is…</strong><p>Tell the community what you are trying to solve.</p></div></Link>
        <a href="#problems" className="action-card"><span>🤝</span><div><strong>I can help someone</strong><p>Browse real problems and offer useful help.</p></div></a>
        <Link href="/archive" className="action-card"><span>📚</span><div><strong>Learn from solved problems</strong><p>Read previous solutions in the ASKORAA archive.</p></div></Link>
      </section>

      <div id="problems" className="section-heading"><div><span className="eyebrow">SOLVE SOMEONE&apos;S PROBLEM</span><h2>Open problems</h2></div><span className="small muted">Your own posts never show an I CAN HELP button.</span></div>

      {loading ? <div className="card loading-card">Loading problems…</div> : posts.length === 0 ? <div className="card empty-large"><div className="empty-icon">💡</div><h3>No open problems yet</h3><p>Be the first person to post a real problem.</p><Link href="/create" className="btn">Post a Problem</Link></div> : (
        <div className="problem-list">
          {posts.map((post) => {
            const mine = user?.id === post.author_id;
            return (
              <article className="problem-card" key={post.id}>
                <div className="problem-top"><span className="badge">{post.category}</span><span className="small muted">{new Date(post.created_at).toLocaleString()}</span></div>
                <Link href={`/post/${post.id}`} className="problem-title">{post.title}</Link>
                <p>{post.body.length > 300 ? `${post.body.slice(0, 300)}…` : post.body}</p>
                <div className="problem-bottom"><span className="small">Asked by <strong>{post.profiles?.[0]?.display_name || "ASKORAA user"}</strong></span>{mine ? <span className="own-badge">YOUR PROBLEM</span> : <button className="btn btn-sm" disabled={busy === post.id} onClick={() => help(post)}>{busy === post.id ? "Sending…" : "I CAN HELP"}</button>}</div>
              </article>
            );
          })}
        </div>
      )}

      <section className="safety-card">
        <div><span className="eyebrow">STAY SAFE</span><h2>Good help should never require unsafe access.</h2><p>Never share OTPs, passwords, UPI PINs, card details or remote-access codes. Keep sensitive personal information out of public posts.</p></div>
        <div className="safety-points"><span>✓ Respectful conversation</span><span>✓ No financial-pressure requests</span><span>✓ Report suspicious behaviour</span></div>
      </section>
    </main>
  );
}
