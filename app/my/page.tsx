"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function My(){
  const [rooms,setRooms]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/login";return;}
    const {data:r}=await supabase.from("rooms").select("id,title,status,category,created_at,problem_owner_id,solver_id").or(`problem_owner_id.eq.${user.id},solver_id.eq.${user.id}`).order("created_at",{ascending:false});
    const {data:p}=await supabase.from("posts").select("id,title,status,kind,category,created_at").eq("author_id",user.id).order("created_at",{ascending:false});
    setRooms(r||[]);setPosts(p||[]);setLoading(false);
  })()},[]);

  const active=rooms.filter(r=>r.status==="ACTIVE");
  const closed=rooms.filter(r=>r.status!=="ACTIVE");

  if(loading)return <main className="container"><div className="card loading-card">Loading your ASKORAA…</div></main>;
  return <main className="container">
    <section className="page-heading"><span className="eyebrow">YOUR ACTIVITY</span><h1>My ASKORAA</h1><p className="muted">Your problems, active Solve Rooms and completed conversations.</p></section>
    <div className="my-actions"><Link href="/create" className="btn">+ Post a Problem</Link><Link href="/archive" className="btn secondary">Open Solved Archive</Link></div>
    <div className="grid2">
      <section className="card panel-card"><div className="section-heading compact"><div><h2>My Problems</h2><span className="small muted">{posts.length} total</span></div></div>{posts.length===0?<p className="muted">You haven&apos;t posted a problem yet.</p>:posts.map(p=><Link className="list-row" key={p.id} href={`/post/${p.id}`}><div><strong>{p.title}</strong><span>{p.category} • {p.status}</span></div><span>→</span></Link>)}</section>
      <section className="card panel-card"><div className="section-heading compact"><div><h2>My Solve Rooms</h2><span className="small muted">{active.length} active</span></div></div>{rooms.length===0?<p className="muted">No Solve Rooms yet.</p>:<>{active.length>0&&<div className="mini-label">ACTIVE</div>}{active.map(r=><Link className="list-row active-row" key={r.id} href={`/room/${r.id}`}><div><strong>{r.title}</strong><span>{r.category} • Private Solve Room</span></div><span>Open →</span></Link>)}{closed.length>0&&<><div className="mini-label">COMPLETED / CLOSED</div>{closed.map(r=><Link className="list-row" key={r.id} href={`/room/${r.id}`}><div><strong>{r.title}</strong><span>{r.category} • {r.status} • {new Date(r.created_at).toLocaleDateString()}</span></div><span>→</span></Link>)}</>}</>}</section>
    </div>
    <section className="safety-card"><div><span className="eyebrow">COMMUNITY SAFETY</span><h2>Keep every Solve Room useful and safe.</h2><p>Don&apos;t share passwords, OTPs, PINs, banking credentials, remote-access codes or private documents. Report abuse and leave a conversation that becomes unsafe.</p></div></section>
  </main>;
}
