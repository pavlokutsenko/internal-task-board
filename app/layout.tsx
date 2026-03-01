import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internal Task Board",
  description: "Minimal internal board with JWT auth",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
