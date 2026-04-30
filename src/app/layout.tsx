import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentMatch | WE+ Hackathon",
  description: "AI-Powered Recruitment Matching Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
