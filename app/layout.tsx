import "./globals.css";
import Link from "next/link";
import NotificationsBell from "../components/NotificationsBell";

export const metadata = {
  title: "ASKORAA — Ask. Help. Solve.",
  description: "A human problem-solving network where useful help becomes trusted knowledge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <nav className="nav-inner">
          <Link href="/home" className="brand">
            <span className="brand-mark">A</span>
            <span><strong>ASKORAA</strong><small>ASK • HELP • SOLVE</small></span>
          </Link>
          <div className="navlinks">
            <Link href="/home">Problems</Link>
            <Link href="/create">Post a Problem</Link>
            <Link href="/archive">Archive</Link>
            <Link href="/my">My ASKORAA</Link>
            <NotificationsBell />
            <Link href="/profile" className="profile-link">Profile</Link>
          </div>
        </nav>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div><strong>ASKORAA</strong><p>Real problems. Real people. Useful solutions.</p></div>
          <div className="footer-links">
            <Link href="/archive">Solved Archive</Link>
            <Link href="/create">Post a Problem</Link>
            <Link href="/home">Solve Problems</Link>
          </div>
        </div>
        <div className="safety-strip">
          <strong>Safety:</strong> Never share passwords, OTPs, bank PINs, card details or sensitive documents. Report suspicious requests and stop the conversation if something feels unsafe.
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} ASKORAA • Community safety and respectful problem solving first.</div>
      </footer>
    </>
  );
}
