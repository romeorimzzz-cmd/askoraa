"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const fields = ["Business", "Technology", "Education", "Career", "Marketing", "Design", "Gaming", "Electronics", "Other"];

export default function Create() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(fields[0]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (cleanTitle.length < 3 || cleanBody.length < 3) {
      setMsg("Please describe the problem clearly.");
      return;
    }

    setBusy(true);
    setMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      title: cleanTitle,
      body: cleanBody,
      kind: "ASK",
      category,
      status: "OPEN",
    });

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    router.push("/home");
  }

  return (
    <main className="container">
      <div className="form card create-card">
        <span className="eyebrow">ASKORAA • ASK</span>
        <h1>My problem is…</h1>
        <p className="muted">Explain what you are trying to solve. People who genuinely know how to help can offer to join you in a private Solve Room.</p>
        {msg && <div className="alert">{msg}</div>}
        <form onSubmit={submit}>
          <label>What are you trying to solve?</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Example: How can I increase my shop sales?" required />
          <label>Tell us what&apos;s happening</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} placeholder="Give enough context for another person to understand the problem…" required />
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>{fields.map((field) => <option key={field}>{field}</option>)}</select>
          <div className="terms-note">By publishing, you agree to keep the discussion respectful and not post passwords, OTPs, financial PINs, private documents or other sensitive information.</div>
          <button className="btn full" disabled={busy}>{busy ? "Publishing…" : "Publish My Problem"}</button>
        </form>
      </div>
    </main>
  );
}
