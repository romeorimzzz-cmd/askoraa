import "./globals.css";
import Link from "next/link";
import AuthNav from "../components/AuthNav";

export const metadata = {
  title: "ASKORAA — Ask. Help. Solve.",
  description:
    "ASKORAA connects people who need help with people who can help."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">A</span>

            <span className="brand-text">
              <strong>ASKORAA</strong>
              <small>Ask • Help • Solve</small>
            </span>
          </Link>

          <AuthNav />
        </div>
      </header>

      <main className="site-main">
        {children}
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="brand-mark small-mark">A</span>
              <strong>ASKORAA</strong>
            </div>

            <p>
              Real people. Real problems. Useful help.
            </p>
          </div>

          <div className="footer-links">
            <Link href="/about">About</Link>
            <Link href="/support">Support</Link>
            <Link href="/report">Report a Problem</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} ASKORAA
          </span>

          <span>
            Ask. Help. Solve.
          </span>
        </div>
      </footer>
    </>
  );
}