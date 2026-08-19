"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Msg = { id:string; room_id:string; sender_id:string; body:string; created_at:string };
type Room = { id:string; post_id:string; problem_owner_id:string; solver_id:string; title:string; category:string; status:string; created_at:string; closed_at:string|null };
type Member = { user_id:string; role:"OWNER"|"SOLVER"; profiles?:{display_name:string|null;avatar_url?:string|null}[]|null };
type Sol = { id:string; room_id:string; solver_id:string; body:string; created_at:string; updated_at:string };

export default function Room(){
  const {id}=useParams<{id:string}>();
  const router=useRouter();
  const endRef=useRef<HTMLDivElement>(null);
  const [user,setUser]=useState<any>(null);
  const [room,setRoom]=useState<Room|null>(null);
  const [members,setMembers]=useState<Member[]>([]);
  const [messages,setMessages]=useState<Msg[]>([]);
  const [solution,setSolution]=useState<Sol|null>(null);
  const [solutionText,setSolutionText]=useState("");
  const [text,setText]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const loadSolution=useCallback(async()=>{
    const {data}=await supabase.from("room_solutions").select("id,room_id,solver_id,body,created_at,updated_at").eq("room_id",id).maybeSingle();
    setSolution((data as Sol|null)||null);
    if(data) setSolutionText(data.body||"");
  },[id]);

  const loadRoomState=useCallback(async()=>{
    const {data}=await supabase.from("rooms").select("id,post_id,problem_owner_id,solver_id,title,category,status,created_at,closed_at").eq("id",id).single();
    if(data) setRoom(data as Room);
    return data as Room|null;
  },[id]);

  const load=useCallback(async()=>{
    setError("");
    const {data:{user:u}}=await supabase.auth.getUser();
    if(!u){router.push(`/login?next=/room/${id}`);return;}
    setUser(u);

    const {data:r,error:re}=await supabase.from("rooms").select("id,post_id,problem_owner_id,solver_id,title,category,status,created_at,closed_at").eq("id",id).single();
    if(re||!r){setError(re?.message||"Solve Room not found.");setLoading(false);return;}
    if(u.id!==r.problem_owner_id&&u.id!==r.solver_id){setError("You are not a member of this private Solve Room.");setLoading(false);return;}

    setRoom(r as Room);

    const [memberResult,messageResult,solutionResult]=await Promise.all([
      supabase.from("room_members").select("user_id,role,profiles:user_id(display_name,avatar_url)").eq("room_id",id),
      supabase.from("messages").select("id,room_id,sender_id,body,created_at").eq("room_id",id).order("created_at",{ascending:true}),
      supabase.from("room_solutions").select("id,room_id,solver_id,body,created_at,updated_at").eq("room_id",id).maybeSingle()
    ]);

    setMembers((memberResult.data||[]) as unknown as Member[]);
    setMessages((messageResult.data||[]) as Msg[]);
    setSolution((solutionResult.data as Sol|null)||null);
    setSolutionText(solutionResult.data?.body||"");
    setLoading(false);
  },[id,router]);

  useEffect(()=>{load()},[load]);

  useEffect(()=>{
    let cancelled=false;
    const ch=supabase.channel(`room-live-${id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`room_id=eq.${id}`},p=>{
        const m=p.new as Msg;
        setMessages(x=>x.some(i=>i.id===m.id)?x:[...x,m]);
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"rooms",filter:`id=eq.${id}`},async p=>{
        if(cancelled)return;
        setRoom(p.new as Room);
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"room_solutions",filter:`room_id=eq.${id}`},p=>{
        const s=p.new as Sol;setSolution(s);setSolutionText(s.body||"");
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"room_solutions",filter:`room_id=eq.${id}`},p=>{
        const s=p.new as Sol;setSolution(s);setSolutionText(s.body||"");
      })
      .subscribe();
    return()=>{cancelled=true;supabase.removeChannel(ch)};
  },[id]);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[messages]);

  const name=(uid:string)=>{
    if(uid===user?.id){
      const own=members.find(m=>m.user_id===uid)?.profiles?.[0]?.display_name;
      return own||user?.user_metadata?.display_name||"ASKORAA User";
    }
    return members.find(m=>m.user_id===uid)?.profiles?.[0]?.display_name||"ASKORAA User";
  };
  const owner=!!user&&room?.problem_owner_id===user.id;
  const solver=!!user&&room?.solver_id===user.id;
  const active=room?.status==="ACTIVE";

  async function send(){
    const b=text.trim();
    if(!b||!user||busy||!active)return;
    setBusy(true);setError("");setText("");
    const optimistic:Msg={id:`local-${Date.now()}-${Math.random()}`,room_id:id,sender_id:user.id,body:b,created_at:new Date().toISOString()};
    setMessages(x=>[...x,optimistic]);
    const {data,error}=await supabase.from("messages").insert({room_id:id,sender_id:user.id,body:b}).select("id,room_id,sender_id,body,created_at").single();
    if(error){setMessages(x=>x.filter(m=>m.id!==optimistic.id));setText(b);setError(error.message)}
    else if(data){setMessages(x=>x.map(m=>m.id===optimistic.id?(data as Msg):m))}
    setBusy(false);
  }

  async function saveSolution(){
    if(!solver||!solutionText.trim())return;
    setBusy(true);setError("");
    const payload={room_id:id,solver_id:user.id,body:solutionText.trim(),updated_at:new Date().toISOString()};
    const {error}=solution?await supabase.from("room_solutions").update(payload).eq("id",solution.id):await supabase.from("room_solutions").insert(payload);
    if(error)setError(error.message);else await loadSolution();
    setBusy(false);
  }

  async function outcome(o:"YES"|"NO"){
    if(!owner||!room||!active)return;
    if(o==="YES"&&!solutionText.trim()){setError("Ask the solver to submit a final solution first.");return}
    setBusy(true);setError("");
    const {error}=await supabase.from("problem_outcomes").insert({room_id:id,decided_by:user.id,solver_id:room.solver_id,outcome:o,solution:solutionText.trim(),summary:o==="YES"?"Accepted by the problem owner.":"Owner marked the discussion unresolved."});
    if(error)setError(error.code==="23505"?"This room already has an outcome.":error.message);
    else if(o==="YES")router.push(`/rate/${id}`);
    else {await loadRoomState();}
    setBusy(false);
  }

  async function reopen(){
    if(!owner||!room||room.status!=="UNRESOLVED")return;
    setBusy(true);setError("");
    const {error}=await supabase.from("rooms").update({status:"ACTIVE",closed_at:null}).eq("id",id).eq("problem_owner_id",user.id);
    if(!error)await supabase.from("posts").update({status:"IN_PROGRESS"}).eq("id",room.post_id).eq("author_id",user.id);
    if(error)setError(error.message);else await loadRoomState();
    setBusy(false);
  }

  if(loading)return <main className="container"><div className="card loading-card">Opening your private Solve Room…</div></main>;
  if(error&&!room)return <main className="container"><div className="card error-card"><h2>Solve Room unavailable</h2><p>{error}</p><Link href="/home" className="btn">Back to Problems</Link></div></main>;
  if(!room||!user)return null;

  return <main className="container room-page"><div className="room-wrap">
    <div className="room-topbar"><Link href="/my" className="text-link">← My ASKORAA</Link><span className={`status-pill ${room.status.toLowerCase()}`}>{room.status}</span></div>
    <section className="room-header card"><div><span className="eyebrow">PRIVATE SOLVE ROOM</span><h1>{room.title}</h1><p className="muted">{room.category} • {owner?"You are the problem owner":"You are the solver"}</p></div><div className="room-people"><div><span className="small">PROBLEM OWNER</span><b>{name(room.problem_owner_id)}</b></div><div className="connector">↔</div><div><span className="small">SOLVER</span><b>{name(room.solver_id)}</b></div></div></section>
    {room.status!=="ACTIVE"&&<div className={`room-state ${room.status==="SOLVED"?"solved":"unresolved"}`}><b>{room.status==="SOLVED"?"✓ Problem solved":"↺ Problem unresolved"}</b><span>{room.status==="SOLVED"?"This room is preserved in the public archive.":owner?"You can reopen this conversation if you want to try again.":"The problem owner may reopen the conversation."}</span>{owner&&room.status==="UNRESOLVED"&&<button className="btn btn-sm" onClick={reopen} disabled={busy}>Reopen Solve Room</button>}</div>}
    <div className="room-grid"><section className="chat-panel card"><div className="chat-head"><div><b>Conversation</b><span>Private • only these two participants</span></div><span className="live-dot">● Live</span></div><div className="messages modern-messages">{messages.length===0?<div className="empty-chat"><div>💬</div><strong>Start the conversation</strong><p>Explain the problem, ask questions and work toward a useful answer.</p></div>:messages.map(m=><div key={m.id} className={`message-row ${m.sender_id===user.id?"mine":""}`}><div className="message-bubble"><div className="message-meta">{m.sender_id===user.id?"You":name(m.sender_id)} • {new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div><div>{m.body}</div></div></div>)}<div ref={endRef}/></div><div className="composer modern-composer"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder={active?"Write a message…":"This room is closed. Reopen it to continue."} rows={2} disabled={!active}/><button className="btn" onClick={send} disabled={busy||!text.trim()||!active}>Send</button></div></section><aside className="room-side"><section className="card participants"><div className="side-title"><b>Participants</b><span>2 people</span></div>{members.map(m=><div className="participant" key={m.user_id}><span className="avatar small-avatar hex-avatar">{m.profiles?.[0]?.avatar_url?<img src={m.profiles[0].avatar_url} alt=""/>:name(m.user_id).charAt(0).toUpperCase()}</span><div><b>{name(m.user_id)}</b><span>{m.role==="OWNER"?"Problem Owner":"Primary Solver"}{m.user_id===user.id?" • You":""}</span></div><i className="online-indicator"/></div>)}</section>{solver&&active&&<section className="card solution-card"><span className="eyebrow">FINAL SOLUTION</span><h3>Give the owner a clear answer</h3><textarea value={solutionText} onChange={e=>setSolutionText(e.target.value)} placeholder="Write the steps, explanation or recommendation that should be preserved…"/><button className="btn full" onClick={saveSolution} disabled={busy||solutionText.trim().length<3}>{busy?"Saving…":solution?"Update Final Solution":"Submit Final Solution"}</button></section>}{solution&&<section className="card accepted-preview"><span className="eyebrow">SOLVER&apos;S ANSWER</span><p>{solution.body}</p></section>}{owner&&active&&<section className="card decision-card"><span className="eyebrow">FINAL DECISION</span><h3>Did this solve your problem?</h3><p className="muted">YES closes the room and opens rating. NO preserves the discussion as unresolved and lets you reopen it later.</p><div className="decision-buttons"><button className="btn success-btn" onClick={()=>outcome("YES")} disabled={busy||!solutionText.trim()}>✓ YES, SOLVED</button><button className="btn danger" onClick={()=>outcome("NO")} disabled={busy}>↺ NO, NOT YET</button></div></section>}</aside></div>{error&&<div className="alert">{error}</div>}</div></main>;
}
