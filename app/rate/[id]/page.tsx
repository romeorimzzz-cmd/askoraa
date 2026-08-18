 "use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function Rate(){
  const {id}=useParams<{id:string}>(); const router=useRouter();
  const [room,setRoom]=useState<any>(null); const [rating,setRating]=useState(5); const [msg,setMsg]=useState("");
  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser(); if(!user){router.push("/login");return}
    const {data,error}=await supabase.from("rooms").select("id,problem_owner_id,solver_id,category").eq("id",id).single();
    if(error){setMsg(error.message);return} setRoom(data);
  })()},[id]);
  async function submit(){
    const {data:{user}}=await supabase.auth.getUser(); if(!user||!room)return;
    const {error}=await supabase.from("ratings").insert({room_id:id,rater_id:user.id,rated_id:room.solver_id,field:room.category,rating});
    if(error){setMsg(error.code==="23505"?"You already rated this interaction.":error.message);return}
    setMsg("Thank you. Rating saved."); setTimeout(()=>router.push("/home"),700);
  }
  return <main className="container"><div className="form card"><h1>Rate the help</h1><p className="muted">Field: {room?.category||"Loading…"}</p>
    {msg&&<div className="success">{msg}</div>}
    <label>How helpful was the solver?</label><select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select>
    <button className="btn" style={{marginTop:18}} onClick={submit}>Submit rating</button>
  </div></main>
}
