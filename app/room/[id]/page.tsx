 "use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

type Msg={id:string;room_id:string;sender_id:string;body:string;created_at:string};

export default function Room(){
  const {id}=useParams<{id:string}>(); const router=useRouter();
  const [user,setUser]=useState<any>(null); const [room,setRoom]=useState<any>(null); const [messages,setMessages]=useState<Msg[]>([]);
  const [text,setText]=useState(""); const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false); const endRef=useRef<HTMLDivElement>(null);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.push("/login");return} setUser(user);
    const {data:member}=await supabase.from("room_members").select("role").eq("room_id",id).eq("user_id",user.id).single();
    if(!member){setMsg("You are not a member of this room.");return}
    const {data:r,error}=await supabase.from("rooms").select("*,room_members(user_id,role,profiles:user_id(display_name))").eq("id",id).single();
    if(error){setMsg(error.message);return} setRoom(r);
    const {data:m,error:me}=await supabase.from("messages").select("*").eq("room_id",id).order("created_at",{ascending:true});
    if(me)setMsg(me.message); else setMessages(m||[]);
  }

  useEffect(()=>{load()},[id]);
  useEffect(()=>{
    if(!user)return;
    const ch=supabase.channel("room-"+id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"room_id=eq."+id},payload=>{
        const m=payload.new as Msg; setMessages(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m]);
      }).subscribe();
    return()=>{supabase.removeChannel(ch)}
  },[id,user]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[messages]);

  async function send(){
    if(!text.trim()||!user||busy)return;
    setBusy(true);
    const body=text.trim();setText("");
    const {error}=await supabase.from("messages").insert({room_id:id,sender_id:user.id,body});
    if(error)setMsg(error.message);
    setBusy(false);
  }
  async function finish(outcome:"YES"|"NO"){
    if(!user||!room)return;
    const {error}=await supabase.from("problem_outcomes").insert({room_id:id,decided_by:user.id,outcome});
    if(error){setMsg(error.code==="23505"?"Outcome already submitted.":error.message);return}
    await supabase.from("rooms").update({status:outcome==="YES"?"SOLVED":"UNRESOLVED",closed_at:new Date().toISOString()}).eq("id",id);
    router.push("/rate/"+id);
  }
  if(msg&&!room)return <main className="container"><div className="alert">{msg}</div></main>;
  return <main className="container"><div className="card chat">
    <div className="spread"><div><h2>{room?.title||"Solve Room"}</h2><span className="badge">PRIVATE • {room?.status}</span></div>
      {room?.problem_owner_id===user?.id && <div className="row"><button className="btn" onClick={()=>finish("YES")}>YES</button><button className="btn danger" onClick={()=>finish("NO")}>NO</button></div>}
    </div>
    {msg&&<div className="alert">{msg}</div>}
    <div className="messages">{messages.map(m=><div key={m.id} className={"msg "+(m.sender_id===user?.id?"mine":"")}><div className="meta">{m.sender_id===user?.id?"You":"Solver / Owner"} • {new Date(m.created_at).toLocaleTimeString()}</div>{m.body}</div>)}<div ref={endRef}/></div>
    <div className="composer"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Write a message…" /><button className="btn" onClick={send} disabled={busy}>Send</button></div>
  </div></main>
}
