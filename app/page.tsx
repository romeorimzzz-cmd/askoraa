import Link from "next/link";

export default function Landing() {
  return (
    <main>
      <section className="hero container">
        <h1>ASKORAA</h1>
        <p>Ask a real problem. Find a person who can help. Solve it together.</p>
        <div className="row" style={{justifyContent:"center"}}>
          <Link href="/register" className="btn">Join ASKORAA</Link>
          <Link href="/home" className="btn secondary">Explore</Link>
        </div>
      </section>
      <section className="container grid">
        <div className="card"><h3>ASK</h3><p className="muted">Post a real problem and let relevant people offer help.</p></div>
        <div className="card"><h3>HELP</h3><p className="muted">Use what you know to help another person.</p></div>
        <div className="card"><h3>SOLVE</h3><p className="muted">Move into a private two-person live chat and solve it.</p></div>
      </section>
      <section className="container" style={{paddingTop:40}}>
        <div className="card">
          <h3>V1 is intentionally simple.</h3>
          <p className="muted">Profile + Login → ASK/HELP → I CAN HELP → 1 solver → live text Solve Room → YES/NO → simple field rating.</p>
        </div>
      </section>
    </main>
  );
}
