import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "ASKORAA — Ask. Help. Share Knowledge.",
  description: "A simple human problem-solving network."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="nav">
        <Link href="/" className="logo">ASKORAA</Link>
        <div className="navlinks">
          <Link href="/home">Home</Link>
          <Link href="/create">Ask</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/login" className="btn secondary">Login</Link>
        </div>
      </nav>
      {children}
      <footer className="footer">ASKORAA • Ask. Help. Share Knowledge.</footer>
    </>
  );
}
