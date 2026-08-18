 "use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function My(){
 const [rooms,setRooms]=useState<any[]>([]); const [posts,setPosts]=useState<any[]>([]);
 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser(); if(!user){location.href="/login";return}
  const {data:r}=await supabase.from("rooms").select("id,title,status,created_at").or(`problem_owner_id.eq.${user.id},solver_id.eq.${user.id}`).order("created_at",{ascending:false});
  const {data:p}=await supabase.from("posts").select("id,title,status,kind,category,created_at").eq("author_id",user.id).order("created_at",{ascending:false});
  setRooms(r||[]);setPosts(p||[]);
 })()},[]);
 return <main className="container"><h1>My ASKORAA</h1>
  <div className="grid2">
   <div className="card"><h3>My posts</h3>{posts.map(p=><p key={p.id}><Link href={"/post/"+p.id}>{p.title}</Link><br/><span className="small muted">{p.kind} • {p.status}</span></p>)}</div>
   <div className="card"><h3>My Solve Rooms</h3>{rooms.map(r=><p key={r.id}><Link href={"/room/"+r.id}>{r.title}</Link><br/><span className="small muted">{r.status}</span></p>)}</div>
  </div>
 </main>
}
