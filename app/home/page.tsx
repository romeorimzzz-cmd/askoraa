 "use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Post={id:string;title:string;body:string;kind:"ASK"|"HELP";category:string;created_at:string;author_id:string;profiles?:{display_name:string|null}};

export default function Home(){
  const [posts,setPosts]=useState<Post[]>([]);
  const [loading,setLoading]=useState(true);
  const [user,setUser]=useState<any>(null);
  const [msg,setMsg]=useState("");

  async function load(){
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser(); setUser(user);
    const {data,error}=await supabase.from("posts").select("id,title,body,kind,category,created_at,author_id,profiles:author_id(display_name)").eq("status","OPEN").order("created_at",{ascending:false}).limit(50);
    if(error)setMsg(error.message); else setPosts((data||[]) as any);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);
  async function help(postId:string){
    if(!user){window.location.href="/login";return}
    const {error}=await supabase.from("post_applications").insert({post_id:postId,applicant_id:user.id});
    if(error)setMsg(error.code==="23505"?"You already offered help.":error.message);
    else setMsg("I CAN HELP sent to the problem owner.");
  }
  if(loading)return <main className="container"><p>Loading…</p></main>;
  return <main className="container">
    <div className="spread"><div><h1>Latest problems</h1><p className="muted">Find something you can genuinely help with.</p></div><Link href="/create" className="btn">+ Ask / Help</Link></div>
    {msg&&<div className="success">{msg}</div>}
    {!user&&<div className="card" style={{margin:"18px 0"}}><b>Login to offer help.</b> <Link href="/login">Login</Link></div>}
    {posts.length===0?<div className="card"><p>No open posts yet. Be the first.</p></div>:
      posts.map(p=><article className="card post" key={p.id}>
        <div className="spread"><span className="badge">{p.kind} • {p.category}</span><span className="small muted">{new Date(p.created_at).toLocaleString()}</span></div>
        <div className="post-title" style={{marginTop:10}}>{p.title}</div>
        <p className="muted">{p.body.length>240?p.body.slice(0,240)+"…":p.body}</p>
        <div className="row"><span className="small">By {(p.profiles as any)?.display_name || "ASKORAA user"}</span><button className="btn" onClick={()=>help(p.id)}>I CAN HELP</button></div>
      </article>)
    }
  </main>
}
