 "use client";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const router=useRouter();
  const [name,setName]=useState(""); const [email,setEmail]=useState("");
  const [password,setPassword]=useState(""); const [msg,setMsg]=useState("");
  async function submit(e:FormEvent){
    e.preventDefault(); setMsg("");
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
    if(error){setMsg(error.message);return;}
    if(data.session) router.push("/home");
    else setMsg("Account created. Check your email if confirmation is enabled, then login.");
  }
  return <main className="container"><div className="form card">
    <h1>Create account</h1><p className="muted">Start with the simple ASKORAA loop.</p>
    {msg && <div className="success">{msg}</div>}
    <form onSubmit={submit}>
      <label>Name</label><input value={name} onChange={e=>setName(e.target.value)} required/>
      <label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required/>
      <label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={6} required/>
      <button className="btn" style={{marginTop:18}}>Create account</button>
    </form>
    <p className="small">Already registered? <Link href="/login">Login</Link></p>
  </div></main>;
}
