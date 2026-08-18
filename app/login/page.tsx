"use client";

import { FormEvent, Suspense, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }

    const next = params.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/home";

    router.push(safeNext);
  }

  return (
    <div className="auth-shell">
      <div className="auth-pitch">
        <span className="eyebrow">WELCOME BACK</span>
        <h1>Come back to the useful side of the internet.</h1>
        <p>
          Open a problem, find a person who can help, and keep the useful answer.
        </p>
        <div className="auth-mini">
          <span>01 Ask</span>
          <span>02 Connect</span>
          <span>03 Solve</span>
        </div>
      </div>

      <div className="form card auth-card">
        <h2>Login</h2>
        <p className="muted">
          Sign in to ask problems, help others and enter private Solve Rooms.
        </p>

        {msg && <div className="alert">{msg}</div>}

        <form onSubmit={submit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />

          <button className="btn btn-large full" disabled={busy}>
            {busy ? "Signing in…" : "Login"}
          </button>
        </form>

        <p className="small">
          New to ASKORAA? <Link href="/register">Create a free account</Link>
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <main className="container auth-page">
      <Suspense
        fallback={
          <div className="auth-shell">
            <div className="form card auth-card auth-loading">
              <div className="eyebrow">ASKORAA</div>
              <h2>Loading login…</h2>
              <p className="muted">Preparing your secure sign-in.</p>
            </div>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
