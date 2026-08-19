"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Post = { id:string; title:string; body:string; category:string; created_at:string; author_id:string; profiles?:{display_name:string|null;avatar_url?:string|null}[]|null };

export default function Home(){
  const [posts,setPosts]=useState<Post[]>([]); const [user,setUser]=useState<any>(null); const [loading,setLoading]=useState(true); const [msg,setMsg]=useState(""); const [busy,setBusy]=useState<string|null>(null);
  async function load(){
    setLoading(true);
    const {data:{user:currentUser}}=await supabase.auth.getUser(); setUser(currentUser);
    const {data,error}=await supabase.from("posts").select("id,title,body,category,created_at,author_id,profiles:author_id(display_name,avatar_url)").eq("status","OPEN").eq("kind","ASK").order("created_at",{ascending:false}).limit(60);
    if(error)setMsg(error.message); else setPosts((data||[]) as unknown as Post[]); setLoading(false);
  }
  useEffect(()=>{load(); const ch=supabase.channel("public-post-feed").on("postgres_changes",{event:"*",schema:"public",table:"posts"},()=>load()).subscribe(); return()=>{supabase.removeChannel(ch)}},[]);
  async function help(post:Post){
    if(!user){window.location.href="/login?next=/home";return;} if(post.author_id===user.id)return;
    setBusy(post.id); setMsg("");
    const {error}=await supabase.from("post_applications").insert({post_id:post.id,applicant_id:user.id});
    if(error)setMsg(error.code==="23505"?"You already offered help on this problem.":error.message); else setMsg("I CAN HELP sent. The problem owner has been notified.");
    setBusy(null);
  }
  return <main className="container home-page">
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow">ASKORAA • HUMAN PROBLEM SOLVING</span><h1>One real problem.<br/><em>One useful conversation.</em></h1><p>Ask something you genuinely need help with, or use what you know to help someone else. No endless feed. Just useful people and useful outcomes.</p><div className="hero-actions"><Link href="/create" className="btn btn-large">+ Post Your Problem</Link><a href="/solve" className="btn secondary btn-large">Solve Someone&apos;s Problem</a></div></div>
      <div className="hero-orbit"><div className="orbit-card orbit-main"><span>✦</span><strong>ASK</strong><small>your real problem</small></div><div className="orbit-card orbit-help"><span>🤝</span><strong>HELP</strong><small>with what you know</small></div><div className="orbit-card orbit-solve"><span>✓</span><strong>SOLVE</strong><small>together, privately</small></div></div>
    </section>
    {msg&&<div className="toast-note">{msg}</div>}
    <section className="action-grid">
      <Link href="/create" className="action-card action-primary"><span className="action-icon">+</span><div><b>Post Your Problem</b><p>Tell people what you are trying to figure out.</p></div><span>→</span></Link>
      <a href="/solve" className="action-card"><span className="action-icon green">🤝</span><div><b>Solve Someone&apos;s Problem</b><p>Find an open problem where you can genuinely help.</p></div><span>→</span></a>
      <Link href="/archive" className="action-card"><span className="action-icon gold">▣</span><div><b>Learn From Solved Problems</b><p>Browse useful solutions preserved in the public archive.</p></div><span>→</span></Link>
    </section>
    <section id="problems" className="feed-section"><div className="feed-heading"><div><span className="eyebrow">OPEN PROBLEMS</span><h2>People are looking for help</h2></div><span className="small muted">Public • newest first</span></div>
      {loading?<div className="card loading-card">Finding open problems…</div>:posts.length===0?<div className="empty-large card"><div className="empty-icon">💡</div><h3>No open problems yet</h3><p>Be the first person to start a useful conversation.</p><Link href="/create" className="btn">Post a Problem</Link></div>:<div className="problem-list">{posts.map(post=>{const mine=user?.id===post.author_id; return <article className="problem-card" key={post.id}><div className="problem-top"><span className="category-chip">{post.category}</span><span className="status-dot"><i/> OPEN</span></div><Link href={`/post/${post.id}`} className="problem-title">{post.title}</Link><p>{post.body.length>280?post.body.slice(0,280)+"…":post.body}</p><div className="problem-bottom"><span className="author-line"><span className="mini-avatar hex-avatar">{post.profiles?.[0]?.avatar_url?<img src={post.profiles[0].avatar_url} alt=""/>:(post.profiles?.[0]?.display_name||"A").charAt(0).toUpperCase()}</span> {post.profiles?.[0]?.display_name||"ASKORAA User"} <span>•</span> {new Date(post.created_at).toLocaleDateString()}</span>{mine?<span className="own-badge">YOUR PROBLEM</span>:<button className="btn btn-sm" disabled={busy===post.id} onClick={()=>help(post)}>{busy===post.id?"Sending…":"I CAN HELP"}</button>}</div></article>})}</div>}
    </section>
    <section className="trust-band"><div><span className="eyebrow">HOW ASKORAA WORKS</span><h2>Useful help, with a clear path.</h2></div><div className="trust-steps"><span><b>01</b> Post a problem</span><span><b>02</b> Someone offers help</span><span><b>03</b> Private Solve Room</span><span><b>04</b> YES / NO + archive</span></div></section>
  </main>;
}
