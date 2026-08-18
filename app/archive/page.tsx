"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Archive = { id:string; room_id:string; post_id:string; title:string; body:string; category:string; owner_id:string; solver_id:string; outcome:"YES"|"NO"; solution:string; summary:string; solved_at:string; owner?:{display_name:string|null}; solver?:{display_name:string|null} };

export default function Archive(){
  const [items,setItems]=useState<Archive[]>([]);const [loading,setLoading]=useState(true);const [msg,setMsg]=useState("");
  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/login";return;}
    const {data,error}=await supabase.from("archive_records").select("*,owner:owner_id(display_name),solver:solver_id(display_name)").order("solved_at",{ascending:false});
    if(error)setMsg(error.message);else setItems((data||[]) as unknown as Archive[]);setLoading(false);
  })()},[]);

  const groups=items.reduce<Record<string,Archive[]>>((acc,item)=>{const key=new Date(item.solved_at).toLocaleDateString(undefined,{year:"numeric",month:"long"});(acc[key]??=[]).push(item);return acc;},{});

  return <main className="container"><section className="page-heading"><span className="eyebrow">KNOWLEDGE ARCHIVE</span><h1>Solved Problems</h1><p className="muted">Real conversations preserved by date, problem, helper and final outcome.</p></section>
    {msg&&<div className="alert">{msg}</div>}
    {loading?<div className="card loading-card">Loading archive…</div>:items.length===0?<div className="card empty-large"><div className="empty-icon">📚</div><h3>No solved discussions yet</h3><p>When a problem reaches a final YES/NO outcome, its discussion appears here.</p></div>:Object.entries(groups).map(([month,records])=><section className="archive-month" key={month}><div className="archive-month-title"><h2>{month}</h2><span>{records.length} discussion{records.length===1?"":"s"}</span></div>{records.map(item=><article className="archive-card" key={item.id}><div className="problem-top"><span className={`badge ${item.outcome==="YES"?"badge-success":"badge-neutral"}`}>{item.outcome==="YES"?"SOLVED":"UNRESOLVED"}</span><span className="small muted">{new Date(item.solved_at).toLocaleString()}</span></div><Link href={`/post/${item.post_id}`} className="problem-title">{item.title}</Link><p className="archive-summary">{item.summary||item.solution||item.body}</p><div className="archive-meta"><span><b>Category:</b> {item.category}</span><span><b>Helped by:</b> {item.solver?.display_name||"ASKORAA User"}</span><span><b>Owner:</b> {item.owner?.display_name||"ASKORAA User"}</span></div><div className="archive-solution"><span className="eyebrow">FINAL SOLUTION</span><p>{item.solution||"No final solution text was recorded."}</p></div><Link href={`/room/${item.room_id}`} className="small archive-link">Open conversation →</Link></article>)}</section>)}
  </main>;
}
