import "./globals.css";
import Link from "next/link";
import AuthNav from "../components/AuthNav";

export const metadata = {
  title: "ASKORAA — Ask. Help. Share Knowledge.",
  description: "A simple human problem-solving network."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="nav">
        <Link href="/" className="logo">
          ASKORAA
        </Link>

        <AuthNav />
      </nav>

      {children}

      <footer className="footer">
        <div>ASKORAA • Ask. Help. Share Knowledge.</div>
        <div className="small" style={{ marginTop: 8 }}>
          <Link href="/about">About</Link>
          {" • "}
          <Link href="/support">Support</Link>
        </div>
      </footer>
    </>
  );
}