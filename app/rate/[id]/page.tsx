"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";
export default function Rate(){
  const {id}=useParams<{id:string}>(); const router=useRouter();
  const [room,setRoom]=useState<any>(null); const [rating,setRating]=useState(5); const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false);
  useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){router.push("/login");return;}const {data,error}=await supabase.from("rooms").select("id,problem_owner_id,solver_id,category,status").eq("id",id).single();if(error){setMsg(error.message);return;}if(user.id!==data.problem_owner_id){setMsg("Only the problem owner can rate the solver.");return;}setRoom(data);})()},[id,router]);
  async function submit(){const {data:{user}}=await supabase.auth.getUser();if(!user||!room||user.id!==room.problem_owner_id)return;setBusy(true);setMsg("");const {error}=await supabase.from("ratings").insert({room_id:id,rater_id:user.id,rated_id:room.solver_id,field:room.category,rating});if(error){setMsg(error.code==="23505"?"You already rated this interaction.":error.message);setBusy(false);return;}setMsg("Thank you. Rating saved.");setTimeout(()=>router.push("/archive"),600);}
  return <main className="container"><div className="form card"><span className="eyebrow">FINAL STEP</span><h1>Rate the help</h1><p className="muted">Your rating helps future users understand the quality of help in this field.</p>{msg&&<div className="success">{msg}</div>}{room&&<><label>Category</label><div className="badge">{room.category}</div><label>How helpful was the solver?</label><select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select><button className="btn full" onClick={submit} disabled={busy}>{busy?"Saving…":"Submit Rating"}</button></>}</div></main>;
}
