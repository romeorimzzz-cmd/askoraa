 "use client";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [msg,setMsg]=useState("");

  async function submit(e:FormEvent){
    e.preventDefault(); setMsg("");
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setMsg(error.message);return;}
    router.push("/home");
  }
  return <main className="container"><div className="form card">
    <h1>Login</h1><p className="muted">Welcome back to ASKORAA.</p>
    {msg && <div className="alert">{msg}</div>}
    <form onSubmit={submit}>
      <label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required/>
      <label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" required/>
      <button className="btn" style={{marginTop:18}}>Login</button>
    </form>
    <p className="small">New here? <Link href="/register">Create an account</Link></p>
  </div></main>;
}
