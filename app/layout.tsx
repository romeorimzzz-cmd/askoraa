import "./globals.css";
import Link from "next/link";
import AuthNav from "../components/AuthNav";

export const metadata = {
  title: "ASKORAA — Ask. Help. Solve.",
  description: "A public human problem-solving network where useful help becomes trusted knowledge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>
    <header className="site-header">
      <nav className="nav-inner">
        <Link href="/home" className="brand">
          <span className="brand-mark">A</span>
          <span className="brand-copy"><strong>ASKORAA</strong><small>ASK • HELP • SOLVE</small></span>
        </Link>
        <AuthNav />
      </nav>
    </header>
    <main className="site-main">{children}</main>
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand"><div className="footer-logo"><span className="brand-mark small-mark">A</span><strong>ASKORAA</strong></div><p>Real problems. Real people. Useful solutions.</p></div>
        <div className="footer-links"><Link href="/archive">Solved Archive</Link><Link href="/safety">Safety & Rules</Link><Link href="/support">Support</Link><Link href="/terms">Terms</Link><Link href="/report">Report</Link></div>
      </div>
      <div className="safety-strip"><strong>Stay safe:</strong> Never share OTPs, passwords, UPI PINs, card details, remote-access codes or sensitive documents. ASKORAA is for problem solving, not financial transfers.</div>
      <div className="footer-bottom">© {new Date().getFullYear()} ASKORAA • Ask. Help. Solve.</div>
    </footer>
  </>;
}
