 "use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Profile(){
  const [p,setP]=useState<any>(null); const [fields,setFields]=useState<any[]>([]); const [msg,setMsg]=useState("");
  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){location.href="/login";return}
    const {data,error}=await supabase.from("profiles").select("*").eq("id",user.id).single();
    if(error){setMsg(error.message);return}
    setP(data);
    const {data:uf}=await supabase.from("user_fields").select("field_name").eq("user_id",user.id);
    setFields(uf||[]);
  })()},[]);
  async function save(){
    const {error}=await supabase.from("profiles").update({display_name:p.display_name,bio:p.bio}).eq("id",p.id);
    setMsg(error?error.message:"Profile saved.");
  }
  if(!p)return <main className="container"><p>{msg||"Loading…"}</p></main>
  return <main className="container"><div className="form card">
    <h1>Profile</h1>
    {msg&&<div className="success">{msg}</div>}
    <label>Name</label><input value={p.display_name||""} onChange={e=>setP({...p,display_name:e.target.value})}/>
    <label>Bio</label><textarea value={p.bio||""} onChange={e=>setP({...p,bio:e.target.value})}/>
    <label>Fields</label><div className="row">{fields.map((f,i)=><span className="badge" key={i}>{f.field_name}</span>)}</div>
    <button className="btn" style={{marginTop:18}} onClick={save}>Save profile</button>
    <button className="btn ghost" style={{marginTop:10}} onClick={async()=>{await supabase.auth.signOut();location.href="/"}}>Logout</button>
  </div></main>
}
