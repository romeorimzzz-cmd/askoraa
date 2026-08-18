 "use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function PostDetail(){
  const {id}=useParams<{id:string}>(); const router=useRouter();
  const [post,setPost]=useState<any>(null); const [apps,setApps]=useState<any[]>([]); const [user,setUser]=useState<any>(null); const [msg,setMsg]=useState("");
  async function load(){
    const {data:{user}}=await supabase.auth.getUser(); setUser(user);
    const {data,error}=await supabase.from("posts").select("*,profiles:author_id(display_name)").eq("id",id).single();
    if(error){setMsg(error.message);return} setPost(data);
    const {data:a,error:ae}=await supabase.from("post_applications").select("id,applicant_id,profiles:applicant_id(display_name)").eq("post_id",id).order("created_at");
    if(ae)setMsg(ae.message); else setApps(a||[]);
  }
  useEffect(()=>{load()},[id]);
  async function selectSolver(applicantId:string){
    if(!user||user.id!==post.author_id){setMsg("Only the problem owner can select a solver.");return}
    const {data:room,error}=await supabase.from("rooms").insert({post_id:id,problem_owner_id:user.id,solver_id:applicantId,title:post.title,category:post.category,status:"ACTIVE"}).select("id").single();
    if(error){setMsg(error.message);return}
    const {error:re}=await supabase.from("room_members").insert([
      {room_id:room.id,user_id:user.id,role:"OWNER"},
      {room_id:room.id,user_id:applicantId,role:"SOLVER"}
    ]);
    if(re){setMsg(re.message);return}
    await supabase.from("posts").update({status:"IN_PROGRESS"}).eq("id",id);
    router.push("/room/"+room.id);
  }
  if(!post)return <main className="container"><p>{msg||"Loading…"}</p></main>;
  return <main className="container"><article className="card">
    <div className="spread"><span className="badge">{post.kind} • {post.category}</span><span className="small muted">{new Date(post.created_at).toLocaleString()}</span></div>
    <h1>{post.title}</h1><p>{post.body}</p><p className="small muted">By {post.profiles?.display_name||"User"}</p>
    <h3>People who can help</h3>
    {apps.length===0?<p className="muted">No one has offered help yet.</p>:apps.map(a=><div className="card" key={a.id} style={{margin:"10px 0"}}>
      <div className="spread"><div><b>{a.profiles?.display_name||"ASKORAA user"}</b><div className="small muted">Offered to help</div></div>
      {user?.id===post.author_id&&post.status==="OPEN"&&<button className="btn" onClick={()=>selectSolver(a.applicant_id)}>Select solver</button>}</div>
    </div>)}
  </article></main>
}
