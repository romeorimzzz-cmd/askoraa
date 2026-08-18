"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Msg={id:string;room_id:string;sender_id:string;body:string;created_at:string};
type Room={id:string;post_id:string;problem_owner_id:string;solver_id:string;title:string;category:string;status:string;created_at:string;closed_at:string|null};
type Member={user_id:string;role:"OWNER"|"SOLVER";profiles?:{display_name:string|null}[]|null};
type Solution={id:string;room_id:string;solver_id:string;body:string;created_at:string;updated_at:string};

export default function Room(){
  const {id}=useParams<{id:string}>();const router=useRouter();const endRef=useRef<HTMLDivElement>(null);
  const [user,setUser]=useState<any>(null);const [room,setRoom]=useState<Room|null>(null);const [members,setMembers]=useState<Member[]>([]);const [messages,setMessages]=useState<Msg[]>([]);const [solution,setSolution]=useState<Solution|null>(null);const [solutionText,setSolutionText]=useState("");const [text,setText]=useState("");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState("");

  async function load(){
    const {data:{user:currentUser}}=await supabase.auth.getUser();
    if(!currentUser){router.push("/login");return;}setUser(currentUser);
    const {data:r,error:re}=await supabase.from("rooms").select("id,post_id,problem_owner_id,solver_id,title,category,status,created_at,closed_at").eq("id",id).single();
    if(re||!r){setError(re?.message||"Solve Room not found.");setLoading(false);return;}setRoom(r as Room);
    if(currentUser.id!==r.problem_owner_id&&currentUser.id!==r.solver_id){setError("You are not a member of this private Solve Room.");setLoading(false);return;}
    const {data:m,error:me}=await supabase.from("room_members").select("user_id,role,profiles:user_id(display_name)").eq("room_id",id);if(me)setError(me.message);else setMembers((m||[]) as unknown as Member[]);
    const {data:messagesData,error:msgError}=await supabase.from("messages").select("id,room_id,sender_id,body,created_at").eq("room_id",id).order("created_at",{ascending:true});if(msgError)setError(msgError.message);else setMessages((messagesData||[]) as Msg[]);
    const {data:solutionData}=await supabase.from("room_solutions").select("id,room_id,solver_id,body,created_at,updated_at").eq("room_id",id).maybeSingle();if(solutionData){setSolution(solutionData as Solution);setSolutionText(solutionData.body);}
    setLoading(false);
  }
  useEffect(()=>{load();},[id]);
  useEffect(()=>{if(!user)return;const ch=supabase.channel(`room-${id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`room_id=eq.${id}`},p=>{const m=p.new as Msg;setMessages(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m]);}).on("postgres_changes",{event:"*",schema:"public",table:"room_solutions",filter:`room_id=eq.${id}`},()=>load()).on("postgres_changes",{event:"*",schema:"public",table:"rooms",filter:`id=eq.${id}`},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[id,user]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[messages]);

  async function send(){const body=text.trim();if(!body||!user||busy||room?.status!=="ACTIVE")return;setBusy(true);setError("");const {error}=await supabase.from("messages").insert({room_id:id,sender_id:user.id,body});if(error)setError(error.message);else setText("");setBusy(false);}
  async function submitSolution(){if(!user||!room||user.id!==room.solver_id||!solutionText.trim())return;setBusy(true);setError("");const payload={room_id:id,solver_id:user.id,body:solutionText.trim(),updated_at:new Date().toISOString()};const {error}=solution?await supabase.from("room_solutions").update(payload).eq("id",solution.id):await supabase.from("room_solutions").insert(payload);if(error)setError(error.message);else await load();setBusy(false);}
  async function finish(outcome:"YES"|"NO"){
    if(!user||!room||user.id!==room.problem_owner_id||room.status!=="ACTIVE")return;
    if(outcome==="YES"&&!solutionText.trim()){setError("The solver must submit a final solution before you accept it.");return;}
    setBusy(true);setError("");
    const {error}=await supabase.from("problem_outcomes").insert({room_id:id,decided_by:user.id,solver_id:room.solver_id,outcome,solution:solutionText.trim(),summary:outcome==="YES"?"Accepted by the problem owner.":"The owner marked this discussion unresolved."});
    if(error){setError(error.code==="23505"?"This room already has a final outcome.":error.message);setBusy(false);return;}
    if(outcome==="YES")router.push(`/rate/${id}`);else router.push("/archive");
    setBusy(false);
  }

  if(loading)return <main className="container"><div className="card loading-card">Opening private Solve Room…</div></main>;
  if(error&&!room)return <main className="container"><div className="card error-card"><h2>Solve Room unavailable</h2><p>{error}</p><Link href="/home" className="btn">Back to Problems</Link></div></main>;
  if(!room||!user)return null;
  const owner=user.id===room.problem_owner_id;const solver=user.id===room.solver_id;const name=(uid:string)=>members.find(m=>m.user_id===uid)?.profiles?.[0]?.display_name||"ASKORAA User";

  return <main className="container room-page"><div className="room-wrap">
    <div className="room-topbar"><Link href="/my" className="small muted">← My ASKORAA</Link><span className={`status-pill ${room.status.toLowerCase()}`}>{room.status}</span></div>
    <section className="room-header card"><div><span className="eyebrow">PRIVATE SOLVE ROOM</span><h1>{room.title}</h1><p className="muted">{room.category} • Started {new Date(room.created_at).toLocaleString()}</p></div><div className="room-role"><span className="avatar">{(owner?name(room.solver_id):name(room.problem_owner_id)).charAt(0).toUpperCase()}</span><div><strong>{owner?name(room.solver_id):name(room.problem_owner_id)}</strong><span>{owner?"Primary Solver":"Problem Owner"}</span></div></div></section>
    <div className="room-grid"><section className="chat-panel card"><div className="chat-head"><div><strong>Conversation</strong><span>Private • only the owner and solver</span></div><span className="live-dot">● Live</span></div><div className="messages modern-messages">{messages.length===0?<div className="empty-chat"><div>💬</div><strong>Start the conversation</strong><p>Explain the problem, ask questions and work toward a useful solution.</p></div>:messages.map(m=><div key={m.id} className={`message-row ${m.sender_id===user.id?"mine":""}`}><div className="message-bubble"><div className="message-meta">{m.sender_id===user.id?"You":name(m.sender_id)} • {new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div><div>{m.body}</div></div></div>)}<div ref={endRef}/></div><div className="composer modern-composer"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Write a message…" rows={2} disabled={room.status!=="ACTIVE"}/><button className="btn" onClick={send} disabled={busy||!text.trim()||room.status!=="ACTIVE"}>Send</button></div></section>
      <aside className="room-side"><section className="card participants"><div className="side-title"><strong>Participants</strong><span>2 / 2</span></div>{members.map(m=><div className="participant" key={m.user_id}><span className="avatar small-avatar">{(name(m.user_id)).charAt(0).toUpperCase()}</span><div><strong>{name(m.user_id)}</strong><span>{m.role==="OWNER"?"Problem Owner":"Primary Solver"}{m.user_id===user.id?" • You":""}</span></div><i className="online-indicator"/></div>)}</section>
        {solver&&room.status==="ACTIVE"&&<section className="card solution-card"><span className="eyebrow">FINAL SOLUTION</span><h3>Give the owner a clear answer</h3><textarea value={solutionText} onChange={e=>setSolutionText(e.target.value)} placeholder="Write the final solution, steps or recommendation…"/><button className="btn full" onClick={submitSolution} disabled={busy||solutionText.trim().length<3}>{busy?"Saving…":solution?"Update Final Solution":"Submit Final Solution"}</button></section>}
        {solution&&<section className="card accepted-preview"><span className="eyebrow">SOLVER&apos;S FINAL ANSWER</span><p>{solution.body}</p></section>}
        {owner&&room.status==="ACTIVE"&&<section className="card decision-card"><span className="eyebrow">YOUR DECISION</span><h3>Did this solve your problem?</h3><p className="muted">YES closes the room as solved and sends you to rating. NO keeps the discussion as unresolved and preserves it in the archive.</p><div className="decision-buttons"><button className="btn success-btn" onClick={()=>finish("YES")} disabled={busy||!solutionText.trim()}>YES, SOLVED</button><button className="btn danger" onClick={()=>finish("NO")} disabled={busy}>NO, NOT YET</button></div></section>}
      </aside>
    </div>
    {error&&<div className="alert">{error}</div>}
  </div></main>;
}
