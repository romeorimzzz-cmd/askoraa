 "use client";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const fields=["Business","Technology","Education","Career","Marketing","Design","Gaming","Electronics","Other"];

export default function Create(){
  const router=useRouter(); const [kind,setKind]=useState<"ASK"|"HELP">("ASK");
  const [title,setTitle]=useState(""); const [body,setBody]=useState(""); const [category,setCategory]=useState(fields[0]);
  const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false);
  useEffect(()=>{supabase.auth.getUser().then(({data})=>{if(!data.user)router.push("/login")})},[router]);
  async function submit(e:FormEvent){
    e.preventDefault(); setBusy(true);setMsg("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.push("/login");return}
    const {error}=await supabase.from("posts").insert({author_id:user.id,title:title.trim(),body:body.trim(),kind,category,status:"OPEN"}).select("id").single();
    if(error){setMsg(error.message);setBusy(false);return}
    router.push("/home");
  }
  return <main className="container"><div className="form card">
    <h1>Create</h1>
    <div className="tabs">{(["ASK","HELP"] as const).map(k=><button type="button" key={k} className={"tab "+(kind===k?"active":"")} onClick={()=>setKind(k)}>{k}</button>)}</div>
    {msg&&<div className="alert">{msg}</div>}
    <form onSubmit={submit}>
      <label>Title</label><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={140} required/>
      <label>Details</label><textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={5000} required/>
      <label>Category</label><select value={category} onChange={e=>setCategory(e.target.value)}>{fields.map(f=><option key={f}>{f}</option>)}</select>
      <button className="btn" disabled={busy} style={{marginTop:18}}>{busy?"Publishing…":"Publish"}</button>
    </form>
  </div></main>
}
