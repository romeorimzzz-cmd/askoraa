"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Post = { id:string; author_id:string; kind:"ASK"|"HELP"; title:string; body:string; category:string; status:string; created_at:string; profiles?:{display_name:string|null}[]|null };
type App = { id:string; applicant_id:string; status:string; created_at:string; profiles?:{display_name:string|null}[]|null };

type Room = { id:string; post_id:string; problem_owner_id:string; solver_id:string; status:string };

export default function PostDetail(){
  const { id }=useParams<{id:string}>();
  const router=useRouter();
  const [post,setPost]=useState<Post|null>(null);
  const [apps,setApps]=useState<App[]>([]);
  const [user,setUser]=useState<any>(null);
  const [room,setRoom]=useState<Room|null>(null);
  const [busy,setBusy]=useState<string|null>(null);
  const [msg,setMsg]=useState("");

  async function load(){
    const {data:{user:currentUser}}=await supabase.auth.getUser();
    setUser(currentUser);
    const {data,error}=await supabase.from("posts").select("id,author_id,kind,title,body,category,status,created_at,profiles:author_id(display_name)").eq("id",id).single();
    if(error||!data){setMsg(error?.message||"Problem not found.");return;}
    setPost(data as unknown as Post);

    const {data:a}=await supabase.from("post_applications").select("id,applicant_id,status,created_at,profiles:applicant_id(display_name)").eq("post_id",id).order("created_at",{ascending:false});
    setApps((a||[]) as unknown as App[]);

    const {data:r}=await supabase.from("rooms").select("id,post_id,problem_owner_id,solver_id,status").eq("post_id",id).eq("status","ACTIVE").maybeSingle();
    setRoom(r as Room|null);
  }

  useEffect(()=>{load();},[id]);

  async function selectSolver(app:App){
    if(!post||!user||user.id!==post.author_id)return;
    setBusy(app.id);setMsg("");
    const {error:updateError}=await supabase.from("post_applications").update({status:"ACCEPTED",responded_at:new Date().toISOString()}).eq("id",app.id).eq("status","PENDING");
    if(updateError){setMsg(updateError.message);setBusy(null);return;}

    const {data:existing}=await supabase.from("rooms").select("id").eq("post_id",post.id).eq("status","ACTIVE").maybeSingle();
    let roomId=existing?.id as string|undefined;
    if(!roomId){
      const {data:r,error}=await supabase.from("rooms").insert({post_id:post.id,problem_owner_id:post.author_id,solver_id:app.applicant_id,title:post.title,category:post.category,status:"ACTIVE"}).select("id").single();
      if(error||!r){setMsg(error?.message||"Could not create Solve Room.");setBusy(null);return;}
      roomId=r.id;
      const {error:memberError}=await supabase.from("room_members").insert([{room_id:roomId,user_id:post.author_id,role:"OWNER"},{room_id:roomId,user_id:app.applicant_id,role:"SOLVER"}]);
      if(memberError&&!memberError.message.toLowerCase().includes("duplicate")){setMsg(memberError.message);setBusy(null);return;}
    }
    await supabase.from("posts").update({status:"IN_PROGRESS"}).eq("id",post.id);
    await supabase.from("post_applications").update({status:"REJECTED",responded_at:new Date().toISOString()}).eq("post_id",post.id).eq("status","PENDING").neq("id",app.id);
    router.push(`/room/${roomId}`);
  }

  async function reject(app:App){
    if(!post||!user||user.id!==post.author_id)return;
    setBusy(app.id);
    const {error}=await supabase.from("post_applications").update({status:"REJECTED",responded_at:new Date().toISOString()}).eq("id",app.id).eq("status","PENDING");
    if(error)setMsg(error.message);else await load();
    setBusy(null);
  }

  if(!post)return <main className="container"><div className="card loading-card">{msg||"Loading problem…"}</div></main>;
  const owner=user?.id===post.author_id;

  return <main className="container"><div className="detail-wrap">
    <Link href="/home" className="small muted">← Back to problems</Link>
    <article className="card detail-card">
      <div className="problem-top"><span className="badge">{post.category} • {post.kind}</span><span className="small muted">{new Date(post.created_at).toLocaleString()}</span></div>
      <h1>{post.title}</h1>
      <p className="detail-body">{post.body}</p>
      <div className="owner-strip"><span className="avatar">{(post.profiles?.[0]?.display_name||"A").charAt(0).toUpperCase()}</span><div><span className="small muted">PROBLEM OWNER</span><strong>{post.profiles?.[0]?.display_name||"ASKORAA User"}</strong></div></div>

      {room && <div className="success room-callout"><div><strong>Solve Room is active.</strong><p>Both participants can continue the private conversation there.</p></div><Link className="btn" href={`/room/${room.id}`}>Open Solve Room</Link></div>}

      {owner ? <section className="application-section"><div className="section-heading compact"><div><span className="eyebrow">YOUR PROBLEM</span><h2>People who offered help</h2></div><span className="small muted">Choose one primary solver.</span></div>
        {apps.length===0?<div className="empty-inline">No one has offered help yet.</div>:<div className="application-list">{apps.map(app=><div className="application-card" key={app.id}><div><strong>{app.profiles?.[0]?.display_name||"ASKORAA User"}</strong><p>Wants to help solve this problem.</p><span className={`status-pill ${app.status.toLowerCase()}`}>{app.status}</span></div>{app.status==="PENDING"&&!room&&<div className="row"><button className="btn btn-sm" disabled={busy===app.id} onClick={()=>selectSolver(app)}>{busy===app.id?"Opening…":"Accept & Solve"}</button><button className="btn secondary btn-sm" disabled={busy===app.id} onClick={()=>reject(app)}>Not now</button></div>}</div>)}</div>}
      </section> : !room && post.status==="OPEN" ? <section className="help-cta"><span className="eyebrow">CAN YOU HELP?</span><h2>Have something genuinely useful to contribute?</h2><p className="muted">Offer to help and, if the owner accepts, you&apos;ll enter a private Solve Room together.</p><button className="btn" onClick={async()=>{setBusy("help");const {error}=await supabase.from("post_applications").insert({post_id:post.id,applicant_id:user.id});if(error)setMsg(error.code==="23505"?"You already offered help on this problem.":error.message);else setMsg("I CAN HELP sent to the problem owner.");setBusy(null);await load();}} disabled={!user||busy==="help"}>{busy==="help"?"Sending…":"I CAN HELP"}</button></section> : null}
      {msg&&<div className="alert">{msg}</div>}
    </article>
  </div></main>;
}
