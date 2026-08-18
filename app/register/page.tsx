"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register(){
  const router=useRouter();
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [terms,setTerms]=useState(false);const [msg,setMsg]=useState("");const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){
    e.preventDefault();setMsg("");
    if(!terms){setMsg("Please accept the Terms and Community Safety rules first.");return;}
    setBusy(true);
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name,terms_accepted:true,terms_accepted_at:new Date().toISOString()}}});
    if(error){setMsg(error.message);setBusy(false);return;}
    if(data.session)router.push("/home");else setMsg("Account created. Check your email if confirmation is enabled, then login.");
    setBusy(false);
  }
  return <main className="container"><div className="form card auth-card"><span className="eyebrow">JOIN ASKORAA</span><h1>Create your account</h1><p className="muted">Ask real questions. Offer real help. Build trust through useful outcomes.</p>{msg&&<div className="alert">{msg}</div>}<form onSubmit={submit}>
    <label>Name</label><input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required placeholder="Your display name"/>
    <label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required/>
    <label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={6} required/>
    <label className="check-row"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/><span>I accept the ASKORAA Terms, Community Rules and Safety Policy. I understand that I must not share OTPs, passwords, banking PINs or other sensitive credentials.</span></label>
    <button className="btn full" disabled={busy||!terms}>{busy?"Creating…":"Create account"}</button>
  </form><p className="small">Already registered? <Link href="/login">Login</Link></p></div></main>;
}
